/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, Exam, Question, ExamSession, Answer } from '../types';
import {
  LogOut,
  Play,
  Clock,
  User as UserIcon,
  Wifi,
  Video,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle,
  HelpCircle,
  Camera,
  RotateCcw,
  Fingerprint,
  BookOpen,
  Calendar,
  Plus,
  RefreshCw,
  Award,
  Users,
  FileText,
  X,
  Check,
  ClipboardList,
} from 'lucide-react';

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onLogout, showToast }) => {
  const [joinCode, setJoinCode] = useState('');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Exam States
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(3600); // in seconds
  const [isExamActive, setIsExamActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Available Exams State
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [fetchingExams, setFetchingExams] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Classroom and Navigation States
  const [activeTab, setActiveTab] = useState<'exams' | 'classrooms' | 'results'>('exams');
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [fetchingClassrooms, setFetchingClassrooms] = useState(false);
  const [classroomJoinCode, setClassroomJoinCode] = useState('');

  // Student Results States
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [fetchingResults, setFetchingResults] = useState(false);
  const [detailedSubmission, setDetailedSubmission] = useState<any | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Fetch student college exams, classrooms & results on load / when active exam changes
  useEffect(() => {
    if (!activeExam) {
      fetchAvailableExams();
      fetchClassrooms();
      fetchStudentResults();
    }
  }, [activeExam, activeTab]);

  const fetchStudentResults = async () => {
    setFetchingResults(true);
    try {
      const res = await fetch(`/api/results/student/${user.id}`);
      const data = await res.json();
      if (res.ok) {
        setStudentResults(data);
      }
    } catch (err) {
      console.error('Failed to load student results:', err);
    } finally {
      setFetchingResults(false);
    }
  };

  const fetchResultDetails = async (submissionId: string) => {
    setFetchingDetails(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch details');
      setDetailedSubmission(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFetchingDetails(false);
    }
  };

  const fetchAvailableExams = async () => {
    setFetchingExams(true);
    try {
      const res = await fetch(`/api/exams?userId=${user.id}&role=student`);
      const data = await res.json();
      setAvailableExams(data);
    } catch (err) {
      console.error('Failed to load available exams:', err);
    } finally {
      setFetchingExams(false);
    }
  };

  const fetchClassrooms = async () => {
    setFetchingClassrooms(true);
    try {
      const res = await fetch(`/api/classrooms?userId=${user.id}&role=student`);
      const data = await res.json();
      setClassrooms(data);
    } catch (err) {
      console.error('Failed to load classrooms:', err);
    } finally {
      setFetchingClassrooms(false);
    }
  };

  const handleJoinClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroomJoinCode.trim()) {
      showToast('Classroom code is required.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/classrooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          code: classroomJoinCode.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join classroom');
      }

      showToast(`Successfully enrolled in classroom: "${data.classroom.name}"!`, 'success');
      setClassroomJoinCode('');
      fetchClassrooms();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Check URL query parameters for instant Join Code link matching
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setJoinCode(code.toUpperCase());
      showToast(`Automatically pre-filled join code from invitation link: ${code.toUpperCase()}`, 'info');
    }
  }, []);

  // Webcam States
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiProctorLog, setAiProctorLog] = useState<string>('Initializing local automated proctoring module...');

  // Device IDs for One-Device Policy
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('proctor_device_id');
    if (!id) {
      id = 'device_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('proctor_device_id', id);
    }
    return id;
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Initialize SSE for real-time notifications (e.g. Exam paused/ended by teacher)
  useEffect(() => {
    if (!sseRef.current) {
      const sseUrl = `/api/realtime/stream?userId=${user.id}&role=${user.role}`;
      const source = new EventSource(sseUrl);

      source.addEventListener('examStatusUpdate', (e: any) => {
        try {
          const update = JSON.parse(e.data);
          if (activeExam && update.examId === activeExam.id) {
            if (update.status === 'paused') {
              showToast('The teacher has paused this exam.', 'info');
              setIsExamActive(false);
            } else if (update.status === 'active') {
              showToast('The exam has been resumed.', 'success');
              setIsExamActive(true);
            } else if (update.status === 'ended') {
              showToast('The exam has been ended by the teacher. Automatically submitting.', 'info');
              handleSubmitExam(true);
            }
          }
        } catch (err) {
          console.error('Error parsing SSE event:', err);
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
  }, [user.id, activeExam]);

  // Handle Webcam Permission & Feed
  useEffect(() => {
    if (isExamActive) {
      enableWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [isExamActive]);

  const enableWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraPermission('granted');
    } catch (err) {
      console.error('Camera/Microphone access denied:', err);
      setCameraPermission('denied');
      showToast('Camera and microphone permissions are strictly required for AI Proctoring.', 'error');
      // Trigger instant warning for camera disabled
      triggerProctoringWarning('camera_disabled', 'Webcam / Microphone access was disabled or permission denied.');
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Secure Exam Mode Enforcements (Website Lock)
  useEffect(() => {
    if (!isExamActive) return;

    // 1. Fullscreen Enforcement & Change Detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        showToast('WARNING: You have exited Fullscreen mode! This event has been logged.', 'error');
        triggerProctoringWarning('fullscreen_exit', 'Student exited fullscreen examination mode.');
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // 2. Tab Switch Detection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        showToast('CRITICAL WARNING: Tab switching or minimization detected! Marks will be deducted.', 'error');
        triggerProctoringWarning('tab_switch', 'Student switched tabs or minimized the active examination window.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. Disable Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showToast('Right-click is disabled in secure exam mode.', 'info');
    };
    document.addEventListener('contextmenu', handleContextMenu);

    // 4. Disable Copy / Paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      showToast('Copy is disabled in secure exam mode.', 'error');
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      showToast('Paste is disabled in secure exam mode.', 'error');
    };
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    // 5. Detect Print Shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        showToast('Printing or screen capture shortcuts are disabled.', 'error');
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExamActive]);

  // Continuous Frame capture for real-time server-side Gemini AI Proctoring (Every 12 seconds)
  useEffect(() => {
    if (!isExamActive || cameraPermission !== 'granted') return;

    const proctorInterval = setInterval(() => {
      captureAndAnalyzeFrame();
    }, 12000);

    return () => clearInterval(proctorInterval);
  }, [isExamActive, cameraPermission, questions, currentQIndex]);

  const captureAndAnalyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current || aiAnalyzing) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture exact video width & height
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.6); // Compress to 60% quality

    setAiAnalyzing(true);
    setAiProctorLog('Gemini Multimodal proctoring module analyzing webcam frame...');

    try {
      const res = await fetch('/api/proctor/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Interpret AI results
      setAiProctorLog(data.description || 'Proctor AI: Normal frame. Student focus is clear.');

      if (data.aiAnalysis) {
        if (!data.faceDetected) {
          triggerProctoringWarning('no_face', 'AI Proctor detected: No face present in webcam frame.');
        } else if (data.multipleFaces) {
          triggerProctoringWarning('multiple_faces', 'AI Proctor detected: Multiple human faces present in webcam frame!');
        } else if (data.phoneDetected) {
          triggerProctoringWarning('phone_detected', 'AI Proctor detected: Student is using a mobile phone device.');
        } else if (data.bookDetected) {
          triggerProctoringWarning('book_detected', 'AI Proctor detected: Student is referencing an unauthorized textbook or paper.');
        } else if (data.lookingAway) {
          triggerProctoringWarning('looking_away', 'AI Proctor detected: Student is looking away from the exam screen repeatedly.');
        } else if (data.personEntered) {
          triggerProctoringWarning('person_entered', 'AI Proctor detected: Another person has entered the student’s room.');
        }
      }
    } catch (err: any) {
      console.error('AI Proctoring Analysis failed:', err);
      setAiProctorLog('AI Proctoring connection latency or missing service key.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const triggerProctoringWarning = async (type: string, description: string) => {
    if (!activeExam || !session) return;

    try {
      const res = await fetch('/api/proctor/warn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: activeExam.id,
          studentId: user.id,
          type,
          description,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Update local session metrics
        setSession(prev => {
          if (!prev) return null;
          return {
            ...prev,
            warningCount: data.warningCount,
            marksDeducted: Number((Math.max(0, data.warningCount - activeExam.warningLimit) * activeExam.warningDeduction).toFixed(2)),
          };
        });

        // Play warning indicator sound or toast alert
        showToast(`AI Proctoring Warning [${type.toUpperCase()}]: ${description}`, 'error');
      }
    } catch (err) {
      console.error('Failed to submit proctor warning:', err);
    }
  };

  // Exam Join System
  const handleJoinExam = async (e?: React.FormEvent, directExamId?: string, directJoinCode?: string) => {
    if (e) e.preventDefault();
    
    const codeToUse = directJoinCode !== undefined ? directJoinCode : joinCode;
    
    if (!directExamId && !codeToUse) {
      showToast('Join code is strictly required.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/exams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joinCode: codeToUse ? codeToUse.trim().toUpperCase() : undefined,
          examId: directExamId,
          studentId: user.id,
          deviceFingerprint: navigator.userAgent,
          deviceId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error);
      }

      setActiveExam(data.exam);
      setSession(data.session);

      // Fetch questions
      const qRes = await fetch(`/api/exams/${data.exam.id}/questions`);
      const qData = await qRes.json();
      setQuestions(qData);

      // Load any previously auto-saved answers if reconnection
      if (data.reconnected) {
        showToast('Successfully reconnected! Loading saved answers from server.', 'success');
      } else {
        showToast('Exam joined successfully! Please review rules.', 'success');
      }

      // Load timer based on remaining duration (simulate active exam)
      setTimeLeft(data.exam.durationMinutes * 60);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Start Exam
  const handleStartExam = () => {
    if (!activeExam) return;

    // Request fullscreen mode
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {
        showToast('Failed to automatically enter Fullscreen mode. Please enter fullscreen manually.', 'info');
      });
    }

    setIsExamActive(true);
    setCurrentQIndex(0);

    // Launch countdown timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          showToast('Time has expired! Automatically submitting your answers.', 'error');
          handleSubmitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Save selected option in state & automatically post auto-save API
  const handleAnswerSelect = async (questionId: string, value: any) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));

    try {
      await fetch('/api/exam/save-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: activeExam?.id,
          studentId: user.id,
          questionId,
          selectedAnswer: value,
        }),
      });
    } catch (err) {
      console.error('Auto-save network error:', err);
      // Auto reconnect/retry indicator
    }
  };

  const handleCheckboxSelect = (questionId: string, option: string) => {
    const currentList = selectedAnswers[questionId] ? JSON.parse(selectedAnswers[questionId]) : [];
    let newList;
    if (currentList.includes(option)) {
      newList = currentList.filter((o: string) => o !== option);
    } else {
      newList = [...currentList, option];
    }
    handleAnswerSelect(questionId, JSON.stringify(newList));
  };

  // Mark for review toggle
  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // Complete exam submission
  const handleSubmitExam = async (skipConfirm = false) => {
    if (!skipConfirm) {
      setShowSubmitModal(true);
      return;
    }

    setShowSubmitModal(false);

    if (timerRef.current) clearInterval(timerRef.current);
    stopWebcam();

    // Release Fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    setLoading(true);
    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: activeExam?.id,
          studentId: user.id,
          timeTaken: activeExam ? (activeExam.durationMinutes * 60 - timeLeft) : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('Exam Submitted Successfully.', 'success');
      setSession(data.session);
      setIsExamActive(false);
      fetchStudentResults();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reset exam screen to take another exam
  const handleBackToDashboard = () => {
    setActiveExam(null);
    setSession(null);
    setQuestions([]);
    setSelectedAnswers({});
    setMarkedForReview({});
    setIsExamActive(false);
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* HEADER NAV */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg text-white">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">Veritas Proctor</span>
            <span className="ml-2 text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
              Student Mode
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
            <UserIcon className="h-4 w-4" />
            <span className="font-medium">{user.name} ({user.studentTeacherId})</span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* DASHBOARD GRID */}
      <main className="max-w-7xl mx-auto p-6">
        {!activeExam ? (
          <div className="space-y-8 animate-fadeIn">
            {/* WELCOME SUMMARY HERO BANNER */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                  <span className="text-xs font-mono uppercase bg-blue-500/40 text-blue-100 px-3 py-1 rounded-full font-bold tracking-wider">
                    Academic Command Center
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">
                    Welcome back, {user.name}!
                  </h2>
                  <p className="text-blue-100/90 text-xs sm:text-sm mt-1.5 max-w-xl font-medium leading-relaxed">
                    You are securely authenticated under <span className="font-bold underline decoration-blue-300">{user.institution || "Your College"}</span>. Only examinations authorized for your specific campus are listed below.
                  </p>
                </div>
                <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md border border-white/15 px-4.5 py-3.5 rounded-2xl">
                  <div className="p-2.5 bg-white/10 rounded-xl text-white">
                    <UserIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-blue-200 block">Student Identity</span>
                    <span className="text-sm font-bold block">{user.studentTeacherId}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STUDENT TABS */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 mt-4 pb-2">
              <button
                onClick={() => { setActiveTab('exams'); setDetailedSubmission(null); }}
                className={`pb-3 text-xs sm:text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
                  activeTab === 'exams'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ClipboardList className="h-4 w-4" />
                <span>Upcoming Assessments</span>
              </button>
              <button
                onClick={() => { setActiveTab('classrooms'); setDetailedSubmission(null); }}
                className={`pb-3 text-xs sm:text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
                  activeTab === 'classrooms'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>My Classrooms (IIST)</span>
              </button>
              <button
                onClick={() => { setActiveTab('results'); setDetailedSubmission(null); }}
                className={`pb-3 text-xs sm:text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
                  activeTab === 'results'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Award className="h-4 w-4" />
                <span>My Published Results</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'exams' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* CODE JOIN CARD */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 relative overflow-hidden transition duration-300">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1.5">Join by Exam Code</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                    Have an alpha-numeric invitation or join code from your teacher? Enter it below to start.
                  </p>

                  <form onSubmit={(e) => handleJoinExam(e)} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Exam Code
                      </label>
                      <input
                        type="text"
                        required
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value)}
                        placeholder="E.g. AIML2026X8"
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 mt-1.5 text-center text-base font-bold placeholder-slate-400 focus:ring-2 focus:ring-blue-500 tracking-widest uppercase transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg focus:outline-none transition active:scale-98"
                    >
                      {loading ? 'Validating Shield...' : 'Verify Code & Enter'}
                    </button>
                  </form>
                </div>

                {/* LIST OF AVAILABLE COLLEGE EXAMS */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">College Examination Portal</h3>
                      <p className="text-xs text-slate-400">Showing active and upcoming assessments for {user.institution || 'Indore Institute of Science & Tech'}.</p>
                    </div>
                    <button 
                      onClick={fetchAvailableExams}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
                      disabled={fetchingExams}
                    >
                      {fetchingExams ? 'Refreshing...' : '↻ Refresh list'}
                    </button>
                  </div>

                  {fetchingExams ? (
                    <div className="space-y-3">
                      {[1, 2].map(n => (
                        <div key={n} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200 dark:border-slate-800" />
                      ))}
                    </div>
                  ) : availableExams.length === 0 ? (
                    <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                      <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Examinations Found</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-normal">
                        There are currently no examinations listed for {user.institution || 'Indore Institute of Science & Tech'}. Contact your faculty or department coordinator to obtain the exam schedule.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                      {availableExams.map(exam => {
                        const isUpcoming = exam.status === 'draft';
                        const isLive = exam.status === 'active' || exam.status === 'paused';
                        const isCompleted = exam.status === 'ended';
                        
                        const showCodeValue = exam.joinCodeRequired !== false;

                        return (
                          <div 
                            key={exam.id} 
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                          >
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{exam.title}</h4>
                                
                                {isLive && (
                                  <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center space-x-1 border border-emerald-200/50 dark:border-emerald-900/30">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Live</span>
                                  </span>
                                )}
                                {isUpcoming && (
                                  <span className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-100/50 dark:border-blue-950/30">
                                    Upcoming
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-slate-200/50 dark:border-slate-700/30">
                                    Completed
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1.5 gap-x-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                <div>
                                  <span className="text-slate-400 mr-1 font-normal">Class:</span> 
                                  <span className="text-slate-700 dark:text-slate-300">{exam.classroomName}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 mr-1 font-normal">Code:</span> 
                                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded text-[11px] text-slate-700 dark:text-slate-300 uppercase">{exam.joinCode}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 mr-1 font-normal">Teacher:</span> 
                                  <span className="text-slate-700 dark:text-slate-300">{exam.teacherName || "Faculty Instructor"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 mr-1 font-normal">Date:</span> 
                                  <span className="text-slate-700 dark:text-slate-300">{exam.scheduledDate || "TBD"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 mr-1 font-normal">Time:</span> 
                                  <span className="text-slate-700 dark:text-slate-300">{exam.scheduledTime || "TBD"}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 mr-1 font-normal">Type:</span> 
                                  <span className="text-slate-700 dark:text-slate-300">{showCodeValue ? "🔑 Join Code Required" : "🟢 Direct Open"}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 self-end md:self-center">
                              <button
                                onClick={() => {
                                  const inviteLink = `${window.location.origin}/?role=student&code=${exam.joinCode}`;
                                  navigator.clipboard.writeText(inviteLink);
                                  showToast("Direct invitation link successfully copied to clipboard!", "success");
                                }}
                                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 active:scale-95 transition"
                                title="Copy Direct Secure Invitation Link"
                              >
                                <Fingerprint className="h-4 w-4" />
                              </button>

                              {isLive ? (
                                <button
                                  onClick={() => {
                                    if (showCodeValue) {
                                      setJoinCode(exam.joinCode);
                                      handleJoinExam(undefined, exam.id, exam.joinCode);
                                    } else {
                                      handleJoinExam(undefined, exam.id, "");
                                    }
                                  }}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition active:scale-95"
                                >
                                  Join Exam
                                </button>
                              ) : isCompleted ? (
                                <button
                                  onClick={() => {
                                    handleJoinExam(undefined, exam.id, exam.joinCode);
                                  }}
                                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700/60 transition active:scale-95"
                                >
                                  {exam.resultsReleased ? "View Results" : "Grading"}
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="px-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-400 border border-slate-100 dark:border-slate-900 rounded-xl text-xs font-bold cursor-not-allowed"
                                >
                                  Not Started
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'classrooms' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* JOIN CLASSROOM CARD */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 relative overflow-hidden transition duration-300 animate-fadeIn">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1.5">Join Classroom</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                    Enroll in virtual classrooms managed by Indore Institute of Science & Tech (IIST) faculty.
                  </p>

                  <form onSubmit={handleJoinClassroom} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Classroom Code
                      </label>
                      <input
                        type="text"
                        required
                        value={classroomJoinCode}
                        onChange={e => setClassroomJoinCode(e.target.value)}
                        placeholder="E.g. AIML2026"
                        className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 mt-1.5 text-center text-base font-bold placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 tracking-widest uppercase transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg focus:outline-none transition active:scale-98"
                    >
                      {loading ? 'Enrolling...' : 'Join Classroom'}
                    </button>
                  </form>
                </div>

                {/* MY ENROLLED CLASSROOMS */}
                <div className="lg:col-span-2 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Joined Classrooms</h3>
                      <p className="text-xs text-slate-400">Classrooms you are enrolled in under Indore Institute of Science & Tech.</p>
                    </div>
                    <button 
                      onClick={fetchClassrooms}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-semibold"
                      disabled={fetchingClassrooms}
                    >
                      {fetchingClassrooms ? 'Refreshing...' : '↻ Refresh list'}
                    </button>
                  </div>

                  {fetchingClassrooms ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[1, 2].map(n => (
                        <div key={n} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200 dark:border-slate-800" />
                      ))}
                    </div>
                  ) : classrooms.length === 0 ? (
                    <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                      <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Enrolled Classrooms</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-normal">
                        You have not joined any virtual classrooms yet. Enter an alphanumeric code on the left panel to join.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {classrooms.map(c => (
                        <div
                          key={c.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative transition duration-300 hover:border-indigo-400"
                        >
                          <div className="absolute top-4 right-4 text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                            {c.code}
                          </div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white pr-20">{c.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">Instructor: {c.teacherName}</p>
                          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-500">
                            Joined: {new Date(c.createdAt || new Date()).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'results' && (
              <div className="space-y-6 animate-fadeIn">
                {detailedSubmission ? (
                  /* RESULTS DRILL-DOWN DETAILED REPORT */
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 relative space-y-8">
                    <button
                      onClick={() => setDetailedSubmission(null)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition mb-4"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Back to Results</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6 gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{detailedSubmission.examName}</h3>
                        <p className="text-xs text-slate-400 mt-1">Subject: {detailedSubmission.subject} | Classroom: {detailedSubmission.classroomName}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">Marks Obtained</span>
                          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{detailedSubmission.score} / {detailedSubmission.totalExamMarks}</span>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-center font-bold ${
                          detailedSubmission.passStatus === 'Pass'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                        }`}>
                          <span className="text-[9px] block font-mono font-medium leading-none uppercase text-slate-400">Result</span>
                          <span className="text-xs uppercase tracking-wider">{detailedSubmission.passStatus}</span>
                        </div>
                      </div>
                    </div>

                    {/* PERFORMANCE SUMMARY */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl text-xs sm:text-sm">
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Percentage</span>
                        <span className="text-base font-bold text-slate-800 dark:text-slate-200">{detailedSubmission.percentage}%</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Grade Awarded</span>
                        <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">{detailedSubmission.grade}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Secured College Rank</span>
                        <span className="text-base font-bold text-amber-600 flex items-center space-x-1">
                          <Award className="h-4 w-4 text-amber-500" />
                          <span>Rank #{detailedSubmission.answers[0]?.rank || 1}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block font-medium">Time Taken</span>
                        <span className="text-base font-bold text-slate-800 dark:text-slate-200">{Math.round(detailedSubmission.timeTaken / 60)} Minutes</span>
                      </div>
                    </div>

                    {/* INSTRUCTOR GENERAL REMARKS */}
                    <div className="border border-indigo-100 dark:border-indigo-950/30 bg-indigo-50/30 dark:bg-indigo-950/10 p-5 rounded-xl">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block uppercase tracking-wide">Faculty General Remarks</span>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-2 font-medium">
                        "{detailedSubmission.answers[0]?.remarks || 'Excellent effort! Standard instructions and guidelines followed accurately during evaluation.'}"
                      </p>
                    </div>

                    {/* DETAILED QUESTION REVIEW */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-xs sm:text-sm border-b border-slate-100 dark:border-slate-800 pb-2">Detailed Question Review</h4>
                      {detailedSubmission.answers.map((ans: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-5 rounded-2xl border transition ${
                            ans.isCorrect === true
                              ? 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/10'
                              : ans.isCorrect === false
                              ? 'border-rose-200 dark:border-rose-900/30 bg-rose-50/10'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded">
                                Question {idx + 1} ({ans.questionType?.toUpperCase()})
                              </span>
                              <h5 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white mt-2 leading-relaxed">{ans.questionText}</h5>
                            </div>
                            <span className="text-[11px] font-mono font-bold bg-white dark:bg-slate-900 border px-2.5 py-1 rounded-xl shrink-0">
                              {ans.marksObtained} / {ans.maxMarks} Marks
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 text-xs">
                            <div className="space-y-1">
                              <span className="text-slate-400 font-medium">Your Answer:</span>
                              <div className="font-semibold bg-slate-50 dark:bg-slate-950 border p-3 rounded-xl break-words whitespace-pre-wrap">
                                {ans.questionType === 'checkbox' ? (
                                  <div className="flex flex-wrap gap-1">
                                    {JSON.parse(ans.selectedAnswer || '[]').map((o: string, i: number) => (
                                      <span key={i} className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded font-medium">{o}</span>
                                    ))}
                                  </div>
                                ) : (
                                  ans.selectedAnswer || <span className="text-slate-400 italic">Unattempted</span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-slate-400 font-medium">Correct Answer:</span>
                              <div className="font-semibold bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-950/20 p-3 rounded-xl break-words whitespace-pre-wrap text-indigo-700 dark:text-indigo-400">
                                {ans.questionType === 'checkbox' ? (
                                  <div className="flex flex-wrap gap-1">
                                    {JSON.parse(ans.correctAnswer || '[]').map((o: string, i: number) => (
                                      <span key={i} className="bg-indigo-100 dark:bg-indigo-900/40 px-2 py-1 rounded font-medium">{o}</span>
                                    ))}
                                  </div>
                                ) : (
                                  ans.correctAnswer
                                )}
                              </div>
                            </div>
                          </div>

                          {ans.remarks && (
                            <div className="mt-3 p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                              <span className="font-bold">Evaluation Comment: </span>
                              <span>{ans.remarks}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* LIST OF PUBLISHED RESULTS */
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Academic Results</h3>
                      <p className="text-xs text-slate-400">Showing graded results released by IIST department instructors.</p>
                    </div>

                    {fetchingResults ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2].map(n => (
                          <div key={n} className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200 dark:border-slate-800" />
                        ))}
                      </div>
                    ) : studentResults.length === 0 ? (
                      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                        <Award className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">No Published Results</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-normal">
                          There are currently no published evaluation reports released for you. Results will display here immediately upon instructor publication.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {studentResults.map(resObj => {
                          const sub = resObj.submission;
                          const result = resObj.result;
                          const exam = resObj.exam;

                          return (
                            <div
                              key={sub.submissionId}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-indigo-400/50 dark:hover:border-indigo-800/50 transition duration-300"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[9px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full font-bold">
                                    {sub.classroomName || 'Computer Science'}
                                  </span>
                                  <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                    sub.passStatus === 'Pass'
                                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400'
                                      : 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400'
                                  }`}>
                                    {sub.passStatus}
                                  </span>
                                </div>

                                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-3 leading-snug">{sub.examName}</h4>
                                <p className="text-[10px] text-slate-400 mt-1">Instructor: {exam?.teacherName || 'Faculty Instructor'}</p>

                                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50 text-center">
                                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl">
                                    <span className="text-[9px] text-slate-400 uppercase font-mono block">Score</span>
                                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{sub.score} / {result?.totalMarks || exam?.totalMarks || 50}</span>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl">
                                    <span className="text-[9px] text-slate-400 uppercase font-mono block">Grade</span>
                                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">{sub.grade}</span>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl">
                                    <span className="text-[9px] text-slate-400 uppercase font-mono block">Rank</span>
                                    <span className="text-xs font-extrabold text-amber-600">#{result?.rank || 1}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => fetchResultDetails(sub.submissionId)}
                                className="w-full mt-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1"
                              >
                                <FileText className="h-4 w-4 text-slate-400" />
                                <span>Detailed Performance Review</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : !isExamActive ? (
          /* PRE-EXAM INSTRUCTIONS & RESULTS SCREEN */
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 relative">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{activeExam.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{activeExam.classroomName}</p>

            {session?.status === 'submitted' ? (
              /* EXAM SUBMITTED METRICS */
              <div className="space-y-6">
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-center">
                  <CheckCircle className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">Exam Submitted Successfully</h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    Your answers were securely processed, hashed, and logged in the decentralized examination system.
                  </p>
                </div>

                {/* UNIQUE SUBMISSION ID BADGE */}
                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-indigo-500 block font-bold">Unique Submission ID</span>
                    <span className="text-sm font-mono font-bold text-indigo-700 dark:text-indigo-400 break-all">
                      {session.submissionId || `sub_${session.id.substring(0, 12)}`}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(session.submissionId || `sub_${session.id.substring(0, 12)}`);
                      showToast('Submission ID copied to clipboard!', 'success');
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95"
                  >
                    Copy
                  </button>
                </div>

                <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-6 bg-slate-50 dark:bg-slate-900/40 space-y-4">
                  <h4 className="font-semibold text-sm mb-2 border-b pb-2">Assessment Statistics Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Total Questions</span>
                      <span className="text-base font-bold text-slate-800 dark:text-slate-200">{questions.length}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Attempted Questions</span>
                      <span className="text-base font-bold text-emerald-600">
                        {Object.keys(selectedAnswers).filter(k => selectedAnswers[k] !== undefined && selectedAnswers[k] !== '').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Unattempted Questions</span>
                      <span className="text-base font-bold text-amber-600">
                        {questions.length - Object.keys(selectedAnswers).filter(k => selectedAnswers[k] !== undefined && selectedAnswers[k] !== '').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">AI Proctoring Warnings</span>
                      <span className="text-base font-bold text-slate-800 dark:text-slate-200">{session.warningCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Warnings Deductions</span>
                      <span className="text-base font-bold text-rose-600">-{session.marksDeducted} Marks</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Marks Obtained (Grade)</span>
                      <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                        {activeExam.resultsReleased ? `${session.finalScore} / ${activeExam.totalMarks}` : 'Awaiting manual grading'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block">Release Status</span>
                      <span className="text-xs font-semibold mt-1 inline-block px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/30">
                        {activeExam.resultsReleased ? 'Results Published' : 'Evaluation Pending (Awaiting Faculty Release)'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleBackToDashboard}
                  className="w-full py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold rounded-xl transition"
                >
                  Return to Main Menu
                </button>
              </div>
            ) : (
              /* PRE-START RULES SUMMARY */
              <div className="space-y-6">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <span className="font-bold block mb-1">Strict AI Proctoring & Security Safeguards Active:</span>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Webcam & Microphone must remain active for automated head and object checking.</li>
                      <li>One-Device Policy is strictly enforced. Any dual session will block execution.</li>
                      <li>Fullscreen examination mode is mandatory. Exiting fullscreen logs a proctor infraction.</li>
                      <li>Tab switching, minimization, or keyboard shortcut overrides trigger automatic mark deductions.</li>
                      <li>Warning threshold: Up to {activeExam.warningLimit} free warnings. Deductions of {activeExam.warningDeduction} marks apply for every infraction thereafter.</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border border-slate-100 dark:border-slate-800 p-4 rounded-xl">
                  <div className="text-center">
                    <span className="text-xs text-slate-400 block">Questions Count</span>
                    <span className="text-lg font-bold">{questions.length} Questions</span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-slate-400 block">Time Duration</span>
                    <span className="text-lg font-bold">{activeExam.durationMinutes} Minutes</span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-slate-400 block">Total Marks</span>
                    <span className="text-lg font-bold">{activeExam.totalMarks} Marks</span>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleBackToDashboard}
                    className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStartExam}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>Launch Examination Shield</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE SECURE EXAM ROOM interface */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* LEFT QUESTION SECTION (3 COLS) */}
            <div className="lg:col-span-3 space-y-6">
              {/* STATUS BAR */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 transition-colors duration-300">
                <div className="flex items-center space-x-2 text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/20 px-3.5 py-1.5 rounded-xl text-lg border border-rose-100 dark:border-rose-950">
                  <Clock className="h-5 w-5 animate-spin" />
                  <span>{formatTime(timeLeft)}</span>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Secure Connect</span>
                    <Wifi className="h-4 w-4 text-emerald-500" />
                  </div>

                  <div className="flex items-center space-x-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Warnings: {session?.warningCount || 0} / {activeExam.warningLimit}</span>
                  </div>
                </div>
              </div>

              {/* CURRENT QUESTION BLOCK */}
              {questions.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-md relative">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full">
                      Question {currentQIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold font-mono">
                      {questions[currentQIndex].marks} Marks
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white leading-relaxed mb-8">
                    {questions[currentQIndex].text}
                  </h3>

                  {/* CHOOSE CORRESPONDING INPUT FOR TYPES */}
                  <div className="space-y-3">
                    {questions[currentQIndex].type === 'mcq' &&
                      questions[currentQIndex].options.map((opt, i) => {
                        const isSelected = selectedAnswers[questions[currentQIndex].id] === opt;
                        return (
                          <label
                            key={i}
                            className={`flex items-center p-4 border rounded-xl cursor-pointer transition ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${questions[currentQIndex].id}`}
                              checked={isSelected}
                              onChange={() => handleAnswerSelect(questions[currentQIndex].id, opt)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm">{opt}</span>
                          </label>
                        );
                      })}

                    {questions[currentQIndex].type === 'checkbox' &&
                      questions[currentQIndex].options.map((opt, i) => {
                        const savedList = selectedAnswers[questions[currentQIndex].id]
                          ? JSON.parse(selectedAnswers[questions[currentQIndex].id])
                          : [];
                        const isSelected = savedList.includes(opt);
                        return (
                          <label
                            key={i}
                            className={`flex items-center p-4 border rounded-xl cursor-pointer transition ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleCheckboxSelect(questions[currentQIndex].id, opt)}
                              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm">{opt}</span>
                          </label>
                        );
                      })}

                    {questions[currentQIndex].type === 'text' && (
                      <div>
                        <textarea
                          rows={6}
                          value={selectedAnswers[questions[currentQIndex].id] || ''}
                          onChange={e => handleAnswerSelect(questions[currentQIndex].id, e.target.value)}
                          placeholder="Type your structured analytical explanation here. Answers are auto-saved as you type."
                          className="w-full block rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* AUTO SAVE LOG BAR */}
                  <div className="mt-8 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
                    <span className="text-[11px] font-medium text-emerald-500 flex items-center space-x-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Answers automatically saved to secure system database</span>
                    </span>

                    <button
                      onClick={() => toggleMarkForReview(questions[currentQIndex].id)}
                      className={`flex items-center space-x-1 px-4 py-2 text-xs font-semibold rounded-xl border transition ${
                        markedForReview[questions[currentQIndex].id]
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <Bookmark className="h-4 w-4" />
                      <span>{markedForReview[questions[currentQIndex].id] ? 'Marked for Review' : 'Mark for Review'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* NAV PREV / NEXT CONTROLS */}
              <div className="flex items-center justify-between">
                <button
                  disabled={currentQIndex === 0}
                  onClick={() => setCurrentQIndex(prev => prev - 1)}
                  className="px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-bold flex items-center space-x-1.5 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => handleSubmitExam(false)}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold shadow-md transition"
                >
                  Submit Examination
                </button>

                <button
                  disabled={currentQIndex === questions.length - 1}
                  onClick={() => setCurrentQIndex(prev => prev + 1)}
                  className="px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-bold flex items-center space-x-1.5 disabled:opacity-40 transition"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* RIGHT SIDEBAR PANEL (1 COL) */}
            <div className="lg:col-span-1 space-y-6">
              {/* LIVE WEBCAM proctor feeds */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-md overflow-hidden relative">
                <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wide mb-3 flex items-center justify-between">
                  <span>AI Proctor Feed</span>
                  <span className="flex items-center space-x-1 text-emerald-500">
                    <Video className="h-3.5 w-3.5 animate-pulse" />
                    <span className="text-[10px] lowercase">live</span>
                  </span>
                </h4>

                <div className="aspect-video bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-800">
                  {cameraPermission === 'granted' ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center text-xs text-slate-400">
                      <Camera className="h-8 w-8 text-slate-300 mb-2" />
                      <span>Awaiting camera feeds authorization...</span>
                    </div>
                  )}

                  {/* Target Crosshair simulation */}
                  <div className="absolute inset-0 border-2 border-dashed border-blue-500/20 pointer-events-none rounded-xl m-2" />
                  <div className="absolute top-2 left-2 text-[10px] font-mono bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase">
                    Eye-Track: OK
                  </div>
                </div>

                {/* Hidden canvas for capturing proctor frames */}
                <canvas ref={canvasRef} className="hidden" />

                {/* AI PROCTOR INTERPRETATION OUTPUT LOG */}
                <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <span className="text-[9px] font-mono block text-slate-400 uppercase tracking-wider mb-1">
                    System Intelligence Log
                  </span>
                  <p className="text-[11px] font-mono leading-normal text-blue-600 dark:text-blue-400 break-words">
                    {aiProctorLog}
                  </p>
                </div>
              </div>

              {/* QUESTION PALETTE GRID */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md">
                <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wide mb-4">
                  Question Palette
                </h4>

                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => {
                    const hasAnswer = selectedAnswers[q.id] !== undefined && String(selectedAnswers[q.id]).trim() !== '';
                    const isMarked = markedForReview[q.id] === true;

                    let btnClass = 'palette-unvisited';
                    if (idx === currentQIndex) {
                      btnClass = 'palette-current';
                    } else if (isMarked && hasAnswer) {
                      btnClass = 'palette-review-answered';
                    } else if (isMarked) {
                      btnClass = 'palette-review';
                    } else if (hasAnswer) {
                      btnClass = 'palette-answered';
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQIndex(idx)}
                        className={`h-10 rounded-lg text-xs font-bold transition flex items-center justify-center ${btnClass}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* COLOR KEYS */}
                <div className="mt-6 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4 text-[11px] text-slate-500">
                  <div className="flex items-center space-x-2">
                    <div className="h-3.5 w-3.5 palette-unvisited rounded-md" />
                    <span>Unvisited</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-3.5 w-3.5 palette-current rounded-md" />
                    <span>Current Question</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-3.5 w-3.5 palette-answered rounded-md animate-pulse" />
                    <span>Answered & Saved</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-3.5 w-3.5 palette-review rounded-md" />
                    <span>Marked for Review</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-3.5 w-3.5 palette-review-answered rounded-md" />
                    <span>Marked & Answered</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CUSTOM SUBMIT EXAM CONFIRMATION POPUP MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-rose-500" />
            <div className="flex items-center space-x-3 mb-4 text-amber-500">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-2xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Submit Examination?</h3>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to submit your exam? After submission, you cannot make any changes.
            </p>

            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-xs space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>Total Questions:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{questions.length}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Attempted Answers:</span>
                <span className="font-bold text-emerald-500">
                  {Object.keys(selectedAnswers).filter(k => selectedAnswers[k] !== undefined && selectedAnswers[k] !== '').length} Answers
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>AI Proctor Infractions:</span>
                <span className={`font-bold ${session && session.warningCount > 0 ? 'text-rose-500 font-extrabold animate-pulse' : 'text-slate-500'}`}>
                  {session?.warningCount || 0} Warnings
                </span>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs transition active:scale-95"
              >
                No, Keep Writing
              </button>
              <button
                type="button"
                onClick={() => handleSubmitExam(true)}
                className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white font-bold rounded-2xl text-xs shadow-md transition active:scale-95"
              >
                Yes, Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
