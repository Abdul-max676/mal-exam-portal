import React, { useState, useEffect } from 'react';
import { EnhancedResult, Question, StudentResponse } from '../types';
import { ArrowLeft, CheckCircle, Award, Eye, Save, AlertCircle, Sparkles, HelpCircle } from 'lucide-react';

interface GradeShortAnswersProps {
  token: string;
}

export default function GradeShortAnswers({ token }: GradeShortAnswersProps) {
  const [attempts, setAttempts] = useState<EnhancedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active grading detail view
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [gradingState, setGradingState] = useState<{ [questionId: string]: number }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/results/examiner', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch examiner submissions');
      
      // Filter only completed exams
      const completed = (data.results || []).filter((r: EnhancedResult) => r.status === 'COMPLETED');
      setAttempts(completed);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, [token]);

  const handleOpenGrading = async (attemptId: string) => {
    try {
      setActiveAttemptId(attemptId);
      const res = await fetch(`/api/results/detail/${attemptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load details');
      
      setActiveAttempt(data);
      
      // Initialize grading state with already graded marks
      const marksMap: { [questionId: string]: number } = {};
      data.responses.forEach((resp: StudentResponse) => {
        marksMap[resp.questionId] = resp.marksObtained;
      });
      setGradingState(marksMap);
      setSuccessMsg(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMarkChange = (qId: string, value: number, maxMarks: number) => {
    if (value < 0 || value > maxMarks) return;
    setGradingState({
      ...gradingState,
      [qId]: value
    });
  };

  const handleSaveGrade = async (qId: string) => {
    const marksObtained = gradingState[qId] ?? 0;
    try {
      const res = await fetch('/api/results/grade-short-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentExamId: activeAttemptId,
          questionId: qId,
          marksObtained
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save grading marks');

      // Update active attempt status
      setActiveAttempt({
        ...activeAttempt,
        attempt: {
          ...activeAttempt.attempt,
          totalMarksObtained: data.totalMarksObtained,
          percentage: data.percentage
        }
      });

      setSuccessMsg('Marks saved and total percentage recalculated!');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchAttempts(); // Refresh list stats
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Get only short answer questions
  const shortAnswerQuestions = activeAttempt
    ? activeAttempt.questions.filter((q: Question) => q.type === 'SHORT_ANSWER')
    : [];

  return (
    <div className="space-y-6 text-left">
      {/* Detail grading layout */}
      {activeAttemptId && activeAttempt ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setActiveAttemptId(null);
                setActiveAttempt(null);
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Grading Center
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                Evaluate: {activeAttempt.student?.name}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">
                Exam: {activeAttempt.exam?.title}
              </p>
            </div>
          </div>

          {/* Success / Info banners */}
          {successMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 p-3.5 rounded-xl text-xs font-semibold">
              {successMsg}
            </div>
          )}

          {/* Core Info Bar */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex space-x-6 text-sm font-medium">
              <div>
                <span className="text-slate-500">Graded Score:</span>{' '}
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {activeAttempt.attempt?.totalMarksObtained ?? 0} Marks
                </span>
              </div>
              <div>
                <span className="text-slate-500">Percentage:</span>{' '}
                <span className="text-slate-900 dark:text-slate-100 font-bold">
                  {(activeAttempt.attempt?.percentage ?? 0).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-slate-500">Warnings Count:</span>{' '}
                <span className={`font-bold ${activeAttempt.attempt?.warningsCount > 2 ? 'text-rose-600' : 'text-slate-600 dark:text-slate-400'}`}>
                  {activeAttempt.attempt?.warningsCount ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Questions Evaluator list */}
          {shortAnswerQuestions.length === 0 ? (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No Short Answers to Grade
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                This exam contains only MCQs or True/False questions which are graded automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {shortAnswerQuestions.map((q: Question, idx: number) => {
                const response = activeAttempt.responses.find((r: StudentResponse) => r.questionId === q.id);
                const currentGrade = gradingState[q.id] ?? 0;

                return (
                  <div
                    key={q.id}
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-900">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-md">
                          Essay Question {idx + 1}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md font-semibold">
                          Max Marks: {q.marks}
                        </span>
                      </div>
                    </div>

                    {/* Question text */}
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Question Prompt:</div>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">
                        {q.text}
                      </p>
                    </div>

                    {/* Student's response */}
                    <div className="bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-950/40 p-4 rounded-xl">
                      <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1.5 flex items-center">
                        <Award className="w-3.5 h-3.5 mr-1" />
                        Student's Submitted Answer:
                      </div>
                      <p className="text-sm text-slate-800 dark:text-slate-300 whitespace-pre-wrap font-medium leading-relaxed bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/40">
                        {response ? response.selectedAnswer : <span className="italic text-slate-400">No response submitted.</span>}
                      </p>
                    </div>

                    {/* Reference Key / Guidelines */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/30 p-4 rounded-xl">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                        Expected Criteria / Guidelines:
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
                        {q.correctAnswer || 'No specific criteria entered.'}
                      </p>
                    </div>

                    {/* Grading Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Assign Marks (0 to {q.marks}):
                        </span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={q.marks}
                          value={currentGrade}
                          onChange={(e) => handleMarkChange(q.id, parseFloat(e.target.value) || 0, q.marks)}
                          className="w-16 text-center px-2 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveGrade(q.id)}
                        className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-sm shadow-blue-600/10"
                      >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        Save Grade
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* List layout */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Grade Short Answers
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Browse student exam submissions that require manual essay or short‑answer grading.
            </p>
          </div>

          {attempts.length === 0 ? (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                All Caught Up!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No exam submissions are currently pending manual evaluation.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">Exam Title</th>
                      <th className="px-6 py-4">Submitted At</th>
                      <th className="px-6 py-4">Current Score</th>
                      <th className="px-6 py-4">Grade %</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                    {attempts.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{att.studentName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{att.studentEmail}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                          {att.examTitle}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          {att.totalMarksObtained ?? 0} Marks
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-blue-600 dark:text-blue-400">
                            {(att.percentage ?? 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleOpenGrading(att.id)}
                            className="inline-flex items-center px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300 rounded-lg text-xs font-semibold cursor-pointer transition"
                          >
                            <Award className="w-3.5 h-3.5 mr-1" />
                            Grade Essay Answer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
