/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { Login } from './components/Login';
import { StudentDashboard } from './components/StudentDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { DeveloperDashboard } from './components/DeveloperDashboard';
import { User } from './types';
import { Sun, Moon, Sparkles, Download } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function MainAppShell() {
  const { theme, toggleTheme } = useTheme();
  const [activeRole, setActiveRole] = useState<'student' | 'teacher' | 'admin' | 'developer'>(() => {
    const params = new URLSearchParams(window.location.search);
    const queryRole = params.get('role') as any;
    if (queryRole && ['student', 'teacher', 'admin', 'developer'].includes(queryRole)) {
      return queryRole;
    }
    const lastActive = localStorage.getItem('proctor_last_active_role') as any;
    if (lastActive && ['student', 'teacher', 'admin', 'developer'].includes(lastActive)) {
      return lastActive;
    }
    return 'student'; // Default fallback
  });

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Sync session based on activeRole changes
  useEffect(() => {
    const savedUser = localStorage.getItem(`proctor_session_user_${activeRole}`);
    const savedToken = localStorage.getItem(`proctor_session_token_${activeRole}`);

    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch (err) {
        localStorage.removeItem(`proctor_session_user_${activeRole}`);
        localStorage.removeItem(`proctor_session_token_${activeRole}`);
        setUser(null);
        setToken(null);
      }
    } else {
      setUser(null);
      setToken(null);
    }
  }, [activeRole]);

  // Check on mount if query param changes or URL has invite codes
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const queryRole = params.get('role') as any;
      if (queryRole && ['student', 'teacher', 'admin', 'developer'].includes(queryRole)) {
        setActiveRole(queryRole);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after 4.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    const role = loggedInUser.role;
    localStorage.setItem(`proctor_session_user_${role}`, JSON.stringify(loggedInUser));
    localStorage.setItem(`proctor_session_token_${role}`, sessionToken);
    localStorage.setItem('proctor_last_active_role', role);

    // Update query parameter in URL without reloading
    const url = new URL(window.location.href);
    url.searchParams.set('role', role);
    window.history.pushState({}, '', url.toString());

    setActiveRole(role);
    setUser(loggedInUser);
    setToken(sessionToken);
    showToast(`Logged into ${role} workspace successfully!`, 'success');
  };

  const handleLogout = () => {
    if (user) {
      showToast(`Logged out from ${user.role} session successfully.`, 'info');
      localStorage.removeItem(`proctor_session_user_${user.role}`);
      localStorage.removeItem(`proctor_session_token_${user.role}`);
    }
    
    // Find next remaining active role
    const remainingRoles = ['student', 'teacher', 'admin', 'developer'].filter(
      r => r !== activeRole && localStorage.getItem(`proctor_session_user_${r}`) !== null
    );

    if (remainingRoles.length > 0) {
      const nextRole = remainingRoles[0] as any;
      localStorage.setItem('proctor_last_active_role', nextRole);
      
      const url = new URL(window.location.href);
      url.searchParams.set('role', nextRole);
      window.history.pushState({}, '', url.toString());
      
      setActiveRole(nextRole);
    } else {
      localStorage.removeItem('proctor_last_active_role');
      const url = new URL(window.location.href);
      url.searchParams.delete('role');
      window.history.pushState({}, '', url.toString());
      
      setUser(null);
      setToken(null);
    }
  };

  const handleSwitchActiveRole = (role: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('role', role);
    window.history.pushState({}, '', url.toString());
    setActiveRole(role as any);
  };

  const handleOpenRoleInNewTab = (role: string) => {
    window.open(`/?role=${role}`, '_blank');
  };

  // Find all active sessions in localStorage
  const activeSessions = ['student', 'teacher', 'admin', 'developer'].filter(
    r => localStorage.getItem(`proctor_session_user_${r}`) !== null
  );

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 transition-colors duration-300">
      
      {/* SIMULTANEOUS SESSIONS CONTROLS TOP BAR */}
      {activeSessions.length > 1 && (
        <div className="bg-slate-900 text-slate-100 text-[11px] px-6 py-2 flex flex-wrap items-center justify-between border-b border-slate-800 font-mono tracking-tight z-50 relative select-none">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="font-bold text-slate-300">Simultaneous Session Hub:</span>
            <span className="text-slate-400 hidden sm:inline">Act as multiple user roles concurrently for live testing.</span>
          </div>
          <div className="flex items-center space-x-3 mt-1 sm:mt-0">
            {['student', 'teacher', 'admin', 'developer'].map(r => {
              const sessionUserRaw = localStorage.getItem(`proctor_session_user_${r}`);
              if (!sessionUserRaw) return null;
              const sessionUser = JSON.parse(sessionUserRaw);
              const isActive = activeRole === r;
              return (
                <div key={r} className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] ${isActive ? 'bg-indigo-950/70 border-indigo-600 text-indigo-200 font-bold' : 'bg-slate-800/80 border-slate-700/60 text-slate-300'}`}>
                  <span className="capitalize text-slate-400 font-medium">{r}:</span>
                  <span className="max-w-[90px] truncate">{sessionUser.name}</span>
                  {!isActive ? (
                    <div className="flex items-center space-x-1 ml-1.5">
                      <button
                        onClick={() => handleSwitchActiveRole(r)}
                        className="bg-slate-700 hover:bg-slate-600 px-1.5 py-0.5 rounded text-[9px] font-semibold text-slate-100 active:scale-95 transition"
                        title="Switch this window to this role"
                      >
                        Switch
                      </button>
                      <button
                        onClick={() => handleOpenRoleInNewTab(r)}
                        className="bg-indigo-600 hover:bg-indigo-500 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white active:scale-95 transition"
                        title="Open this role in a new browser tab for side-by-side verification"
                      >
                        New Tab ↗
                      </button>
                    </div>
                  ) : (
                    <span className="bg-indigo-500 text-white text-[8px] px-1 py-0.2 rounded font-bold uppercase tracking-wider">active</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GLOBAL FLOATING THEME SELECTOR AND SOURCE CODE DOWNLOAD BUTTONS */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3">
        <a
          href="/api/export-project"
          download="smart-exam-proctoring-source.zip"
          className="px-4 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-2 border border-indigo-500/30"
          title="Download Complete Project Source Code (.zip)"
          id="export-source-button"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline font-bold">Download Code (.zip)</span>
        </a>

        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
          aria-label="Toggle theme mode"
          id="theme-switcher-button"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-amber-400" />}
        </button>
      </div>

      {/* DASHBOARD ROUTER AREA */}
      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} showToast={showToast} />
      ) : (
        <div className="animate-fadeIn">
          {user.role === 'student' && (
            <StudentDashboard user={user} onLogout={handleLogout} showToast={showToast} />
          )}
          {user.role === 'teacher' && (
            <TeacherDashboard user={user} onLogout={handleLogout} showToast={showToast} />
          )}
          {user.role === 'admin' && (
            <AdminDashboard user={user} onLogout={handleLogout} showToast={showToast} />
          )}
          {user.role === 'developer' && (
            <DeveloperDashboard user={user} onLogout={handleLogout} showToast={showToast} />
          )}
        </div>
      )}

      {/* GLOBAL TOAST BANNER OVERLAY CONTAINER */}
      <div className="fixed top-24 right-6 z-50 space-y-3 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center justify-between transition-all duration-300 animate-slideIn ${
              t.type === 'success'
                ? 'bg-emerald-500 text-white border-emerald-600'
                : t.type === 'error'
                ? 'bg-rose-500 text-white border-rose-600'
                : 'bg-indigo-600 text-white border-indigo-700'
            }`}
          >
            <span>{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
              className="ml-3 text-white/75 hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainAppShell />
    </ThemeProvider>
  );
}
