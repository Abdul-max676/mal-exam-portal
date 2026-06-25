import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ------------------------------------------------------------------
// Interfaces and Types
// ------------------------------------------------------------------

export type Role = 'ADMIN' | 'EXAMINER' | 'STUDENT';
export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';
export type ExamStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  startTime: string; // ISO string
  endTime: string; // ISO string
  createdById: string;
  isPublished: boolean;
  createdAt: string;
}

export interface Question {
  id: string;
  examId: string;
  type: QuestionType;
  text: string;
  options: string[]; // empty for SHORT_ANSWER, MCQ has choices, TRUE_FALSE has ["True", "False"]
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
  warningsCount: number; // To track focus loss / tab switch warnings
}

export interface StudentResponse {
  id: string;
  studentExamId: string;
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean | null; // null for short answers
  marksObtained: number;
}

export interface DatabaseSchema {
  users: User[];
  exams: Exam[];
  questions: Question[];
  studentExams: StudentExam[];
  studentResponses: StudentResponse[];
}

// Helper to hash passwords using built-in crypto
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// ------------------------------------------------------------------
// Persistent Store
// ------------------------------------------------------------------

const DB_FILE_PATH = path.join(process.cwd(), 'database.json');

class DatabaseStore {
  private data: DatabaseSchema = {
    users: [],
    exams: [],
    questions: [],
    studentExams: [],
    studentResponses: []
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        this.data = JSON.parse(fileContent);
      } else {
        this.seed();
      }
    } catch (error) {
      console.error('Failed to load database.json, initializing empty:', error);
      this.seed();
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save database.json:', error);
    }
  }

  private seed() {
    console.log('Seeding initial data...');
    
    // 1. Create Users
    const users: User[] = [
      {
        id: 'user-admin',
        name: 'Portal Administrator',
        email: 'admin@example.com',
        passwordHash: hashPassword('Admin123!'),
        role: 'ADMIN',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-examiner-1',
        name: 'Dr. Sarah Jenkins',
        email: 'examiner1@example.com',
        passwordHash: hashPassword('Examiner123!'),
        role: 'EXAMINER',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-examiner-2',
        name: 'Prof. Alan Turing',
        email: 'examiner2@example.com',
        passwordHash: hashPassword('Examiner123!'),
        role: 'EXAMINER',
        createdAt: new Date().toISOString()
      },
      ...Array.from({ length: 5 }).map((_, i) => ({
        id: `user-student-${i + 1}`,
        name: `Student User ${i + 1}`,
        email: `student${i + 1}@example.com`,
        passwordHash: hashPassword('Student123!'),
        role: 'STUDENT' as Role,
        createdAt: new Date().toISOString()
      }))
    ];

    // 2. Create sample exams
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const exams: Exam[] = [
      {
        id: 'exam-webdev',
        title: 'Web Development Fundamentals',
        description: 'An introductory exam testing core concepts of HTML, CSS, JavaScript, and general web design patterns.',
        duration: 30,
        startTime: now.toISOString(),
        endTime: futureDate.toISOString(),
        createdById: 'user-examiner-1',
        isPublished: true,
        createdAt: now.toISOString()
      },
      {
        id: 'exam-react',
        title: 'Advanced React Patterns',
        description: 'Covers advanced concepts including custom hooks, performance optimization, error boundaries, and state management.',
        duration: 45,
        startTime: now.toISOString(),
        endTime: futureDate.toISOString(),
        createdById: 'user-examiner-2',
        isPublished: false,
        createdAt: now.toISOString()
      }
    ];

    // 3. Create questions for Web Development Fundamentals (Exam 1)
    const questions: Question[] = [
      {
        id: 'q-html-1',
        examId: 'exam-webdev',
        type: 'MCQ',
        text: 'What does HTML stand for?',
        options: [
          'A. Hyper Text Markup Language',
          'B. High Tech Markup Language',
          'C. Hyper Text Markdown Language',
          'D. Home Tool Markup Language'
        ],
        correctAnswer: 'A',
        marks: 5
      },
      {
        id: 'q-css-1',
        examId: 'exam-webdev',
        type: 'TRUE_FALSE',
        text: 'CSS is primarily used for styling and layout of web pages.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        marks: 5
      },
      {
        id: 'q-js-1',
        examId: 'exam-webdev',
        type: 'SHORT_ANSWER',
        text: 'Explain the difference between let, const, and var declarations in JavaScript.',
        options: [],
        correctAnswer: 'var has function scope, let/const have block scope. const variables cannot be re-assigned.',
        marks: 10
      }
    ];

    // Create questions for Advanced React Patterns (Exam 2)
    const questionsReact: Question[] = [
      {
        id: 'q-react-1',
        examId: 'exam-react',
        type: 'MCQ',
        text: 'Which Hook should be used to optimize rendering by memoizing computed values?',
        options: [
          'A. useEffect',
          'B. useMemo',
          'C. useCallback',
          'D. useState'
        ],
        correctAnswer: 'B',
        marks: 5
      },
      {
        id: 'q-react-2',
        examId: 'exam-react',
        type: 'TRUE_FALSE',
        text: 'React State updates are always synchronous.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        marks: 5
      },
      {
        id: 'q-react-3',
        examId: 'exam-react',
        type: 'SHORT_ANSWER',
        text: 'Explain the main purpose of an Error Boundary in React applications.',
        options: [],
        correctAnswer: 'To catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI.',
        marks: 10
      }
    ];

    this.data = {
      users,
      exams: [...exams],
      questions: [...questions, ...questionsReact],
      studentExams: [],
      studentResponses: []
    };

    this.save();
  }

  // ----------------------------------------------------
  // User Operations
  // ----------------------------------------------------
  public getUsers() {
    return this.data.users;
  }

  public addUser(user: Omit<User, 'id' | 'createdAt'>) {
    const newUser: User = {
      ...user,
      id: 'user-' + crypto.randomBytes(4).toString('hex'),
      createdAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>) {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    this.data.users[index] = { ...this.data.users[index], ...updates };
    this.save();
    return this.data.users[index];
  }

  public deleteUser(id: string) {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    this.data.users.splice(index, 1);
    this.save();
    return true;
  }

  // ----------------------------------------------------
  // Exam Operations
  // ----------------------------------------------------
  public getExams() {
    return this.data.exams;
  }

  public addExam(exam: Omit<Exam, 'id' | 'createdAt'>) {
    const newExam: Exam = {
      ...exam,
      id: 'exam-' + crypto.randomBytes(4).toString('hex'),
      createdAt: new Date().toISOString()
    };
    this.data.exams.push(newExam);
    this.save();
    return newExam;
  }

  public updateExam(id: string, updates: Partial<Exam>) {
    const index = this.data.exams.findIndex(e => e.id === id);
    if (index === -1) return null;
    this.data.exams[index] = { ...this.data.exams[index], ...updates };
    this.save();
    return this.data.exams[index];
  }

  public deleteExam(id: string) {
    const index = this.data.exams.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.data.exams.splice(index, 1);
    // Cascade delete questions
    this.data.questions = this.data.questions.filter(q => q.examId !== id);
    this.save();
    return true;
  }

  // ----------------------------------------------------
  // Question Operations
  // ----------------------------------------------------
  public getQuestions() {
    return this.data.questions;
  }

  public addQuestion(question: Omit<Question, 'id'>) {
    const newQuestion: Question = {
      ...question,
      id: 'q-' + crypto.randomBytes(4).toString('hex')
    };
    this.data.questions.push(newQuestion);
    this.save();
    return newQuestion;
  }

  public addQuestionsBulk(questionsList: Omit<Question, 'id'>[]) {
    const added: Question[] = [];
    questionsList.forEach(q => {
      const newQuestion: Question = {
        ...q,
        id: 'q-' + crypto.randomBytes(4).toString('hex')
      };
      this.data.questions.push(newQuestion);
      added.push(newQuestion);
    });
    this.save();
    return added;
  }

  public updateQuestion(id: string, updates: Partial<Question>) {
    const index = this.data.questions.findIndex(q => q.id === id);
    if (index === -1) return null;
    this.data.questions[index] = { ...this.data.questions[index], ...updates };
    this.save();
    return this.data.questions[index];
  }

  public deleteQuestion(id: string) {
    const index = this.data.questions.findIndex(q => q.id === id);
    if (index === -1) return false;
    this.data.questions.splice(index, 1);
    this.save();
    return true;
  }

  // ----------------------------------------------------
  // StudentExam Operations
  // ----------------------------------------------------
  public getStudentExams() {
    return this.data.studentExams;
  }

  public getStudentResponses() {
    return this.data.studentResponses;
  }

  public addStudentExam(studentExam: Omit<StudentExam, 'id' | 'warningsCount'>) {
    const newStudentExam: StudentExam = {
      ...studentExam,
      id: 'se-' + crypto.randomBytes(4).toString('hex'),
      warningsCount: 0
    };
    this.data.studentExams.push(newStudentExam);
    this.save();
    return newStudentExam;
  }

  public updateStudentExam(id: string, updates: Partial<StudentExam>) {
    const index = this.data.studentExams.findIndex(se => se.id === id);
    if (index === -1) return null;
    this.data.studentExams[index] = { ...this.data.studentExams[index], ...updates };
    this.save();
    return this.data.studentExams[index];
  }

  public saveStudentResponse(response: Omit<StudentResponse, 'id'>) {
    const index = this.data.studentResponses.findIndex(
      r => r.studentExamId === response.studentExamId && r.questionId === response.questionId
    );

    const updatedResponse: StudentResponse = {
      ...response,
      id: index !== -1 ? this.data.studentResponses[index].id : 'sr-' + crypto.randomBytes(4).toString('hex')
    };

    if (index !== -1) {
      this.data.studentResponses[index] = updatedResponse;
    } else {
      this.data.studentResponses.push(updatedResponse);
    }
    this.save();
    return updatedResponse;
  }
}

export const db = new DatabaseStore();
