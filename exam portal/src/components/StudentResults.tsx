import React, { useState, useEffect } from 'react';
import { EnhancedResult, Question, StudentResponse } from '../types';
import { ShieldAlert, BookOpen, ChevronRight, ArrowLeft, CheckCircle, XCircle, Award, Hourglass, HelpCircle } from 'lucide-react';

interface StudentResultsProps {
  token: string;
}

export default function StudentResults({ token }: StudentResultsProps) {
  const [results, setResults] = useState<EnhancedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Detail Result
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<any>(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/results/student', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch student results');
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [token]);

  const handleOpenDetail = async (attemptId: string) => {
    try {
      setActiveResultId(attemptId);
      const res = await fetch(`/api/results/detail/${attemptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch grading details');
      setActiveResult(data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Detail viewer layout */}
      {activeResultId && activeResult ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setActiveResultId(null);
                setActiveResult(null);
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Exam Grade Sheet
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                {activeResult.exam?.title}
              </h1>
            </div>
          </div>

          {/* Scores Overview banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Marks Scored:</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {activeResult.attempt?.totalMarksObtained ?? 0} Marks
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Percentage Grade:</span>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {(activeResult.attempt?.percentage ?? 0).toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Focus Warnings:</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {activeResult.attempt?.warningsCount ?? 0} Logged
              </div>
            </div>
          </div>

          {/* Questions review sheet */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Question-by-Question Review
            </h3>

            {activeResult.questions.map((q: Question, idx: number) => {
              const response = activeResult.responses.find((r: StudentResponse) => r.questionId === q.id);
              const selectedAnswer = response ? response.selectedAnswer : '';
              const isCorrect = response ? response.isCorrect : null;
              const marksObtained = response ? response.marksObtained : 0;

              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3"
                >
                  {/* Row meta */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-md">
                        Q{idx + 1} • {q.type}
                      </span>
                      {q.type !== 'SHORT_ANSWER' ? (
                        isCorrect ? (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <CheckCircle className="w-3 h-3 mr-1" /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                            <XCircle className="w-3 h-3 mr-1" /> Incorrect
                          </span>
                        )
                      ) : isCorrect === null && marksObtained === 0 ? (
                        <span className="inline-flex items-center text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          <Hourglass className="w-3 h-3 mr-1" /> Pending Grading
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <CheckCircle className="w-3 h-3 mr-1" /> Graded
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Points: {marksObtained} / {q.marks}
                    </span>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {q.text}
                  </p>

                  {/* Options display with Student's Choice highlight */}
                  {q.type !== 'SHORT_ANSWER' && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => {
                        const optionLetter = opt.match(/^([A-D])[\.\)\s]/i)?.[1] || opt;
                        const isStudentChoice = selectedAnswer === optionLetter || selectedAnswer === opt;
                        const isCorrectOption = q.correctAnswer.toLowerCase() === opt.toLowerCase() || 
                                              opt.toUpperCase().startsWith(q.correctAnswer.toUpperCase() + '.') ||
                                              opt.toUpperCase().startsWith(q.correctAnswer.toUpperCase() + ')');

                        let borderClass = 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40';
                        if (isStudentChoice) {
                          borderClass = isCorrect ? 'border-emerald-300 bg-emerald-50/40 text-emerald-800' : 'border-rose-300 bg-rose-50/40 text-rose-800';
                        } else if (isCorrectOption) {
                          borderClass = 'border-emerald-200 bg-emerald-50/10 text-emerald-700';
                        }

                        return (
                          <div
                            key={oIdx}
                            className={`px-3 py-2 border rounded-xl text-xs font-semibold flex items-center justify-between ${borderClass}`}
                          >
                            <span>{opt}</span>
                            {isStudentChoice && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-white ml-2">
                                Your Choice
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer style display */}
                  {q.type === 'SHORT_ANSWER' && (
                    <div className="space-y-2 pt-1">
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Your Submission:</div>
                        <p className="text-xs text-slate-800 dark:text-slate-300 font-mono whitespace-pre-wrap">
                          {selectedAnswer || <span className="italic text-slate-400">No response submitted.</span>}
                        </p>
                      </div>

                      {marksObtained > 0 && q.correctAnswer && (
                        <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-850 p-3 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-mono">
                          <div className="text-[10px] font-bold uppercase mb-1">Grading Criteria Reference:</div>
                          <p>{q.correctAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* List display */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              My Examination Results
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Browse scores, overall grade percentages, and detailed grading sheets of completed sessions.
            </p>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-500 text-sm">Loading results...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 p-6 rounded-2xl flex items-center">
              <ShieldAlert className="w-6 h-6 mr-3 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          ) : results.length === 0 ? (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No Results Recorded
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You have not completed or submitted any active examinations yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((res) => (
                <div
                  key={res.id}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mb-2">
                      {res.examTitle}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                      {res.examDescription || 'Finalized examination session.'}
                    </p>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-150 dark:border-slate-850 mb-6 text-xs">
                      <div>
                        <div className="text-slate-400 font-semibold uppercase tracking-wide">Score Obtained:</div>
                        <div className="font-extrabold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                          {res.totalMarksObtained ?? 0} Marks
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-semibold uppercase tracking-wide">Overall Grade:</div>
                        <div className="font-extrabold text-blue-600 dark:text-blue-400 text-sm mt-0.5">
                          {(res.percentage ?? 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenDetail(res.id)}
                    className="w-full flex items-center justify-center py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300 rounded-xl text-xs font-bold uppercase tracking-wide cursor-pointer transition"
                  >
                    View Grade Sheet
                    <ChevronRight className="w-4 h-4 ml-1.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
