/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'teacher' | 'admin' | 'developer';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  institution: string;
  studentTeacherId: string;
  createdAt: string;
}

export interface Classroom {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  teacherName: string;
  createdAt: string;
}

export type ExamStatus = 'draft' | 'active' | 'paused' | 'ended';

export interface Exam {
  id: string;
  title: string;
  description: string;
  classroomId: string;
  classroomName?: string;
  joinCode: string;
  durationMinutes: number;
  totalMarks: number;
  warningLimit: number;
  warningDeduction: number; // e.g. 0.15 marks
  autoDeductionEnabled: boolean;
  status: ExamStatus;
  resultsReleased: boolean;
  questionsCount: number;
  teacherId: string;
  teacherName?: string;
  institution?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  joinCodeRequired?: boolean;
  createdAt: string;
}

export type QuestionType = 'mcq' | 'checkbox' | 'text';

export interface Question {
  id: string;
  examId: string;
  text: string;
  type: QuestionType;
  options: string[]; // for mcq and checkbox
  correctAnswer: string; // JSON string or single string
  marks: number;
  orderIndex: number;
}

export interface Answer {
  id: string;
  examId: string;
  studentId: string;
  questionId: string;
  selectedAnswer: string; // text or selected option ids
  autoSavedAt: string;
  submittedAt?: string;
  isCorrect?: boolean;
  marksObtained?: number;
}

export type ProctoringViolationType =
  | 'no_face'
  | 'multiple_faces'
  | 'looking_away'
  | 'head_movement'
  | 'camera_disabled'
  | 'phone_detected'
  | 'book_detected'
  | 'tab_switch'
  | 'fullscreen_exit'
  | 'mic_disabled'
  | 'person_entered'
  | 'suspicious_movement';

export interface ProctoringLog {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  type: ProctoringViolationType;
  description: string;
  timestamp: string;
  screenshotUrl?: string; // base64 or generated mock image path
}

export interface ExamSession {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  deviceFingerprint: string;
  deviceId: string;
  sessionToken: string;
  status: 'joined' | 'in_progress' | 'submitted' | 'disconnected';
  lastActiveAt: string;
  warningCount: number;
  marksDeducted: number;
  finalScore: number;
  currentQuestionId?: string;
  cameraStatus: 'active' | 'inactive' | 'permission_denied';
  micStatus: 'active' | 'inactive' | 'permission_denied';
  internetStatus: 'online' | 'offline' | 'unstable';
  progress: number; // percent complete
  submissionId?: string;
}

export interface SystemNotification {
  id: string;
  examId?: string;
  recipientId?: string; // or broadcast
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  timestamp: string;
  read: boolean;
}

export interface DeveloperStats {
  systemHealth: 'healthy' | 'warning' | 'critical';
  serverStatus: 'online' | 'offline';
  apiStatus: {
    gemini: 'operational' | 'degraded' | 'offline';
    database: 'operational' | 'degraded';
    auth: 'operational';
  };
  liveConnections: number;
  activeExams: number;
  activeUsers: number;
  errorCount24h: number;
  avgResponseTimeMs: number;
}

export interface ExamSubmissionAnswer {
  questionId: string;
  selectedAnswer: string;
  isCorrect?: boolean;
  marksObtained?: number;
  remarks?: string;
}

export interface ExamSubmission {
  submissionId: string;
  examId: string;
  classroomId: string;
  studentId: string;
  teacherId: string;
  answers: ExamSubmissionAnswer[];
  score: number;
  percentage: number;
  grade: string;
  passStatus: 'Pass' | 'Fail';
  timeTaken: number; // in seconds
  submittedAt: string;
  status: 'pending_evaluation' | 'evaluated' | 'published';
  studentName?: string;
  studentRollNumber?: string;
  studentEmail?: string;
  studentBranch?: string;
  studentSemester?: string;
  classroomName?: string;
  examName?: string;
  subject?: string;
}

export interface ExamResult {
  resultId: string;
  submissionId: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  rank?: number;
  remarks: string;
  publishedAt: string;
  publishedBy: string;
}

