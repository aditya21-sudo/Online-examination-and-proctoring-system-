/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, Classroom, Exam, Question, ExamSession, ProctoringLog } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Plus,
  BookOpen,
  ClipboardList,
  Tv,
  BarChart3,
  CheckCircle2,
  AlertOctagon,
  Video,
  Play,
  Pause,
  StopCircle,
  Eye,
  EyeOff,
  UserCheck,
  Award,
  BookMarked,
  Download,
  Terminal,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onLogout, showToast }) => {
  const [activeTab, setActiveTab] = useState<'classrooms' | 'exams' | 'live' | 'analytics'>('classrooms');

  // Lists
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  // Selected entities for detail views
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [liveSessions, setLiveSessions] = useState<ExamSession[]>([]);
  const [liveLogs, setLiveLogs] = useState<ProctoringLog[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Classroom Creation
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [showCreateClass, setShowCreateClass] = useState(false);

  // Exam Creation
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examDesc, setExamDesc] = useState('');
  const [examClassroomId, setExamClassroomId] = useState('');
  const [examJoinCode, setExamJoinCode] = useState('');
  const [examDuration, setExamDuration] = useState('60');
  const [examTotalMarks, setExamTotalMarks] = useState('50');
  const [examWarningLimit, setExamWarningLimit] = useState('4');
  const [examWarningDeduction, setExamWarningDeduction] = useState('0.15');
  const [examAutoDeduct, setExamAutoDeduct] = useState(true);
  const [examScheduledDate, setExamScheduledDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [examScheduledTime, setExamScheduledTime] = useState('10:00 AM');
  const [examJoinCodeRequired, setExamJoinCodeRequired] = useState(true);

  const generateRandomJoinCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleOpenCreateExam = () => {
    setExamJoinCode(generateRandomJoinCode());
    setShowCreateExam(prev => !prev);
  };

  // Question Creation
  const [selectedExamForQuestions, setSelectedExamForQuestions] = useState<Exam | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'mcq' | 'checkbox' | 'text'>('mcq');
  const [questionOptions, setQuestionOptions] = useState<string[]>(['', '', '', '']);
  const [questionCorrectAnswer, setQuestionCorrectAnswer] = useState('');
  const [questionMarks, setQuestionMarks] = useState('5');
  const [bulkQuestionsInput, setBulkQuestionsInput] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);

  const sseRef = useRef<EventSource | null>(null);

  // Load classrooms and exams
  useEffect(() => {
    fetchClassrooms();
    fetchExams();
  }, [user.id]);

  // Live sessions poller/updater
  useEffect(() => {
    if (activeTab === 'live' && selectedExamId) {
      fetchLiveSessionsAndLogs();
      const interval = setInterval(fetchLiveSessionsAndLogs, 3500);
      return () => clearInterval(interval);
    }
  }, [activeTab, selectedExamId]);

  // Analytics loader
  useEffect(() => {
    if (activeTab === 'analytics' && selectedExamId) {
      fetchAnalytics();
    }
  }, [activeTab, selectedExamId]);

  // Setup SSE stream on Mount to receive proctor warnings instantly!
  useEffect(() => {
    if (!sseRef.current) {
      const sseUrl = `/api/realtime/stream?userId=${user.id}&role=${user.role}`;
      const source = new EventSource(sseUrl);

      source.addEventListener('proctorWarning', (e: any) => {
        try {
          const warning = JSON.parse(e.data);
          // Show interactive popup alert instantly
          showToast(
            `ALERT: ${warning.studentName} flagged [${warning.log.type.toUpperCase()}]! Description: ${warning.log.description}`,
            'error'
          );

          // Update live state if watching that exam
          if (selectedExamId === warning.examId) {
            fetchLiveSessionsAndLogs();
          }
        } catch (err) {
          console.error('SSE warnings error:', err);
        }
      });

      source.addEventListener('studentPresence', (e: any) => {
        try {
          const update = JSON.parse(e.data);
          showToast(`Student update: ${update.studentName || 'Student'} is now ${update.status}`, 'info');
          if (selectedExamId === update.examId) {
            fetchLiveSessionsAndLogs();
          }
        } catch (err) {
          console.error(err);
        }
      });

      sseRef.current = source;
    }

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [user.id, selectedExamId]);

  const fetchClassrooms = async () => {
    try {
      const res = await fetch(`/api/classrooms?userId=${user.id}&role=teacher`);
      const data = await res.json();
      setClassrooms(data);
      if (data.length > 0) setExamClassroomId(data[0].id);
    } catch (err) {
      showToast('Error loading classrooms.', 'error');
    }
  };

  const fetchExams = async () => {
    try {
      const res = await fetch(`/api/exams?userId=${user.id}&role=teacher`);
      const data = await res.json();
      setExams(data);
      if (data.length > 0 && !selectedExamId) {
        setSelectedExamId(data[0].id);
      }
    } catch (err) {
      showToast('Error loading exams.', 'error');
    }
  };

  const fetchLiveSessionsAndLogs = async () => {
    if (!selectedExamId) return;
    try {
      const sRes = await fetch(`/api/exams/${selectedExamId}/sessions`);
      const sData = await sRes.json();
      setLiveSessions(sData);

      const lRes = await fetch(`/api/exams/${selectedExamId}/proctoring-logs`);
      const lData = await lRes.json();
      setLiveLogs(lData);
    } catch (err) {
      console.error('Failed to load active exam room sessions:', err);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedExamId) return;
    try {
      const res = await fetch(`/api/exams/${selectedExamId}/analytics`);
      const data = await res.json();
      setAnalyticsData(data);
    } catch (err) {
      showToast('Error fetching exam statistics.', 'error');
    }
  };

  // Classroom creation
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !newClassCode) {
      showToast('All fields are required.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName,
          code: newClassCode,
          teacherId: user.id,
        }),
      });

      if (!res.ok) throw new Error('Failed to create classroom');

      showToast(`Classroom "${newClassName}" created successfully.`, 'success');
      setNewClassName('');
      setNewClassCode('');
      setShowCreateClass(false);
      fetchClassrooms();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Exam creation
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle || !examJoinCode || !examDuration || !examTotalMarks) {
      showToast('Required fields are missing.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: examTitle,
          description: examDesc,
          classroomId: examClassroomId,
          joinCode: examJoinCode,
          durationMinutes: examDuration,
          totalMarks: examTotalMarks,
          warningLimit: examWarningLimit,
          warningDeduction: examWarningDeduction,
          autoDeductionEnabled: examAutoDeduct,
          teacherId: user.id,
          scheduledDate: examScheduledDate,
          scheduledTime: examScheduledTime,
          joinCodeRequired: examJoinCodeRequired,
        }),
      });

      if (!res.ok) throw new Error('Failed to create exam');

      showToast('Exam created successfully! Now add questions.', 'success');
      setExamTitle('');
      setExamDesc('');
      setExamJoinCode('');
      setShowCreateExam(false);
      fetchExams();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Change exam status
  const handleUpdateExamStatus = async (examId: string, status: 'active' | 'paused' | 'ended') => {
    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error();

      showToast(`Exam status successfully changed to: [${status.toUpperCase()}]`, 'success');
      fetchExams();
    } catch (err) {
      showToast('Failed to update exam status.', 'error');
    }
  };

  // Release/Hide Results toggle
  const handleToggleResults = async (examId: string, currentReleased: boolean) => {
    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultsReleased: !currentReleased }),
      });

      if (!res.ok) throw new Error();

      showToast(
        !currentReleased ? 'Exam results successfully released to all students!' : 'Exam results are now hidden.',
        'success'
      );
      fetchExams();
    } catch (err) {
      showToast('Failed to change results visibility.', 'error');
    }
  };

  // Create individual question
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText || !selectedExamForQuestions || !questionMarks) {
      showToast('Please enter the question text.', 'error');
      return;
    }

    try {
      const filteredOptions = questionOptions.filter(o => o.trim() !== '');
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamForQuestions.id,
          text: questionText,
          type: questionType,
          options: filteredOptions,
          correctAnswer: questionCorrectAnswer,
          marks: questionMarks,
        }),
      });

      if (!res.ok) throw new Error();

      showToast('Question added successfully.', 'success');
      setQuestionText('');
      setQuestionCorrectAnswer('');
      setQuestionOptions(['', '', '', '']);
      // Refresh exam question counts
      fetchExams();
    } catch (err) {
      showToast('Failed to save question.', 'error');
    }
  };

  // Bulk import questions
  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkQuestionsInput || !selectedExamForQuestions) return;

    try {
      const parsed = JSON.parse(bulkQuestionsInput);
      const res = await fetch(`/api/exams/${selectedExamForQuestions.id}/questions/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Successfully imported ${data.count} questions.`, 'success');
      setBulkQuestionsInput('');
      setShowBulkImport(false);
      fetchExams();
    } catch (err: any) {
      showToast('Invalid JSON structure. Please verify formatting schema.', 'error');
    }
  };

  // Prep mockup JSON for bulk import helper
  const insertTemplateJSON = () => {
    const template = [
      {
        text: "What is the computational complexity of binary search?",
        type: "mcq",
        options: ["O(N)", "O(log N)", "O(N log N)", "O(1)"],
        correctAnswer: "O(log N)",
        marks: 5
      },
      {
        text: "Select all correct transport layer network protocols:",
        type: "checkbox",
        options: ["TCP", "UDP", "IP", "DNS"],
        correctAnswer: "[\"TCP\",\"UDP\"]",
        marks: 5
      }
    ];
    setBulkQuestionsInput(JSON.stringify(template, null, 2));
  };

  // Chart coloring variables
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* HEADER BAR */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg">Veritas Faculty</span>
            <span className="ml-2 text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold">
              Teacher Panel
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400 font-medium">
            Logged in: {user.name}
          </span>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* SIDE MENU (1 COL) */}
        <div className="md:col-span-1 space-y-2">
          <button
            onClick={() => setActiveTab('classrooms')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'classrooms'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Classrooms</span>
          </button>

          <button
            onClick={() => setActiveTab('exams')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'exams'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Exams & Questions</span>
          </button>

          <button
            onClick={() => setActiveTab('live')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'live'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <Tv className="h-4 w-4 animate-pulse" />
            <span>Live Monitoring</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Performance Analytics</span>
          </button>
        </div>

        {/* WORKSPACE AREA (4 COLS) */}
        <div className="md:col-span-4 space-y-6">
          {/* TAB 1: CLASSROOM MANAGEMENT */}
          {activeTab === 'classrooms' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Classroom Registry</h2>
                  <p className="text-xs text-slate-500">Manage virtual classrooms and invite links</p>
                </div>

                <button
                  onClick={() => setShowCreateClass(!showCreateClass)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Classroom</span>
                </button>
              </div>

              {showCreateClass && (
                <form onSubmit={handleCreateClass} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md max-w-md space-y-4">
                  <h3 className="font-semibold text-sm">New Classroom configuration</h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Classroom Name</label>
                    <input
                      type="text"
                      required
                      value={newClassName}
                      onChange={e => setNewClassName(e.target.value)}
                      placeholder="E.g. Computer Science Midterm (CS101)"
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 mt-1 text-xs focus:ring-1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase">Enrollment Join Code</label>
                    <input
                      type="text"
                      required
                      value={newClassCode}
                      onChange={e => setNewClassCode(e.target.value)}
                      placeholder="E.g. COMSCI2026"
                      className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 mt-1 text-xs uppercase"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateClass(false)}
                      className="px-4 py-2 border rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                    >
                      Save Classroom
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classrooms.map(c => (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative transition duration-300 hover:border-indigo-400"
                  >
                    <div className="absolute top-4 right-4 text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-indigo-600 dark:text-indigo-400 font-bold">
                      {c.code}
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white pr-20">{c.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Instructor: {c.teacherName}</p>
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500">
                      Created: {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: EXAMS & QUESTION MANAGERS */}
          {activeTab === 'exams' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Exam Builder & Questions</h2>
                  <p className="text-xs text-slate-500">Draft examinations, define warning rules, and assign questions</p>
                </div>

                <button
                  onClick={handleOpenCreateExam}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Exam</span>
                </button>
              </div>

              {/* CREATE EXAM ACCORDION */}
              {showCreateExam && (
                <form onSubmit={handleCreateExam} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md space-y-4 max-w-2xl">
                  <h3 className="font-bold text-sm">New Exam configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Exam Title</label>
                      <input
                        type="text"
                        required
                        value={examTitle}
                        onChange={e => setExamTitle(e.target.value)}
                        placeholder="E.g. Final Computer Networks Examination"
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Description</label>
                      <textarea
                        value={examDesc}
                        onChange={e => setExamDesc(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs"
                        placeholder="Key specifications for candidates"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Select Classroom</label>
                      <select
                        value={examClassroomId}
                        onChange={e => setExamClassroomId(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs mt-1"
                      >
                        {classrooms.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Join Code (Students join by this)</label>
                      <input
                        type="text"
                        required
                        value={examJoinCode}
                        onChange={e => setExamJoinCode(e.target.value)}
                        placeholder="E.g. AIML2026X8"
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs mt-1 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Duration (Minutes)</label>
                      <input
                        type="number"
                        required
                        value={examDuration}
                        onChange={e => setExamDuration(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Total Marks</label>
                      <input
                        type="number"
                        required
                        value={examTotalMarks}
                        onChange={e => setExamTotalMarks(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Proctor Warning Limit</label>
                      <input
                        type="number"
                        required
                        value={examWarningLimit}
                        onChange={e => setExamWarningLimit(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Infraction Deduction Marks</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={examWarningDeduction}
                        onChange={e => setExamWarningDeduction(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Scheduled Date</label>
                      <input
                        type="date"
                        required
                        value={examScheduledDate}
                        onChange={e => setExamScheduledDate(e.target.value)}
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Scheduled Time</label>
                      <input
                        type="text"
                        required
                        value={examScheduledTime}
                        onChange={e => setExamScheduledTime(e.target.value)}
                        placeholder="E.g. 10:00 AM"
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs mt-1"
                      />
                    </div>

                    <div className="col-span-2 flex items-center">
                      <input
                        type="checkbox"
                        id="join-code-req"
                        checked={examJoinCodeRequired}
                        onChange={e => setExamJoinCodeRequired(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="join-code-req" className="ml-2 block text-xs text-slate-600 dark:text-slate-400">
                        Require Join Code to start exam (If disabled, student can join directly from their exam list)
                      </label>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <input
                        type="checkbox"
                        id="auto-deduct"
                        checked={examAutoDeduct}
                        onChange={e => setExamAutoDeduct(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="auto-deduct" className="ml-2 block text-xs text-slate-600 dark:text-slate-400">
                        Enable automatic score deduction upon warning limit violation (e.g. deduct {examWarningDeduction} marks per violation after {examWarningLimit} warnings)
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateExam(false)}
                      className="px-4 py-2 border rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                    >
                      Save Exam
                    </button>
                  </div>
                </form>
              )}

              {/* LIST OF CREATED EXAMS */}
              <div className="space-y-4">
                {exams.map(e => (
                  <div
                    key={e.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-base text-slate-950 dark:text-slate-50">{e.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Classroom: {e.classroomName}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                            Join Code: {e.joinCode}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {e.durationMinutes} mins | {e.totalMarks} marks
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            Limit: {e.warningLimit} warns (-{e.warningDeduction} marks)
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {e.questionsCount} questions
                          </span>
                        </div>
                      </div>

                      {/* STATS STATUS */}
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
                        e.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : e.status === 'paused'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          : e.status === 'ended'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
                      }`}>
                        {e.status}
                      </span>
                    </div>

                    {/* ACTIONS BAR */}
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-2 justify-between items-center">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setSelectedExamForQuestions(e)}
                          className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-semibold hover:bg-slate-50 flex items-center space-x-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Manage Questions</span>
                        </button>

                        <button
                          onClick={() => handleToggleResults(e.id, e.resultsReleased)}
                          className={`px-3 py-1.5 border rounded-xl text-[11px] font-semibold flex items-center space-x-1 ${
                            e.resultsReleased
                              ? 'border-blue-200 bg-blue-50/50 text-blue-600'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          {e.resultsReleased ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          <span>{e.resultsReleased ? 'Hide Results' : 'Release Results'}</span>
                        </button>
                      </div>

                      <div className="flex gap-1.5">
                        {e.status !== 'active' && e.status !== 'ended' && (
                          <button
                            onClick={() => handleUpdateExamStatus(e.id, 'active')}
                            className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-[11px] font-bold flex items-center space-x-1"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>Start Exam</span>
                          </button>
                        )}

                        {e.status === 'active' && (
                          <button
                            onClick={() => handleUpdateExamStatus(e.id, 'paused')}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold flex items-center space-x-1"
                          >
                            <Pause className="h-3.5 w-3.5" />
                            <span>Pause Exam</span>
                          </button>
                        )}

                        {e.status === 'paused' && (
                          <button
                            onClick={() => handleUpdateExamStatus(e.id, 'active')}
                            className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-[11px] font-bold flex items-center space-x-1"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>Resume Exam</span>
                          </button>
                        )}

                        {e.status !== 'ended' && e.status !== 'draft' && (
                          <button
                            onClick={() => handleUpdateExamStatus(e.id, 'ended')}
                            className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-[11px] font-bold flex items-center space-x-1"
                          >
                            <StopCircle className="h-3.5 w-3.5" />
                            <span>End Exam</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* QUESTIONS SETTINGS DRAWER MODAL */}
              {selectedExamForQuestions && (
                <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
                    <button
                      onClick={() => setSelectedExamForQuestions(null)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ✕
                    </button>

                    <h3 className="font-bold text-lg mb-2">Manage Exam Questions</h3>
                    <p className="text-xs text-slate-400 mb-6">{selectedExamForQuestions.title}</p>

                    <div className="flex border-b border-slate-100 dark:border-slate-800/80 mb-6">
                      <button
                        onClick={() => setShowBulkImport(false)}
                        className={`pb-2.5 text-xs font-bold mr-6 ${
                          !showBulkImport ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'
                        }`}
                      >
                        Individual Builder
                      </button>
                      <button
                        onClick={() => setShowBulkImport(true)}
                        className={`pb-2.5 text-xs font-bold ${
                          showBulkImport ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'
                        }`}
                      >
                        Bulk JSON Importer
                      </button>
                    </div>

                    {showBulkImport ? (
                      /* BULK IMPORTER */
                      <form onSubmit={handleBulkImport} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-500 uppercase">Questions List (JSON Array format)</label>
                          <button
                            type="button"
                            onClick={insertTemplateJSON}
                            className="text-[10px] font-bold text-indigo-600 hover:underline"
                          >
                            Insert Demo Template Schema
                          </button>
                        </div>
                        <textarea
                          rows={8}
                          required
                          value={bulkQuestionsInput}
                          onChange={e => setBulkQuestionsInput(e.target.value)}
                          placeholder='[{"text": "Sample MCQ question?", "type": "mcq", "options": ["A", "B", "C"], "correctAnswer": "A", "marks": 5}]'
                          className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 font-mono text-[11px] focus:ring-1"
                        />
                        <button
                          type="submit"
                          className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                        >
                          Process Bulk Upload
                        </button>
                      </form>
                    ) : (
                      /* INDIVIDUAL BUILDER */
                      <form onSubmit={handleCreateQuestion} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase">Question Text</label>
                          <input
                            type="text"
                            required
                            value={questionText}
                            onChange={e => setQuestionText(e.target.value)}
                            placeholder="Type the full candidate question context"
                            className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase">Question Type</label>
                            <select
                              value={questionType}
                              onChange={e => setQuestionType(e.target.value as any)}
                              className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs mt-1"
                            >
                              <option value="mcq">MCQ (Single choice)</option>
                              <option value="checkbox">Checkbox (Multi choice)</option>
                              <option value="text">Analytical Explanation (Text)</option>
                            </select>
                          </div>

                          <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 uppercase">Correct Answer Value</label>
                            <input
                              type="text"
                              required
                              value={questionCorrectAnswer}
                              onChange={e => setQuestionCorrectAnswer(e.target.value)}
                              placeholder={
                                questionType === 'checkbox'
                                  ? 'JSON array like: ["Option 1","Option 3"]'
                                  : 'Specify exact text matches'
                              }
                              className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs mt-1"
                            />
                          </div>
                        </div>

                        {questionType !== 'text' && (
                          <div className="space-y-2">
                            <label className="block text-xs font-semibold text-slate-500 uppercase">Options Configuration</label>
                            <div className="grid grid-cols-2 gap-2">
                              {questionOptions.map((opt, i) => (
                                <input
                                  key={i}
                                  type="text"
                                  value={opt}
                                  onChange={e => {
                                    const next = [...questionOptions];
                                    next[i] = e.target.value;
                                    setQuestionOptions(next);
                                  }}
                                  placeholder={`Option ${i + 1}`}
                                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold text-slate-500 uppercase">Question weight (Marks)</label>
                          <input
                            type="number"
                            required
                            value={questionMarks}
                            onChange={e => setQuestionMarks(e.target.value)}
                            className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-xs mt-1"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md"
                        >
                          Save Question Item
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIVE PROCTOR MONITORING */}
          {activeTab === 'live' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Veritas Proctor Monitor</h2>
                  <p className="text-xs text-slate-500">Continuous feed of candidates taking active examinations</p>
                </div>

                {/* SELECTOR */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Exam Room:</span>
                  <select
                    value={selectedExamId}
                    onChange={e => setSelectedExamId(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs"
                  >
                    <option value="">Choose Exam Room</option>
                    {exams.map(ex => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} [{ex.joinCode}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedExamId ? (
                <div className="text-center p-12 bg-white dark:bg-slate-900 border rounded-2xl text-slate-400">
                  Select an active exam room from the filter menu to begin proctoring.
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* STUDENTS LIST FEED GRID (2 COLS) */}
                  <div className="xl:col-span-2 space-y-4">
                    <h3 className="font-bold text-sm">Active Candidates ({liveSessions.length})</h3>

                    {liveSessions.length === 0 ? (
                      <div className="p-12 text-center bg-white dark:bg-slate-900 border rounded-2xl text-slate-400">
                        No students are currently logged in or actively taking this exam.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {liveSessions.map(sess => (
                          <div
                            key={sess.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-bold text-xs truncate max-w-[140px] block">
                                {sess.studentName}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                                sess.status === 'submitted'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-blue-100 dark:bg-blue-950 text-blue-800'
                              }`}>
                                {sess.status}
                              </span>
                            </div>

                            {/* USER WEBCAM MINI PREVIEW GRAPHIC */}
                            <div className="aspect-video bg-slate-950 rounded-lg relative overflow-hidden border border-slate-800">
                              <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
                              <div className="absolute inset-0 border border-dashed border-indigo-500/20 m-2" />

                              {/* Student Avatar Icon simulation */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-slate-400">
                                <Video className="h-6 w-6 text-slate-600 animate-bounce mb-1" />
                                <span className="text-[10px]">Active feed (Webcam OK)</span>
                              </div>

                              <div className="absolute bottom-2 left-2 text-[9px] font-mono bg-indigo-600 text-white px-1 py-0.5 rounded uppercase">
                                Fingerprint Match
                              </div>
                            </div>

                            {/* CANDIDATE PROGRESS STATS */}
                            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] border-t border-slate-100 dark:border-slate-800/60 pt-3">
                              <div>
                                <span className="text-slate-400 block">Progress</span>
                                <span className="font-bold">{sess.progress}%</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Warnings</span>
                                <span className={`font-bold ${sess.warningCount > 3 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {sess.warningCount}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Score / Ded</span>
                                <span className="font-bold">
                                  {sess.status === 'submitted' ? `${sess.finalScore} pt` : `-${sess.marksDeducted}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PROCTOR INFRAC LOGS PANEL (1 COL) */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm">Proctor Incident Logs ({liveLogs.length})</h3>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 max-h-[500px] overflow-y-auto space-y-3">
                      {liveLogs.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6">No proctoring warning incidents recorded yet.</p>
                      ) : (
                        liveLogs.map(log => (
                          <div
                            key={log.id}
                            className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs space-y-1 relative"
                          >
                            <span className="absolute top-2.5 right-2.5 text-[9px] text-slate-400 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="font-bold text-slate-950 dark:text-slate-100 block">{log.studentName}</span>
                            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide block">
                              Infraction: {log.type.replace('_', ' ')}
                            </span>
                            <p className="text-slate-600 dark:text-slate-400 leading-normal">{log.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PERFORMANCE ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Exam Results & Data Analysis</h2>
                  <p className="text-xs text-slate-500">Student grade charts, infraction counts, and rankings</p>
                </div>

                <select
                  value={selectedExamId}
                  onChange={e => setSelectedExamId(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs"
                >
                  <option value="">Select Exam</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title}
                    </option>
                  ))}
                </select>
              </div>

              {!analyticsData ? (
                <div className="text-center p-12 bg-white dark:bg-slate-900 border rounded-2xl text-slate-400">
                  Select an exam to load interactive analytical statistics reports.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* TOP KPI NUMBERS */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
                      <span className="text-xs text-slate-400 font-semibold block mb-1">Average Score</span>
                      <span className="text-2xl font-black text-indigo-600">{analyticsData.averageScore}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
                      <span className="text-xs text-slate-400 font-semibold block mb-1">Highest Score</span>
                      <span className="text-2xl font-black text-emerald-600">{analyticsData.highestScore}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
                      <span className="text-xs text-slate-400 font-semibold block mb-1">Total Attendees</span>
                      <span className="text-2xl font-black text-blue-600">{analyticsData.totalAttendees}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
                      <span className="text-xs text-slate-400 font-semibold block mb-1">Completion Rate</span>
                      <span className="text-2xl font-black text-violet-600">{analyticsData.completionRate}%</span>
                    </div>
                  </div>

                  {/* CHART GRAPHS */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* GRADE DISTRIBUTION CHART */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
                      <h3 className="font-bold text-sm mb-4">Grade Distribution Curve</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData.rankings}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="studentName" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="score" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* INFRACTIONS CHART */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
                      <h3 className="font-bold text-sm mb-4">AI Incident Infraction Types</h3>
                      <div className="h-64 flex items-center justify-center">
                        {Object.keys(analyticsData.warningFrequencies).length === 0 ? (
                          <span className="text-xs text-slate-400">Zero incidents flagged during this examination!</span>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={Object.keys(analyticsData.warningFrequencies).map(key => ({
                                  name: key.toUpperCase().replace('_', ' '),
                                  value: analyticsData.warningFrequencies[key],
                                }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {Object.keys(analyticsData.warningFrequencies).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* STUDENT RANKINGS TABLES */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                    <h3 className="font-bold text-sm mb-4">Leaderboard & Rankings</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                            <th className="py-2.5 font-semibold">Rank</th>
                            <th className="py-2.5 font-semibold">Name</th>
                            <th className="py-2.5 font-semibold">Security Warnings</th>
                            <th className="py-2.5 font-semibold text-right">Score obtained</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.rankings.map((r: any, idx: number) => (
                            <tr key={r.studentId} className="border-b border-slate-50 dark:border-slate-800/50">
                              <td className="py-3 font-bold text-indigo-600">#{idx + 1}</td>
                              <td className="py-3 font-semibold">{r.studentName}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded font-bold ${
                                  r.warnings > 3 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 dark:bg-slate-800'
                                }`}>
                                  {r.warnings} Warnings
                                </span>
                              </td>
                              <td className="py-3 text-right font-black text-emerald-600">{r.score} Pts</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
