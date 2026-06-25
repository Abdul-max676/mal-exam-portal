import React, { useState } from 'react';
import { User, Role } from '../types';
import { Shield, Mail, Lock, User as UserIcon, KeyRound, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LoginRegisterProps {
  onAuthSuccess: (token: string, user: User) => void;
}

export default function LoginRegister({ onAuthSuccess }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<Role>('STUDENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityToken, setSecurityToken] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in email and password.');
      return;
    }

    if (!isLogin && !name.trim()) {
      setError('Full name is required to create an account.');
      return;
    }

    // Role checks for security tokens
    if (!isLogin && role !== 'STUDENT') {
      if (!securityToken) {
        setError(`Please enter the system verification token to sign up as an ${role}.`);
        return;
      }
      // Simple mock check or let backend fail, but let's accept "examiner123" / "admin123" as friendly defaults in client side
      const valid = role === 'ADMIN' ? 'admin123' : 'examiner123';
      if (securityToken !== valid && securityToken !== 'EXAM_PORTAL_SECURE') {
        setError(`Invalid verification token for role ${role}. (Hint: Use 'admin123' for Admin, 'examiner123' for Examiner)`);
        return;
      }
    }

    try {
      setLoading(true);
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email, password }
        : { name, email, password, role };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isLogin) {
        onAuthSuccess(data.token, data.user);
      } else {
        setSuccess('Registration successful! You can now log in.');
        setIsLogin(true);
        // Clear registration fields
        setName('');
        setSecurityToken('');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo Icon */}
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/20 mb-4 animate-pulse">
          <Shield className="h-7 w-7" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Examination Portal
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 font-medium">
          Secure Academic Integrity Verification and Testing Center
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 relative overflow-hidden">
          
          {/* Accent light decoration */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-blue-600"></div>

          {/* Toggle Tab */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <button
              onClick={() => {
                setIsLogin(true);
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isLogin
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                !isLogin
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 p-3.5 rounded-2xl flex items-center">
              <AlertCircle className="w-5 h-5 mr-2.5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="text-xs font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 p-3.5 rounded-2xl flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold leading-relaxed">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Registration Fields */}
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['STUDENT', 'EXAMINER', 'ADMIN'] as Role[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-2 px-1 rounded-xl text-[10px] font-extrabold border uppercase tracking-wider transition cursor-pointer ${
                          role === r
                            ? 'bg-blue-50 text-blue-700 border-blue-400 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {r === 'STUDENT' ? 'Student' : r === 'EXAMINER' ? 'Examiner' : 'Admin'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Secure Access Token Verification */}
                {role !== 'STUDENT' && (
                  <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/40 rounded-2xl animate-in slide-in-from-top duration-150 space-y-2">
                    <label className="block text-xs font-semibold text-blue-800 dark:text-blue-400 uppercase tracking-wider">
                      Staff Verification Key
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 w-4 h-4" />
                      <input
                        type="password"
                        required
                        value={securityToken}
                        onChange={(e) => setSecurityToken(e.target.value)}
                        className="w-full pl-10 pr-4 py-1.5 bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={role === 'ADMIN' ? 'Default: admin123' : 'Default: examiner123'}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="name@university.edu"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold uppercase tracking-wider shadow-md shadow-blue-600/10 flex items-center justify-center transition cursor-pointer"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Quick instructions/hint for easy seeding demo access */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed text-left">
            <span className="font-bold">Initial seeded accounts available to test:</span>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 font-semibold">
              <li>Admin: <span className="text-blue-600">admin@portal.com</span> (pwd: admin123)</li>
              <li>Examiner: <span className="text-blue-600">examiner@portal.com</span> (pwd: exam123)</li>
              <li>Student: <span className="text-blue-600">student@portal.com</span> (pwd: student123)</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
