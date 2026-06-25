import React, { useState, useEffect } from 'react';
import { Exam } from '../types';
import { Calendar, Clock, Award, ShieldAlert, Play, CheckCircle } from 'lucide-react';

interface StudentExamsProps {
  token: string;
  onStartExam: (examId: string) => void;
}

export default function StudentExams({ token, onStartExam }: StudentExamsProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [completedExamIds, setCompletedExamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Start confirmation dialog
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch available published exams
      const examRes = await fetch('/api/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const examData = await examRes.json();
      
      // Fetch student's completed exams
      const resultsRes = await fetch('/api/results/student', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const resultsData = await resultsRes.json();
      
      const completedIds = (resultsData.results || [])
        .filter((r: any) => r.status === 'COMPLETED')
        .map((r: any) => r.examId);

      setCompletedExamIds(completedIds);
      setExams(examData.exams || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleTriggerConfirm = (exam: Exam) => {
    setSelectedExam(exam);
  };

  const handleConfirmStart = () => {
    if (!selectedExam) return;
    const examId = selectedExam.id;
    setSelectedExam(null);
    onStartExam(examId);
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Available Examinations
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Review, select, and initiate active, scheduled testing sessions.
        </p>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Loading available exams...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 p-6 rounded-2xl flex items-center">
          <ShieldAlert className="w-6 h-6 mr-3 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            No Exams Available
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            There are currently no active examinations published on your syllabus. Check back later!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => {
            const isCompleted = completedExamIds.includes(exam.id);
            return (
              <div
                key={exam.id}
                className={`bg-white dark:bg-slate-950 border rounded-2xl p-6 shadow-xs flex flex-col justify-between transition ${
                  isCompleted 
                    ? 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-50/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {exam.title}
                    </h3>
                    {isCompleted && (
                      <span className="flex-shrink-0 flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4">
                    {exam.description || 'No instruction or guidelines description specified.'}
                  </p>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                      <span>{exam.duration} minutes</span>
                    </div>
                    <div className="flex items-center">
                      <Award className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                      <span>{exam.totalMarks ?? 0} total marks</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-900/60 pt-4 mt-auto">
                  {isCompleted ? (
                    <button
                      disabled
                      className="w-full py-2 bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider cursor-not-allowed"
                    >
                      Already Attempted
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTriggerConfirm(exam)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wide shadow-xs flex items-center justify-center cursor-pointer transition"
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      Start Examination
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Start Examination Confirmation Overlay Dialog */}
      {selectedExam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Start Examination?
              </h2>

              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                "{selectedExam.title}"
              </p>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3.5 rounded-xl text-left space-y-1.5">
                <div className="flex items-center text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                  <ShieldAlert className="w-4 h-4 mr-1.5" />
                  Academic integrity notice:
                </div>
                <ul className="list-disc pl-4 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <li>The countdown timer starts instantly.</li>
                  <li>Switches of screen focus or tab visibility will be logged.</li>
                  <li>Exam auto‑submits when the timer reaches zero.</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedExam(null)}
                  className="flex-1 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStart}
                  className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
                >
                  Start Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
