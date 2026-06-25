import React, { useState, useEffect, useRef } from 'react';
import { Question, StudentExam } from '../types';
import { Clock, ShieldAlert, ChevronLeft, ChevronRight, Check, AlertTriangle, CloudLightning, Save, CheckSquare } from 'lucide-react';

interface ExamTakingProps {
  token: string;
  examId: string;
  onCompleted: () => void;
}

export default function ExamTaking({ token, examId, onCompleted }: ExamTakingProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<StudentExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllOnOnePage, setShowAllOnOnePage] = useState(false);

  // Student Responses Local State
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Timer Ref and State
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Integrity & Warnings State
  const [warnings, setWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Confirmation dialog
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Start exam attempt on mount
  useEffect(() => {
    const startExamAttempt = async () => {
      try {
        setLoading(true);

        // 1. Fetch questions first (we need them for counting and display)
        const qRes = await fetch(`/api/exams/${examId}/questions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const qData = await qRes.json();
        if (!qRes.ok) throw new Error(qData.error || 'Failed to load exam questions');
        setQuestions(qData.questions || []);

        // 2. Start the exam session
        const attemptRes = await fetch(`/api/exams/${examId}/start`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        const attemptData = await attemptRes.json();
        if (!attemptRes.ok) throw new Error(attemptData.error || 'Failed to start exam session');
        
        const activeAttempt = attemptData.attempt;
        setAttempt(activeAttempt);
        setWarnings(activeAttempt.warningsCount || 0);

        // 3. Setup loaded student responses if they are resuming from a refresh
        const detailRes = await fetch(`/api/results/detail/${activeAttempt.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const detailData = await detailRes.json();
        if (detailRes.ok && detailData.responses) {
          const loadedAnswers: { [qId: string]: string } = {};
          detailData.responses.forEach((resp: any) => {
            loadedAnswers[resp.questionId] = resp.selectedAnswer;
          });
          setAnswers(loadedAnswers);
        }

        // 4. Calculate time remaining based on duration & startedAt
        const startedTime = new Date(activeAttempt.startedAt).getTime();
        const durationMs = 30 * 60 * 1000; // default duration fallback
        const examDurationMinutes = activeAttempt.duration || 30; // wait, let's fetch duration from detail if any, or default to 30
        
        // Let's check exam details directly for exact duration
        const examRes = await fetch('/api/exams', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const examData = await examRes.json();
        const curExam = (examData.exams || []).find((e: any) => e.id === examId);
        
        const realDurationMs = (curExam ? curExam.duration : examDurationMinutes) * 60 * 1000;
        const endTime = startedTime + realDurationMs;
        const remainingSeconds = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        
        setTimeLeft(remainingSeconds);

        if (remainingSeconds <= 0) {
          // Immediately submit if time already expired
          handleSubmitExam(true);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    startExamAttempt();

    // Cleanups on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [token, examId]);

  // ----------------------------------------------------
  // Live Timer Countdown
  // ----------------------------------------------------
  useEffect(() => {
    if (timeLeft <= 0 || loading || error) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitExam(true); // Auto-submit on expiry!
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, loading, error]);

  // ----------------------------------------------------
  // Background Auto-Save (Every 30 seconds)
  // ----------------------------------------------------
  useEffect(() => {
    if (loading || error) return;

    autoSaveRef.current = setInterval(() => {
      triggerServerSave();
    }, 30000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [answers, loading, error]);

  const triggerServerSave = async (specificQId?: string, answerVal?: string) => {
    setSavingStatus('saving');
    try {
      // If saving a specific question's answer immediately
      if (specificQId) {
        await fetch(`/api/exams/${examId}/save-response`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ questionId: specificQId, selectedAnswer: answerVal })
        });
      } else {
        // Bulk save current answers sequentially
        const promises = Object.entries(answers).map(([qId, val]) =>
          fetch(`/api/exams/${examId}/save-response`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ questionId: qId, selectedAnswer: val })
          })
        );
        await Promise.all(promises);
      }
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2500);
    } catch (err) {
      setSavingStatus('error');
    }
  };

  // ----------------------------------------------------
  // Focus Loss Tracking (Page Visibility API + Blur)
  // ----------------------------------------------------
  useEffect(() => {
    if (loading || error) return;

    const handleFocusLoss = async () => {
      // Trigger warning increment on server
      try {
        const res = await fetch(`/api/exams/${examId}/warn`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setWarnings(data.warningsCount);
          setShowWarningModal(true);
        }
      } catch (err) {
        console.error('Failed to log warn attempt:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFocusLoss();
      }
    };

    const handleWindowBlur = () => {
      handleFocusLoss();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [loading, error, token, examId]);

  // ----------------------------------------------------
  // Response selection local updater
  // ----------------------------------------------------
  const handleSelectAnswer = (qId: string, value: string) => {
    const updatedAnswers = { ...answers, [qId]: value };
    setAnswers(updatedAnswers);
    // Instant save to server
    triggerServerSave(qId, value);
  };

  // ----------------------------------------------------
  // Submit Exam final handler
  // ----------------------------------------------------
  const handleSubmitExam = async (isTimeExpired = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);

    setSavingStatus('saving');
    try {
      // 1. Final sync save of all current local answers
      const promises = Object.entries(answers).map(([qId, val]) =>
        fetch(`/api/exams/${examId}/save-response`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ questionId: qId, selectedAnswer: val })
        })
      );
      await Promise.all(promises);

      // 2. Call submit endpoint
      const res = await fetch(`/api/exams/${examId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Final submission failed');

      setSavingStatus('saved');
      alert(isTimeExpired ? 'Your exam time has expired! Your responses have been auto‑submitted.' : 'Exam submitted successfully!');
      onCompleted();
    } catch (err) {
      alert('Failed to submit exam: ' + err);
    }
  };

  // Time format helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 font-semibold">Initializing Secure Exam Session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 text-center">
        <div className="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl max-w-md">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-rose-600" />
          <h3 className="font-bold mb-1">Session Launch Error</h3>
          <p className="text-xs mb-4">{error}</p>
          <button
            onClick={onCompleted}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const activeQuestion = questions[currentIndex];

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col h-full z-50 overflow-hidden select-none transition-colors duration-200">
      
      {/* Immersive Top Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[400px]">
            {attempt ? questions[0]?.examId === 'exam-webdev' ? 'Web Development Fundamentals' : 'Active Exam Session' : 'Secured Environment'}
          </span>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            Secure Lock Mode
          </span>
        </div>

        {/* Sync Status / Auto-save Indicator */}
        <div className="hidden sm:flex items-center space-x-2 text-xs">
          {savingStatus === 'saving' && (
            <span className="text-slate-400 flex items-center">
              <CloudLightning className="w-3.5 h-3.5 mr-1 animate-bounce" /> Auto-saving responses...
            </span>
          )}
          {savingStatus === 'saved' && (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
              <Save className="w-3.5 h-3.5 mr-1" /> Responses synchronized
            </span>
          )}
        </div>

        {/* Live Clock countdown timer */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border ${
          timeLeft < 180 
            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/50' 
            : 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
        }`}>
          <Clock className={`w-4 h-4 ${timeLeft < 180 ? 'animate-pulse' : ''}`} />
          <span className="font-mono font-bold text-sm tracking-wide">{formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:p-8 flex justify-center">
        <div className="w-full max-w-3xl flex flex-col justify-between">
          
          {/* Question Stage Panel */}
          <div>
            {/* View layout setting selector */}
            <div className="flex justify-between items-center mb-6">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                {showAllOnOnePage ? 'Viewing: Continuous scroll' : `Question ${currentIndex + 1} of ${questions.length}`}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium">Show all on one page</span>
                <input
                  type="checkbox"
                  checked={showAllOnOnePage}
                  onChange={(e) => setShowAllOnOnePage(e.target.checked)}
                  className="rounded text-blue-600 border-slate-300 focus:ring-blue-500 w-4 h-4"
                />
              </div>
            </div>

            {/* Questions area */}
            {showAllOnOnePage ? (
              <div className="space-y-8 pb-12">
                {questions.map((q, idx) => (
                  <div key={q.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-md">
                        Question {idx + 1}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        {q.marks} Marks
                      </span>
                    </div>

                    <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                      {q.text}
                    </p>

                    {/* Question option inputs */}
                    {q.type === 'MCQ' && (
                      <div className="grid grid-cols-1 gap-2.5">
                        {q.options.map((opt, oIdx) => {
                          const optionPrefix = opt.match(/^([A-D])[\.\)\s]/i)?.[1] || opt;
                          const isSelected = answers[q.id] === optionPrefix || answers[q.id] === opt;
                          return (
                            <button
                              key={oIdx}
                              onClick={() => handleSelectAnswer(q.id, optionPrefix)}
                              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-900 border-blue-400 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-800'
                                  : 'bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <span>{opt}</span>
                              {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'TRUE_FALSE' && (
                      <div className="grid grid-cols-2 gap-3">
                        {['True', 'False'].map((val) => {
                          const isSelected = answers[q.id] === val;
                          return (
                            <button
                              key={val}
                              onClick={() => handleSelectAnswer(q.id, val)}
                              className={`text-center py-4 rounded-xl border text-sm font-bold transition cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-900 border-blue-400 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-800'
                                  : 'bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'SHORT_ANSWER' && (
                      <div>
                        <textarea
                          value={answers[q.id] || ''}
                          onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                          placeholder="Type your explanation or essay response here..."
                          className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-28 leading-relaxed resize-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              activeQuestion && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 sm:p-8 rounded-2xl space-y-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-md">
                      Question {currentIndex + 1} • {activeQuestion.type}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
                      Value: {activeQuestion.marks} Marks
                    </span>
                  </div>

                  <p className="text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {activeQuestion.text}
                  </p>

                  {/* MCQ selections */}
                  {activeQuestion.type === 'MCQ' && (
                    <div className="grid grid-cols-1 gap-3 pt-2">
                      {activeQuestion.options.map((opt, oIdx) => {
                        const optionLetter = opt.match(/^([A-D])[\.\)\s]/i)?.[1] || opt;
                        const isSelected = answers[activeQuestion.id] === optionLetter || answers[activeQuestion.id] === opt;
                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleSelectAnswer(activeQuestion.id, optionLetter)}
                            className={`w-full text-left px-4 py-3.5 border rounded-xl text-sm font-bold transition flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/80 text-blue-900 border-blue-400 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800'
                                : 'bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <span>{opt}</span>
                            {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* True False selections */}
                  {activeQuestion.type === 'TRUE_FALSE' && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {['True', 'False'].map((val) => {
                        const isSelected = answers[activeQuestion.id] === val;
                        return (
                          <button
                            key={val}
                            onClick={() => handleSelectAnswer(activeQuestion.id, val)}
                            className={`text-center py-4 rounded-xl border text-sm font-bold transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 text-blue-900 border-blue-400 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800'
                                : 'bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer text area */}
                  {activeQuestion.type === 'SHORT_ANSWER' && (
                    <div className="pt-2">
                      <textarea
                        value={answers[activeQuestion.id] || ''}
                        onChange={(e) => handleSelectAnswer(activeQuestion.id, e.target.value)}
                        placeholder="Type your explanation or essay response here..."
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-36 leading-relaxed resize-none"
                      />
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* Bottom Pagination controls */}
          {!showAllOnOnePage && (
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-850 pt-6 mt-8 pb-10">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-50 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous Question
              </button>

              <div className="hidden sm:flex items-center space-x-1">
                {questions.map((_, qIdx) => {
                  const isAnswered = answers[questions[qIdx].id] !== undefined && answers[questions[qIdx].id] !== '';
                  return (
                    <button
                      key={qIdx}
                      onClick={() => setCurrentIndex(qIdx)}
                      className={`w-7 h-7 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center ${
                        currentIndex === qIdx
                          ? 'bg-blue-600 text-white'
                          : isAnswered
                          ? 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/40'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>

              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Submit Exam
                  <CheckSquare className="w-4 h-4 ml-1.5" />
                </button>
              ) : (
                <button
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className="inline-flex items-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Next Question
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              )}
            </div>
          )}

          {/* All-on-one-page submit footer */}
          {showAllOnOnePage && (
            <div className="flex justify-center pb-12">
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer"
              >
                Finish and Submit Exam
              </button>
            </div>
          )}

        </div>
      </main>

      {/* Warning Modal (Tab focus change log notifications) */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Focus Loss Detected!
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Academic integrity is actively monitored during this examination. Leaving this tab, window, or changing focus has been logged on the server.
            </p>

            <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 rounded-xl">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                Total Warnings Logged: {warnings}
              </span>
            </div>

            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
            >
              Return to Examination
            </button>
          </div>
        </div>
      )}

      {/* Submit Exam Confirmation Overlay */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Submit Your Exam?
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Are you sure you have finalized all answers and are ready to submit? This action cannot be undone.
            </p>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl cursor-pointer"
              >
                No, Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  handleSubmitExam();
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
              >
                Yes, Submit Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
