import React, { useState, useEffect } from 'react';
import { Exam, User } from '../types';
import { Search, Plus, Calendar, Clock, Edit3, Trash2, Check, EyeOff, LayoutGrid, Trash, Sparkles } from 'lucide-react';

interface ExaminerExamsProps {
  token: string;
  user: User;
  onOpenExamBuilder: (examId: string) => void;
}

export default function ExaminerExams({ token, user, onOpenExamBuilder }: ExaminerExamsProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [publishFilter, setPublishFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editExamId, setEditExamId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 30,
    startTime: '',
    endTime: '',
    isPublished: false
  });

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch exams');
      
      // If user is examiner, only show their own exams, otherwise show all if Admin
      const list = user.role === 'EXAMINER' 
        ? data.exams.filter((e: Exam) => e.createdById === user.id)
        : data.exams;

      setExams(list);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [token, user]);

  const handleOpenAddModal = () => {
    setEditExamId(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0] + 'T09:00';
    
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 8);
    const formattedEndDate = weekLater.toISOString().split('T')[0] + 'T17:00';

    setFormData({
      title: '',
      description: '',
      duration: 30,
      startTime: formattedDate,
      endTime: formattedEndDate,
      isPublished: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exam: Exam) => {
    setEditExamId(exam.id);
    setFormData({
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      startTime: exam.startTime.substring(0, 16),
      endTime: exam.endTime.substring(0, 16),
      isPublished: exam.isPublished
    });
    setIsModalOpen(true);
  };

  const handleDeleteExam = async (id: string, title: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete "${title}"? This will delete all questions and responses associated with this exam.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/exams/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete exam');
      
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTogglePublish = async (exam: Exam) => {
    try {
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isPublished: !exam.isPublished })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update publishing status');
      
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.duration || !formData.startTime || !formData.endTime) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const url = editExamId ? `/api/exams/${editExamId}` : '/api/exams';
      const method = editExamId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save exam details');

      setIsModalOpen(false);
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(search.toLowerCase()) ||
                          exam.description.toLowerCase().includes(search.toLowerCase());
    const matchesPublish = publishFilter === 'ALL' ||
                           (publishFilter === 'PUBLISHED' && exam.isPublished) ||
                           (publishFilter === 'DRAFT' && !exam.isPublished);
    return matchesSearch && matchesPublish;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Manage Exams
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {user.role === 'ADMIN' 
              ? 'Administrator view: Edit or publish any exam hosted on this server.'
              : 'Examiner view: Set up testing parameters, adjust schedule, and publish exams.'}
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md shadow-blue-600/15 transition-all text-sm group cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
          Create Exam
        </button>
      </div>

      {/* Filter and search */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search exams by title or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">
            Status:
          </span>
          <div className="flex bg-white dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-xl w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PUBLISHED', label: 'Published' },
              { id: 'DRAFT', label: 'Drafts' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPublishFilter(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  publishFilter === opt.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Exams */}
      {loading ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Loading exams...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 p-6 rounded-2xl flex items-center">
          <EyeOff className="w-6 h-6 mr-3 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-500 text-sm font-medium">No exams found. Click "Create Exam" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div>
                {/* Header info */}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                    {exam.title}
                  </h3>
                  <button
                    onClick={() => handleTogglePublish(exam)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border cursor-pointer tracking-wider flex items-center transition ${
                      exam.isPublished
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800/50'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    {exam.isPublished ? <Check className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                    {exam.isPublished ? 'Published' : 'Draft'}
                  </button>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                  {exam.description || 'No description provided.'}
                </p>

                {/* Meta Row */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">
                  <div className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                    <span>Duration: {exam.duration} mins</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                    <span>Window: {new Date(exam.startTime).toLocaleDateString()} - {new Date(exam.endTime).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <LayoutGrid className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                    <span>Questions: {exam.questionCount ?? 0} ({exam.totalMarks ?? 0} marks)</span>
                  </div>
                </div>
              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900 pt-4 mt-auto">
                <button
                  onClick={() => onOpenExamBuilder(exam.id)}
                  className="flex items-center px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 dark:text-blue-300 rounded-xl font-semibold text-xs tracking-wide cursor-pointer transition"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
                  Exam Builder
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEditModal(exam)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-400 rounded-xl cursor-pointer transition"
                    title="Edit Exam"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteExam(exam.id, exam.title)}
                    className="p-2 bg-slate-50 hover:bg-rose-50 text-rose-600 dark:bg-slate-900 dark:hover:bg-rose-950/20 dark:text-rose-400 rounded-xl cursor-pointer transition"
                    title="Delete Exam"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {editExamId ? 'Edit Exam Parameters' : 'Create Exam Scheduling'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Configure timing limits, display information, and active testing periods.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Exam Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="E.g. Biology Semester 1 Finals"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                  placeholder="Outline the coverage of this exam, instructions, etc."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="isPublished"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isPublished" className="ml-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Publish immediately?
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Start Window
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    End Window
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer shadow-blue-600/10"
                >
                  Save Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
