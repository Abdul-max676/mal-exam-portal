export type Role = 'ADMIN' | 'EXAMINER' | 'STUDENT';
export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';
export type ExamStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  startTime: string;
  endTime: string;
  createdById: string;
  isPublished: boolean;
  createdAt: string;
  questionCount?: number;
  totalMarks?: number;
}

export interface Question {
  id: string;
  examId: string;
  type: QuestionType;
  text: string;
  options: string[]; // for MCQs and True/False
  correctAnswer: string;
  marks: number;
}

export interface StudentExam {
  id: string;
  studentId: string;
  examId: string;
  startedAt: string;
  submittedAt: string | null;
  status: ExamStatus;
  totalMarksObtained: number | null;
  percentage: number | null;
  warningsCount: number;
}

export interface StudentResponse {
  id: string;
  studentExamId: string;
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean | null;
  marksObtained: number;
}

export interface EnhancedResult {
  id: string;
  studentId: string;
  examId: string;
  startedAt: string;
  submittedAt: string | null;
  status: ExamStatus;
  totalMarksObtained: number | null;
  percentage: number | null;
  warningsCount: number;
  studentName: string;
  studentEmail: string;
  examTitle: string;
  examDescription?: string;
}
