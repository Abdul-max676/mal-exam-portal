import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { Search, UserPlus, Edit2, Trash2, X, ShieldAlert, CheckCircle, Mail, User as UserIcon } from 'lucide-react';

interface AdminUsersProps {
  token: string;
}

export default function AdminUsers({ token }: AdminUsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT' as Role
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data.users);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleOpenAddModal = () => {
    setEditUserId(null);
    setFormData({ name: '', email: '', password: '', role: 'STUDENT' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditUserId(user.id);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${name}? This action is permanent.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      
      setSuccessMessage('User successfully deleted');
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || (!editUserId && !formData.password)) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const url = editUserId ? `/api/admin/users/${editUserId}` : '/api/admin/users';
      const method = editUserId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      setSuccessMessage(editUserId ? 'User updated successfully' : 'User created successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) || 
                          user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header and Add User Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Manage Users
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create, edit, or delete accounts for students, examiners, and administrators.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md shadow-blue-600/15 transition-all text-sm group"
        >
          <UserPlus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
          Add User
        </button>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl flex items-center shadow-sm">
          <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">
            Role:
          </span>
          <div className="flex bg-white dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-xl w-full sm:w-auto">
            {['ALL', 'STUDENT', 'EXAMINER', 'ADMIN'].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  roleFilter === role
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Loading users list...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 p-6 rounded-2xl flex items-center">
          <ShieldAlert className="w-6 h-6 mr-3 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-500 text-sm font-medium">No users found matching current filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Registered At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center space-x-3">
                      <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full">
                        <UserIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <span>{user.name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        user.role === 'ADMIN'
                          ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                          : user.role === 'EXAMINER'
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="inline-flex items-center px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-blue-950/30 dark:text-slate-300 dark:hover:text-blue-400 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="inline-flex items-center px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/30 dark:text-slate-300 dark:hover:text-rose-400 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Add/Edit Dialog/Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {editUserId ? 'Edit User Account' : 'Create User Account'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              {editUserId ? 'Modify user credentials or system role status.' : 'Register a new participant or manager on the platform.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="E.g. Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="jane.doe@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Password {editUserId && <span className="text-slate-400 lowercase italic font-normal">(leave empty to keep current)</span>}
                </label>
                <input
                  type="password"
                  required={!editUserId}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Platform Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="STUDENT">Student</option>
                  <option value="EXAMINER">Examiner</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer shadow-blue-600/10"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
