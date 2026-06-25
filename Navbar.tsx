import React, { useState } from 'react';
import { User } from '../types';
import { GraduationCap, LogOut, Sun, Moon, Shield, BookOpen, ClipboardCheck } from 'lucide-react';

interface NavbarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Navbar({ user, activeTab, setActiveTab, onLogout }: NavbarProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300 border border-red-200/50 dark:border-red-800/30';
      case 'EXAMINER':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300 border border-blue-200/50 dark:border-blue-850';
      default:
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-3.5 h-3.5 mr-1" />;
      case 'EXAMINER':
        return <BookOpen className="w-3.5 h-3.5 mr-1" />;
      default:
        return <GraduationCap className="w-3.5 h-3.5 mr-1" />;
    }
  };

  // Get tabs based on current role
  const getTabs = () => {
    if (user.role === 'ADMIN') {
      return [
        { id: 'users', label: 'Users' },
        { id: 'exams', label: 'Exams' },
        { id: 'grade', label: 'Essay Grading' },
        { id: 'results', label: 'Global Results' }
      ];
    }
    if (user.role === 'EXAMINER') {
      return [
        { id: 'exams', label: 'Exams' },
        { id: 'grade', label: 'Essay Grading' },
        { id: 'results', label: 'Results' }
      ];
    }
    // Student
    return [
      { id: 'exams', label: 'Testing' },
      { id: 'results', label: 'My Results' }
    ];
  };

  const tabs = getTabs();

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo & Navigation Tabs */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2.5">
              <div className="bg-blue-600 text-white p-2 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/15">
                <ClipboardCheck className="w-5.5 h-5.5" />
              </div>
              <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
                ExamPortal
              </span>
            </div>

            {/* Desktop Navigation Link Row */}
            <div className="hidden md:flex space-x-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls & Profile section */}
          <div className="flex items-center space-x-4">
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Toggle Theme Mode"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* Vertical Splitter */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

            {/* User Profile Info Card */}
            <div className="flex items-center space-x-3">
              <div className="text-right hidden lg:block">
                <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  {user.name}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {user.email}
                </div>
              </div>

              {/* Role Badge Indicator */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest ${getRoleBadgeColor(user.role)}`}>
                {getRoleIcon(user.role)}
                {user.role}
              </span>

              {/* Secure Log Out Trigger */}
              <button
                onClick={() => {
                  if (window.confirm('Are you absolutely sure you want to sign out from the Examination Portal?')) {
                    onLogout();
                  }
                }}
                className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/20 rounded-xl transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>

        {/* Small Screen Horizontal Tabs Bar */}
        <div className="flex md:hidden space-x-1 pb-3 overflow-x-auto select-none border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>
    </nav>
  );
}
