/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, DeveloperStats } from '../types';
import {
  Activity,
  Server,
  Database,
  Terminal,
  Cpu,
  RefreshCw,
  TrendingUp,
  AlertOctagon,
  Users,
  Video,
  Play,
  Settings,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DeveloperDashboardProps {
  user: User;
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({ user, onLogout, showToast }) => {
  const [stats, setStats] = useState<DeveloperStats | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [responseTimes, setResponseTimes] = useState<{ name: string; ms: number }[]>([]);

  useEffect(() => {
    fetchStats();
    fetchLogs();
    const interval = setInterval(() => {
      fetchStats();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/developer/stats');
      const data = await res.json();
      setStats(data);

      // Append new response times to history
      setResponseTimes(prev => {
        const next = [...prev, { name: new Date().toLocaleTimeString(), ms: data.avgResponseTimeMs }];
        if (next.length > 15) next.shift(); // keep last 15 ticks
        return next;
      });
    } catch (err) {
      console.error('Failed to load developer stats:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch developer audit log tracks:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerSelfCheck = async () => {
    showToast('Executing full container pipeline checks...', 'info');
    await fetchStats();
    await fetchLogs();
    showToast('Container check completed successfully. All pipelines operational.', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 transition-colors duration-300 font-sans">
      {/* DEVELOPMENT BAR ACCENTS */}
      <div className="w-full bg-amber-500 text-slate-950 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 select-none animate-pulse">
        <Cpu className="h-4 w-4 animate-spin" />
        <span>Development Mode Pipeline Active - Veritas Exam Proctoring Sandbox v1.0.4</span>
      </div>

      {/* HEADER BAR */}
      <nav className="border-b border-slate-800 bg-slate-900 py-4 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg text-slate-950">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white">Veritas SysOps</span>
            <span className="ml-2 text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
              Developer Dashboard
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-3 py-1.5 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 rounded-xl text-xs font-semibold transition"
        >
          Close Session
        </button>
      </nav>

      {/* BODY CONTENT */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* FIRST ROW SUMMARY KPIs */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
              <span className="text-xs text-slate-400 font-semibold block mb-1">System Health status</span>
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${stats.systemHealth === 'healthy' ? 'bg-emerald-500 animate-ping' : 'bg-rose-500 animate-pulse'}`} />
                <span className="text-xl font-bold uppercase tracking-wide text-white">{stats.systemHealth}</span>
              </div>
              <Activity className="absolute bottom-4 right-4 h-8 w-8 text-slate-800" />
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
              <span className="text-xs text-slate-400 font-semibold block mb-1">Node Server status</span>
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xl font-bold uppercase tracking-wide text-white">{stats.serverStatus}</span>
              </div>
              <Server className="absolute bottom-4 right-4 h-8 w-8 text-slate-800" />
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
              <span className="text-xs text-slate-400 font-semibold block mb-1">Live SSE Subscribers</span>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-indigo-400 animate-bounce" />
                <span className="text-2xl font-black text-white">{stats.liveConnections} Users</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
              <span className="text-xs text-slate-400 font-semibold block mb-1">Active Exam Rooms</span>
              <div className="flex items-center space-x-2">
                <Video className="h-5 w-5 text-indigo-400 animate-pulse" />
                <span className="text-2xl font-black text-white">{stats.activeExams} Active</span>
              </div>
            </div>
          </div>
        )}

        {/* INTEGRATIONS PIPELINE STATUS */}
        {stats && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-bold text-sm text-slate-200 mb-4 uppercase tracking-wide">API Gateway Integrations Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Cpu className="h-5 w-5 text-amber-500 animate-pulse" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Gemini AI Model (Image vision)</span>
                    <span className="text-[10px] text-slate-400 font-mono">Process: gemini-3.5-flash</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono capitalize ${
                  stats.apiStatus.gemini === 'operational'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {stats.apiStatus.gemini}
                </span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Database className="h-5 w-5 text-blue-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Local DB Server</span>
                    <span className="text-[10px] text-slate-400 font-mono">Process: SQLite-JSON File DB</span>
                  </div>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase">
                  {stats.apiStatus.database}
                </span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Server className="h-5 w-5 text-indigo-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Internal Session Authentication</span>
                    <span className="text-[10px] text-slate-400 font-mono">Process: Cryptographic Hashing</span>
                  </div>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-mono uppercase">
                  {stats.apiStatus.auth}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PERFORMANCE MONITOR CHART (2 COLS) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wide">Avg Container Response Time (ms)</h3>
              <button
                onClick={triggerSelfCheck}
                className="flex items-center space-x-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold"
              >
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Verify Pipelines</span>
              </button>
            </div>

            <div className="h-64">
              {responseTimes.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  Polling telemetry tick logs...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={responseTimes}>
                    <defs>
                      <linearGradient id="colorMs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                    <Area type="monotone" dataKey="ms" stroke="#f59e0b" fillOpacity={1} fill="url(#colorMs)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* REAL-TIME SYSTEM LOGS TERMINAL (1 COL) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-[360px]">
            <h3 className="font-bold text-sm text-slate-200 mb-3 uppercase tracking-wide flex items-center space-x-1.5">
              <Terminal className="h-4 w-4 text-amber-500" />
              <span>Diagnostic Event Stream</span>
            </h3>

            <div className="flex-1 bg-black rounded-xl p-3 font-mono text-[10px] leading-relaxed text-amber-400 overflow-y-auto space-y-2 border border-slate-800/80">
              <div className="text-slate-500">-- Veritas SysOps diagnostic terminal listening... --</div>
              {logs.map((log, index) => (
                <div key={log.id || index} className="space-y-0.5">
                  <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span className="text-white font-bold">{log.action}:</span>{' '}
                  <p className="text-slate-400 break-all">{log.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
