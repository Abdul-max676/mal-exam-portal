import React, { useState, useEffect } from 'react';
import { EnhancedResult } from '../types';
import { Search, Eye, Filter, Calendar, Award, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface AdminResultsProps {
  token: string;
  onViewDetails: (attemptId: string) => void;
}

export default function AdminResults({ token, onViewDetails }: AdminResultsProps) {
  const [results, setResults] = useState<EnhancedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering and Search states
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/results/global', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch global results');
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

  // Derived stats
  const completedResults = results.filter(r => r.status === 'COMPLETED');
  const avgPercentage = completedResults.length > 0
    ? completedResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / completedResults.length
    : 0;
  const highPercentage = completedResults.length > 0
    ? Math.max(...completedResults.map(r => r.percentage || 0))
    : 0;

  // Unique exams for the exam filter dropdown
  const uniqueExams = Array.from(new Set(results.map(r => JSON.stringify({ id: r.examId, title: r.examTitle }))));
  const examOptions = uniqueExams.map((e: string) => JSON.parse(e));

  const filteredResults = results.filter(r => {
    const matchesSearch = r.studentName.toLowerCase().includes(search.toLowerCase()) ||
                          r.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
                          r.examTitle.toLowerCase().includes(search.toLowerCase());
    const matchesExam = examFilter === 'ALL' || r.examId === examFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesExam && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            View Exam Results
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor ongoing and finalized exam submissions across the whole platform.
          </p>
        </div>
        <button
          onClick={fetchResults}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          title="Refresh Results"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 p-3 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{results.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Total Attempts</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {avgPercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Average Grade</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 p-3 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {highPercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">High Grade</div>
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search student or exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto md:ml-auto">
          {/* Exam filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Exams</option>
              {examOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.title}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      {loading ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Loading attempts list...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 p-6 rounded-2xl flex items-center">
          <AlertTriangle className="w-6 h-6 mr-3 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-500 text-sm font-medium">No results recorded or matching filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Exam Title</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Marks Obtained</th>
                  <th className="px-6 py-4">Grade %</th>
                  <th className="px-6 py-4 text-center">Focus Loss Warnings</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredResults.map((result) => (
                  <tr key={result.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{result.studentName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{result.studentEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-medium">
                      {result.examTitle}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(result.startedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        result.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                      }`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {result.status === 'COMPLETED' ? (
                        <span className="font-semibold">{result.totalMarksObtained ?? 0}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {result.status === 'COMPLETED' ? (
                        <span className={`font-bold ${
                          (result.percentage ?? 0) >= 70
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : (result.percentage ?? 0) >= 40
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {(result.percentage ?? 0).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        result.warningsCount > 2
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
                          : result.warningsCount > 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {result.warningsCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onViewDetails(result.id)}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 dark:text-blue-300 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View Grade Sheet
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
  );
}
