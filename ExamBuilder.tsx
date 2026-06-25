import React, { useState, useEffect } from 'react';
import { Question, QuestionType, Exam } from '../types';
import { Plus, Trash2, ArrowLeft, Check, Edit2, AlertCircle, FileText, Sparkles, CheckSquare, HelpCircle } from 'lucide-react';

interface ExamBuilderProps {
  token: string;
  examId: string;
  onBack: () => void;
}

export default function ExamBuilder({ token, examId, onBack }: ExamBuilderProps) {
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual Question Builder State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null);
  const [type, setType] = useState<QuestionType>('MCQ');
  const [text, setText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [marks, setMarks] = useState<number>(5);

  // Bulk Import state
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [parserNotice, setParserNotice] = useState<string | null>(null);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      // Fetch exam details
      const examRes = await fetch('/api/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const examData = await examRes.json();
      const currentExam = (examData.exams || []).find((e: Exam) => e.id === examId);
      setExam(currentExam || null);

      // Fetch questions
      const qRes = await fetch(`/api/exams/${examId}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const qData = await qRes.json();
      setQuestions(qData.questions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamDetails();
  }, [token, examId]);

  // Total marks computed dynamically
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  const handleOpenAdd = () => {
    setEditQuestionId(null);
    setType('MCQ');
    setText('');
    setOptions(['A. Option 1', 'B. Option 2', 'C. Option 3', 'D. Option 4']);
    setCorrectAnswer('A');
    setMarks(5);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditQuestionId(q.id);
    setType(q.type);
    setText(q.text);
    setOptions(q.options);
    setCorrectAnswer(q.correctAnswer);
    setMarks(q.marks);
    setIsEditorOpen(true);
  };

  const handleTypeChange = (newType: QuestionType) => {
    setType(newType);
    if (newType === 'TRUE_FALSE') {
      setOptions(['True', 'False']);
      setCorrectAnswer('True');
    } else if (newType === 'SHORT_ANSWER') {
      setOptions([]);
      setCorrectAnswer('');
    } else {
      setOptions(['A. Option 1', 'B. Option 2', 'C. Option 3', 'D. Option 4']);
      setCorrectAnswer('A');
    }
  };

  const handleAddOption = () => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const nextLetter = letters[options.length] || String(options.length + 1);
    setOptions([...options, `${nextLetter}. New Option`]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      alert('A question must have at least 2 options.');
      return;
    }
    const filtered = options.filter((_, i) => i !== index);
    setOptions(filtered);
    // Adjust correct answer if it was deleted or out of bounds
    if (correctAnswer && !filtered.includes(correctAnswer)) {
      setCorrectAnswer(filtered[0]);
    }
  };

  const handleOptionTextChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Delete this question from the exam?')) return;
    try {
      const res = await fetch(`/api/exams/${examId}/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete question');
      fetchExamDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      alert('Question content cannot be empty');
      return;
    }

    const payload = {
      type,
      text,
      options: type === 'SHORT_ANSWER' ? [] : options,
      correctAnswer,
      marks
    };

    try {
      const url = editQuestionId 
        ? `/api/exams/${examId}/questions/${editQuestionId}` 
        : `/api/exams/${examId}/questions`;
      const method = editQuestionId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save question');

      setIsEditorOpen(false);
      fetchExamDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ----------------------------------------------------
  // Bulk AI Parsing handlers
  // ----------------------------------------------------
  const handleParseBulk = async () => {
    if (!rawText.trim()) {
      alert('Please paste some text first.');
      return;
    }

    try {
      setIsParsing(true);
      setParserNotice(null);

      const res = await fetch(`/api/exams/${examId}/bulk-parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: rawText })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse raw text');

      setParsedPreview(data.questions || []);
      if (data.parserUsed === 'gemini-ai') {
        setParserNotice('Successfully parsed using Google Gemini AI!');
      } else {
        setParserNotice('Parsed using robust offline Regex parser (Gemini API offline/key empty).');
      }
    } catch (err: any) {
      alert('Parsing failed: ' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleRemovePreviewRow = (idx: number) => {
    setParsedPreview(parsedPreview.filter((_, i) => i !== idx));
  };

  const handlePreviewFieldChange = (idx: number, field: string, value: any) => {
    const updated = [...parsedPreview];
    updated[idx] = { ...updated[idx], [field]: value };
    setParsedPreview(updated);
  };

  const handleImportAll = async () => {
    if (parsedPreview.length === 0) {
      alert('No parsed questions to import.');
      return;
    }

    try {
      const res = await fetch(`/api/exams/${examId}/questions/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questions: parsedPreview })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import questions');

      alert(`Successfully imported ${data.count} questions into the exam!`);
      setIsBulkOpen(false);
      setParsedPreview([]);
      setRawText('');
      fetchExamDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top breadcrumb header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Exam Builder
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            {exam ? exam.title : 'Loading exam...'}
          </h1>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex space-x-6 text-sm font-medium">
          <div>
            <span className="text-slate-500">Duration:</span>{' '}
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{exam?.duration} minutes</span>
          </div>
          <div>
            <span className="text-slate-500">Questions:</span>{' '}
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{questions.length}</span>
          </div>
          <div>
            <span className="text-slate-500">Total Marks:</span>{' '}
            <span className="text-blue-600 dark:text-blue-400 font-bold">{totalMarks} Marks</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs font-semibold cursor-pointer transition"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Bulk AI Import
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Question
          </button>
        </div>
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Loading questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            No Questions Added Yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Begin designing this exam by adding questions manually or importing a text file with AI assist.
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => setIsBulkOpen(true)}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 dark:text-blue-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Bulk Import Text
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Add Manual Question
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-md">
                      Q{idx + 1} • {q.type}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {q.marks} Marks
                    </span>
                  </div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {q.text}
                  </p>

                  {/* Options render */}
                  {q.type !== 'SHORT_ANSWER' && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {q.options.map((opt, oIdx) => {
                        // Extract option letter or match directly
                        const isCorrect = q.correctAnswer.toLowerCase() === opt.toLowerCase() || 
                                          opt.toUpperCase().startsWith(q.correctAnswer.toUpperCase() + '.') ||
                                          opt.toUpperCase().startsWith(q.correctAnswer.toUpperCase() + ')');
                        return (
                          <div
                            key={oIdx}
                            className={`flex items-center px-3.5 py-2 border rounded-xl text-xs font-medium transition ${
                              isCorrect
                                ? 'bg-emerald-50/60 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800/40'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400'
                            }`}
                          >
                            {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-2 flex-shrink-0" />}
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'SHORT_ANSWER' && (
                    <div className="pt-2">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide mb-1">
                        Expected Keywords / Criteria:
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-400 leading-relaxed">
                        {q.correctAnswer || 'None provided. Manual grading is required.'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit / Delete Buttons */}
                <div className="flex space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleOpenEdit(q)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
                    title="Edit Question"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-2 hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Add/Edit Question Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {editQuestionId ? 'Modify Question' : 'Add Exam Question'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Establish a structured question with customizable options, points, and solutions.
            </p>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Question Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="SHORT_ANSWER">Short Answer / Essay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Marks Awarded
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={marks}
                    onChange={(e) => setMarks(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Question Prompt Text
                </label>
                <textarea
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none h-20"
                  placeholder="E.g. What is the complexity of a binary search?"
                />
              </div>

              {/* Options Section for MCQ */}
              {type === 'MCQ' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Options list
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      + Add Option
                    </button>
                  </div>
                  <div className="space-y-2">
                    {options.map((opt, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="correctAnswerOption"
                          checked={correctAnswer === opt || opt.toUpperCase().startsWith(correctAnswer.toUpperCase() + '.')}
                          onChange={() => {
                            // Extract prefix letter like 'A'
                            const matches = opt.match(/^([A-Z])[\.\)\s]/i);
                            setCorrectAnswer(matches ? matches[1].toUpperCase() : opt);
                          }}
                          className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                          title="Mark as correct option"
                        />
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => handleOptionTextChange(index, e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                          placeholder={`Option ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    * Select the radio button corresponding to the correct answer. Standard formats like "A. AnswerText" are recommended.
                  </p>
                </div>
              )}

              {/* Options section for TRUE_FALSE */}
              {type === 'TRUE_FALSE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Correct Statement
                  </label>
                  <div className="flex space-x-4">
                    {['True', 'False'].map((val) => (
                      <label key={val} className="flex items-center p-3 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 flex-1">
                        <input
                          type="radio"
                          name="tfCorrect"
                          value={val}
                          checked={correctAnswer === val}
                          onChange={() => setCorrectAnswer(val)}
                          className="text-blue-600 focus:ring-blue-500 w-4 h-4 mr-2"
                        />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{val}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Criteria / Expected Answer for SHORT_ANSWER */}
              {type === 'SHORT_ANSWER' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Expected Key points (for grading reference)
                  </label>
                  <textarea
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none h-20"
                    placeholder="Enter keywords, formulas, or standard solution text that the examiner should check."
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk AI Question Import Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 text-left">
            <button
              onClick={() => {
                setIsBulkOpen(false);
                setParsedPreview([]);
                setParserNotice(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
            >
              Close
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center">
              <Sparkles className="w-5 h-5 text-blue-500 mr-2" />
              AI-Assisted Bulk Question Import
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Paste your raw exam text questions below. Our server handles Gemini AI structured analysis or falls back automatically to regex matching.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Raw Text Paste */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Raw Text pasting box
                  </label>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none h-96"
                    placeholder={`1. What is 2+2?
A. 3
B. 4
C. 5
Answer: B

2. The sky is blue.
True
False
Answer: True

3. Explain Photosynthesis.
Answer: Plants convert light to chemical energy...`}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleParseBulk}
                  disabled={isParsing}
                  className="w-full flex items-center justify-center py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  {isParsing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      AI Analyzing text... Please wait
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Parse with AI
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Parsed Preview */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Parsed Questions Preview
                    </label>
                    {parsedPreview.length > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                        {parsedPreview.length} questions parsed
                      </span>
                    )}
                  </div>

                  {parserNotice && (
                    <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-800/20 text-blue-800 dark:text-blue-300 p-2.5 rounded-xl text-xs font-medium mb-3 flex items-center">
                      <CheckCircleIcon className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span>{parserNotice}</span>
                    </div>
                  )}

                  {parsedPreview.length === 0 ? (
                    <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-96 flex flex-col items-center justify-center text-center p-6 bg-slate-50/30 dark:bg-slate-950/10">
                      <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="text-slate-500 text-xs">
                        Paste text on the left and click "Parse with AI" to generate the review table here.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl h-96 overflow-y-auto bg-white dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-900">
                      {parsedPreview.map((q, idx) => (
                        <div key={idx} className="p-4 space-y-2 text-xs relative group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                          <button
                            type="button"
                            onClick={() => handleRemovePreviewRow(idx)}
                            className="absolute right-3 top-3 text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition p-1 cursor-pointer"
                            title="Remove Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                              Q{idx + 1}
                            </span>
                            <select
                              value={q.type}
                              onChange={(e) => handlePreviewFieldChange(idx, 'type', e.target.value)}
                              className="font-bold bg-slate-100 dark:bg-slate-800 border-none rounded p-0.5 text-[10px]"
                            >
                              <option value="MCQ">MCQ</option>
                              <option value="TRUE_FALSE">TRUE_FALSE</option>
                              <option value="SHORT_ANSWER">SHORT_ANSWER</option>
                            </select>
                            <span className="text-[10px]">Points:</span>
                            <input
                              type="number"
                              value={q.marks || 5}
                              onChange={(e) => handlePreviewFieldChange(idx, 'marks', parseInt(e.target.value) || 1)}
                              className="w-10 text-center bg-slate-100 dark:bg-slate-800 rounded text-[10px]"
                            />
                          </div>

                          <input
                            type="text"
                            value={q.text}
                            onChange={(e) => handlePreviewFieldChange(idx, 'text', e.target.value)}
                            className="w-full font-bold bg-transparent border-b border-dashed border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:outline-none py-1 text-slate-900 dark:text-white"
                          />

                          {q.type !== 'SHORT_ANSWER' && q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              {q.options.map((opt: string, optIdx: number) => (
                                <input
                                  key={optIdx}
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const updatedOpts = [...q.options];
                                    updatedOpts[optIdx] = e.target.value;
                                    handlePreviewFieldChange(idx, 'options', updatedOpts);
                                  }}
                                  className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px]"
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center space-x-2 pt-1 font-semibold text-slate-500 dark:text-slate-400">
                            <span>Correct Answer:</span>
                            <input
                              type="text"
                              value={q.correctAnswer}
                              onChange={(e) => handlePreviewFieldChange(idx, 'correctAnswer', e.target.value)}
                              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-slate-900 dark:text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkOpen(false);
                      setParsedPreview([]);
                      setParserNotice(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={parsedPreview.length === 0}
                    onClick={handleImportAll}
                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-md cursor-pointer flex items-center"
                  >
                    <CheckSquare className="w-4 h-4 mr-1.5" />
                    Import All ({parsedPreview.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline icons to prevent errors
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
