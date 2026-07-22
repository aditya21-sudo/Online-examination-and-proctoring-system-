/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Shield, Users, Settings, History, Trash2, CheckCircle, RefreshCw, KeyRound } from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, showToast }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'audit'>('users');
  const [userList, setUserList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Configuration settings
  const [warningLimit, setWarningLimit] = useState('4');
  const [deductionMarks, setDeductionMarks] = useState('0.15');
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUserList(data);
    } catch (err) {
      showToast('Error loading user directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      setAuditLogs(data);
    } catch (err) {
      console.error('Audit logs fetch failed:', err);
    }
  };

  const handleDeleteUser = async (userId: string, targetRole: string) => {
    if (userId === user.id) {
      showToast('You cannot delete your own Administrator account.', 'error');
      return;
    }
    if (targetRole === 'developer') {
      showToast('Developer account cannot be deleted.', 'error');
      return;
    }

    if (!window.confirm('Are you absolutely sure you want to permanently delete this user? This action is completely irreversible.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();

      showToast('User deleted successfully.', 'success');
      fetchUsers();
    } catch (err) {
      showToast('Failed to delete user.', 'error');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Platform security configuration parameters saved successfully.', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* HEADER BAR */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-lg text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">Veritas Admin</span>
            <span className="ml-2 text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-bold">
              Administrator Panel
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-3 py-1.5 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold transition animate-pulse"
        >
          Logout
        </button>
      </nav>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* SIDE MENU (1 COL) */}
        <div className="md:col-span-1 space-y-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Manage Users</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <History className="h-4 w-4" />
            <span>System Audit Logs</span>
          </button>
        </div>

        {/* WORKSPACE AREA (4 COLS) */}
        <div className="md:col-span-4 space-y-6">
          {/* TAB 1: USERS DIRECTORY */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">User Directory</h2>
                <p className="text-xs text-slate-500">Authorize, monitor, or remove teachers and student credentials</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                        <th className="py-3 px-4 font-semibold">User Details</th>
                        <th className="py-3 px-4 font-semibold">Institution / Enrollment ID</th>
                        <th className="py-3 px-4 font-semibold">Role Designation</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                            <span>Loading user records...</span>
                          </td>
                        </tr>
                      ) : userList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            No registered users found.
                          </td>
                        </tr>
                      ) : (
                        userList.map(u => (
                          <tr key={u.id} className="border-b border-slate-50 dark:border-slate-800/40">
                            <td className="py-4 px-4">
                              <span className="font-bold text-slate-900 dark:text-white block">{u.name}</span>
                              <span className="text-[11px] text-slate-400 block">{u.email}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-slate-700 dark:text-slate-300 block font-medium">{u.institution}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">{u.studentTeacherId}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full font-semibold capitalize text-[10px] ${
                                u.role === 'admin'
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                                  : u.role === 'teacher'
                                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300'
                                  : u.role === 'developer'
                                  ? 'bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => handleDeleteUser(u.id, u.role)}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg transition"
                                title="Delete user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLATFORM CONFIGURATION */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">System Configuration</h2>
                <p className="text-xs text-slate-500">Manage global threshold parameters and proctor settings</p>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm max-w-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Global Warning Limit</label>
                    <input
                      type="number"
                      value={warningLimit}
                      onChange={e => setWarningLimit(e.target.value)}
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Warning Deduction Marks</label>
                    <input
                      type="number"
                      step="0.01"
                      value={deductionMarks}
                      onChange={e => setDeductionMarks(e.target.value)}
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 mt-1 text-xs"
                    />
                  </div>

                  <div className="col-span-2 flex items-center pt-2">
                    <input
                      type="checkbox"
                      id="2fa"
                      checked={twoFactorAuth}
                      onChange={e => setTwoFactorAuth(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="2fa" className="ml-2 block text-xs text-slate-600 dark:text-slate-400">
                      Enforce secure multi-device fingerprint checks on candidate joins
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition"
                  >
                    Save System Settings
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SYSTEM AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">System Audit Logs</h2>
                <p className="text-xs text-slate-500">Decentralized, un-modifiable records of all security and exam actions</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 max-h-[500px] overflow-y-auto space-y-3 font-mono text-[11px]">
                {auditLogs.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No audit trail records present.</p>
                ) : (
                  auditLogs.map(log => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1 relative"
                    >
                      <span className="absolute top-2.5 right-2.5 text-[9px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        [{log.action}] by {log.userName}
                      </span>
                      <p className="text-slate-500 leading-normal">{log.details}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
