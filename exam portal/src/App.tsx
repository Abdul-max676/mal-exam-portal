import React, { useState, useEffect } from 'react';
import { User } from './types';
import LoginRegister from './components/LoginRegister';
import Navbar from './components/Navbar';
import AdminUsers from './components/AdminUsers';
import ExaminerExams from './components/ExaminerExams';
import ExamBuilder from './components/ExamBuilder';
import GradeShortAnswers from './components/GradeShortAnswers';
import AdminResults from './components/AdminResults';
import StudentExams from './components/StudentExams';
import ExamTaking from './components/ExamTaking';
import StudentResults from './components/StudentResults';
import { AlertCircle, ArrowLeft, Check, CheckCircle, XCircle } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('exam_portal_token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Router / Navigation state
  const [activeTab, setActiveTab] = useState<string>('');
  const [activeExamId, setActiveExamId] = useState<string | null>(null); // For student active taking exam
  const [activeBuilderExamId, setActiveBuilderExamId] = useState<string | null>(null); // For examiner active question building
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null); // For detailed score sheet popup

  // Detailed score sheet view data
  const [detailResultData, setDetailResultData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Load user profile on mount if token exists
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          // Set default tabs based on roles
          if (data.user.role === 'ADMIN') setActiveTab('users');
          else if (data.user.role === 'EXAMINER') setActiveTab('exams');
          else setActiveTab('exams');
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error('Failed to restore user session:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  // Sync theme on load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleAuthSuccess = (newToken: string, newUser: User) => {
    localStorage.setItem('exam_portal_token', newToken);
    setToken(newToken);
    setUser(newUser);
    if (newUser.role === 'ADMIN') setActiveTab('users');
    else if (newUser.role === 'EXAMINER') setActiveTab('exams');
    else setActiveTab('exams');
  };

  const handleLogout = () => {
    localStorage.removeItem('exam_portal_token');
    setToken(null);
    setUser(null);
    setActiveTab('');
    setActiveExamId(null);
    setActiveBuilderExamId(null);
    setSelectedResultId(null);
    setDetailResultData(null);
  };

  // Open Detailed Grade sheet Modal for Admin & Examiners
  const handleViewResultDetails = async (attemptId: string) => {
    try {
      setSelectedResultId(attemptId);
      setLoadingDetail(true);
      const res = await fetch(`/api/results/detail/${attemptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Failed to load grading breakdown');
      setDetailResultData(data);
    } catch (err: any) {
      alert(err.message);
      setSelectedResultId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-500 text-sm font-semibold">Resuming secure examination profile...</p>
      </div>
    );
  }

  // Not logged in: show credentials screen
  if (!token || !user) {
    return <LoginRegister onAuthSuccess={handleAuthSuccess} />;
  }

  // Active student exam taking view: renders secure borderless viewport
  if (activeExamId) {
    return (
      <ExamTaking
        token={token}
        examId={activeExamId}
        onCompleted={() => {
          setActiveExamId(null);
          // Auto route to results tab to review grades
          setActiveTab('results');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      
      {/* Global Navbar Header */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main Viewport Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Render Builder View override (inside dashboard shell with a back button) */}
        {activeBuilderExamId ? (
          <ExamBuilder
            token={token}
            examId={activeBuilderExamId}
            onBack={() => setActiveBuilderExamId(null)}
          />
        ) : (
          /* Normal Tab Routers */
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-150">
            {/* Administrators Tabs */}
            {user.role === 'ADMIN' && (
              <>
                {activeTab === 'users' && <AdminUsers token={token} />}
                {activeTab === 'exams' && (
                  <ExaminerExams
                    token={token}
                    user={user}
                    onOpenExamBuilder={(id) => setActiveBuilderExamId(id)}
                  />
                )}
                {activeTab === 'grade' && <GradeShortAnswers token={token} />}
                {activeTab === 'results' && (
                  <AdminResults
                    token={token}
                    onViewDetails={handleViewResultDetails}
                  />
                )}
              </>
            )}

            {/* Examiners Tabs */}
            {user.role === 'EXAMINER' && (
              <>
                {activeTab === 'exams' && (
                  <ExaminerExams
                    token={token}
                    user={user}
                    onOpenExamBuilder={(id) => setActiveBuilderExamId(id)}
                  />
                )}
                {activeTab === 'grade' && <GradeShortAnswers token={token} />}
                {activeTab === 'results' && (
                  <AdminResults
                    token={token}
                    onViewDetails={handleViewResultDetails}
                  />
                )}
              </>
            )}

            {/* Students Tabs */}
            {user.role === 'STUDENT' && (
              <>
                {activeTab === 'exams' && (
                  <StudentExams
                    token={token}
                    onStartExam={(id) => setActiveExamId(id)}
                  />
                )}
                {activeTab === 'results' && <StudentResults token={token} />}
              </>
            )}
          </div>
        )}
      </main>

      {/* Detailed Result Breakdown Sheet Overlay (Modal) */}
      {selectedResultId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto text-left animate-in fade-in zoom-in-95 duration-150">
            
            <button
              onClick={() => {
                setSelectedResultId(null);
                setDetailResultData(null);
              }}
              className="absolute right-5 top-5 p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-850 dark:text-slate-300 rounded-xl transition cursor-pointer font-bold text-xs"
            >
              Close
            </button>

            {loadingDetail ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-500 text-sm">Parsing attempt evaluation criteria...</p>
              </div>
            ) : detailResultData ? (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded">
                    Score Breakdown Card
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1 leading-tight">
                    {detailResultData.exam?.title}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Student: <span className="font-bold text-slate-700 dark:text-slate-300">{detailResultData.student?.name}</span> ({detailResultData.student?.email})
                  </p>
                </div>

                {/* Statistics panel */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase">Total Score</span>
                    <p className="text-sm font-extrabold mt-0.5 text-slate-900 dark:text-white">
                      {detailResultData.attempt?.totalMarksObtained} / {detailResultData.questions.reduce((sum: number, q: any) => sum + q.marks, 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase">Grade Percentage</span>
                    <p className="text-sm font-extrabold mt-0.5 text-blue-600">
                      {(detailResultData.attempt?.percentage ?? 0).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase">Focus Warnings</span>
                    <p className="text-sm font-extrabold mt-0.5 text-slate-900 dark:text-white">
                      {detailResultData.attempt?.warningsCount}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase">Status</span>
                    <p className="text-sm font-extrabold mt-0.5 text-emerald-600 uppercase">
                      {detailResultData.attempt?.status}
                    </p>
                  </div>
                </div>

                {/* Breakdown details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responses Breakdown</h3>
                  {detailResultData.questions.map((q: any, idx: number) => {
                    const response = detailResultData.responses.find((r: any) => r.questionId === q.id);
                    const selected = response ? response.selectedAnswer : '';
                    const isCorrect = response ? response.isCorrect : false;
                    const marksObtained = response ? response.marksObtained : 0;

                    return (
                      <div key={q.id} className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                            Q{idx + 1} • {q.type}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            Marks: {marksObtained} / {q.marks}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {q.text}
                        </p>

                        <div className="text-xs space-y-1">
                          <p className="flex items-center">
                            <span className="font-semibold text-slate-400 mr-2">Submitted Answer:</span>
                            <span className={`font-semibold ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {selected || <span className="italic text-slate-400">No answer submitted</span>}
                            </span>
                          </p>
                          {q.type !== 'SHORT_ANSWER' && (
                             <p className="flex items-center">
                               <span className="font-semibold text-slate-400 mr-2">Correct Solution Key:</span>
                               <span className="font-bold text-emerald-600">{q.correctAnswer}</span>
                             </p>
                          )}
                          {q.type === 'SHORT_ANSWER' && q.correctAnswer && (
                            <div className="mt-2 bg-slate-50 dark:bg-slate-905 p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                              <span className="font-bold text-slate-500 uppercase">Reference Guidelines:</span>
                              <p className="mt-1">{q.correctAnswer}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Failed to resolve grade sheet record.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
