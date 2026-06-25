import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db, hashPassword, Role, QuestionType, ExamStatus } from './src/db.js';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// ------------------------------------------------------------------
// JWT Security Token helper
// ------------------------------------------------------------------
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'examination-portal-secret-key-123';

function generateToken(payload: { id: string; email: string; role: Role; name: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): { id: string; email: string; role: Role; name: string } | null {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Middleware to authenticate requests
function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized, no token provided' });
  }
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized, invalid or expired token' });
  }
  req.user = user;
  next();
}

// Middleware for role check
function authorize(roles: Role[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden, insufficient permissions' });
    }
    next();
  };
}

// ------------------------------------------------------------------
// Auth APIs
// ------------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existingUsers = db.getUsers();
  if (existingUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const newUser = db.addUser({
    name,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    role: role as Role
  });

  const token = generateToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    name: newUser.name
  });

  res.json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

app.get('/api/auth/me', authenticate, (req: any, res) => {
  res.json({ user: req.user });
});

// ------------------------------------------------------------------
// Admin Users Management APIs
// ------------------------------------------------------------------
app.get('/api/admin/users', authenticate, authorize(['ADMIN']), (req, res) => {
  const users = db.getUsers().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt
  }));
  res.json({ users });
});

app.post('/api/admin/users', authenticate, authorize(['ADMIN']), (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existingUsers = db.getUsers();
  if (existingUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const newUser = db.addUser({
    name,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    role: role as Role
  });

  res.json({
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    }
  });
});

app.put('/api/admin/users/:id', authenticate, authorize(['ADMIN']), (req, res) => {
  const { id } = req.params;
  const { name, email, role, password } = req.body;

  const updates: any = {};
  if (name) updates.name = name;
  if (email) updates.email = email.toLowerCase();
  if (role) updates.role = role;
  if (password) updates.passwordHash = hashPassword(password);

  const updated = db.updateUser(id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      createdAt: updated.createdAt
    }
  });
});

app.delete('/api/admin/users/:id', authenticate, authorize(['ADMIN']), (req, res) => {
  const { id } = req.params;
  if (id === 'user-admin') {
    return res.status(400).json({ error: 'Cannot delete the main administrator' });
  }
  const deleted = db.deleteUser(id);
  if (!deleted) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ success: true });
});

// ------------------------------------------------------------------
// Exam Management APIs
// ------------------------------------------------------------------
app.get('/api/exams', authenticate, (req: any, res) => {
  const exams = db.getExams();
  const questions = db.getQuestions();

  // Enhance each exam with question counts and total marks
  const enhanced = exams.map(exam => {
    const examQuestions = questions.filter(q => q.examId === exam.id);
    const totalMarks = examQuestions.reduce((sum, q) => sum + q.marks, 0);
    return {
      ...exam,
      questionCount: examQuestions.length,
      totalMarks
    };
  });

  if (req.user.role === 'STUDENT') {
    // Students only see published exams
    return res.json({ exams: enhanced.filter(e => e.isPublished) });
  } else if (req.user.role === 'EXAMINER') {
    // Examiners see all, but client filters or we can supply creators
    return res.json({ exams: enhanced });
  } else {
    // Admins see all
    return res.json({ exams: enhanced });
  }
});

app.post('/api/exams', authenticate, authorize(['ADMIN', 'EXAMINER']), (req: any, res) => {
  const { title, description, duration, startTime, endTime, isPublished } = req.body;
  if (!title || !duration || !startTime || !endTime) {
    return res.status(400).json({ error: 'Title, duration, startTime and endTime are required' });
  }

  const newExam = db.addExam({
    title,
    description: description || '',
    duration: parseInt(duration),
    startTime,
    endTime,
    createdById: req.user.id,
    isPublished: !!isPublished
  });

  res.json({ exam: newExam });
});

app.put('/api/exams/:id', authenticate, authorize(['ADMIN', 'EXAMINER']), (req: any, res) => {
  const { id } = req.params;
  const { title, description, duration, startTime, endTime, isPublished } = req.body;

  const exams = db.getExams();
  const exam = exams.find(e => e.id === id);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  // Examiners can only edit their own exams
  if (req.user.role === 'EXAMINER' && exam.createdById !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden, you can only modify your own exams' });
  }

  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (duration !== undefined) updates.duration = parseInt(duration);
  if (startTime !== undefined) updates.startTime = startTime;
  if (endTime !== undefined) updates.endTime = endTime;
  if (isPublished !== undefined) updates.isPublished = !!isPublished;

  const updated = db.updateExam(id, updates);
  res.json({ exam: updated });
});

app.delete('/api/exams/:id', authenticate, authorize(['ADMIN', 'EXAMINER']), (req: any, res) => {
  const { id } = req.params;
  const exams = db.getExams();
  const exam = exams.find(e => e.id === id);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  // Examiners can only delete their own exams
  if (req.user.role === 'EXAMINER' && exam.createdById !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden, you can only delete your own exams' });
  }

  db.deleteExam(id);
  res.json({ success: true });
});

// ------------------------------------------------------------------
// Questions Management APIs
// ------------------------------------------------------------------
app.get('/api/exams/:examId/questions', authenticate, (req: any, res) => {
  const { examId } = req.params;
  const questions = db.getQuestions().filter(q => q.examId === examId);
  
  // Hide correctAnswer for students if the exam is not yet submitted
  if (req.user.role === 'STUDENT') {
    const studentExam = db.getStudentExams().find(
      se => se.examId === examId && se.studentId === req.user.id && se.status === 'COMPLETED'
    );
    if (!studentExam) {
      // Strip correctAnswers for security
      const safeQuestions = questions.map(q => ({
        id: q.id,
        examId: q.examId,
        type: q.type,
        text: q.text,
        options: q.options,
        marks: q.marks
      }));
      return res.json({ questions: safeQuestions });
    }
  }

  res.json({ questions });
});

app.post('/api/exams/:examId/questions', authenticate, authorize(['ADMIN', 'EXAMINER']), (req: any, res) => {
  const { examId } = req.params;
  const { type, text, options, correctAnswer, marks } = req.body;

  if (!type || !text || correctAnswer === undefined || !marks) {
    return res.status(400).json({ error: 'Type, text, correctAnswer and marks are required' });
  }

  const exams = db.getExams();
  const exam = exams.find(e => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  if (req.user.role === 'EXAMINER' && exam.createdById !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden, you cannot build exams for others' });
  }

  const newQuestion = db.addQuestion({
    examId,
    type: type as QuestionType,
    text,
    options: options || [],
    correctAnswer: String(correctAnswer),
    marks: parseInt(marks)
  });

  res.json({ question: newQuestion });
});

app.put('/api/exams/:examId/questions/:id', authenticate, authorize(['ADMIN', 'EXAMINER']), (req: any, res) => {
  const { examId, id } = req.params;
  const { type, text, options, correctAnswer, marks } = req.body;

  const exams = db.getExams();
  const exam = exams.find(e => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  if (req.user.role === 'EXAMINER' && exam.createdById !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const updates: any = {};
  if (type !== undefined) updates.type = type;
  if (text !== undefined) updates.text = text;
  if (options !== undefined) updates.options = options;
  if (correctAnswer !== undefined) updates.correctAnswer = String(correctAnswer);
  if (marks !== undefined) updates.marks = parseInt(marks);

  const updated = db.updateQuestion(id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Question not found' });
  }

  res.json({ question: updated });
});

app.delete('/api/exams/:examId/questions/:id', authenticate, authorize(['ADMIN', 'EXAMINER']), (req: any, res) => {
  const { examId, id } = req.params;
  const exams = db.getExams();
  const exam = exams.find(e => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  if (req.user.role === 'EXAMINER' && exam.createdById !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const deleted = db.deleteQuestion(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Question not found' });
  }

  res.json({ success: true });
});

app.post('/api/exams/:examId/questions/bulk-import', authenticate, authorize(['ADMIN', 'EXAMINER']), (req: any, res) => {
  const { examId } = req.params;
  const { questions } = req.body;

  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Invalid list of questions' });
  }

  const exams = db.getExams();
  const exam = exams.find(e => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  if (req.user.role === 'EXAMINER' && exam.createdById !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Map and sanitize questions for this examId
  const sanitized = questions.map((q: any) => ({
    examId,
    type: (q.type || 'MCQ') as QuestionType,
    text: q.text || 'Untitled Question',
    options: q.options || [],
    correctAnswer: String(q.correctAnswer || ''),
    marks: parseInt(q.marks) || 5
  }));

  const inserted = db.addQuestionsBulk(sanitized);
  res.json({ count: inserted.length, questions: inserted });
});

// Robust Regex Parser for paste questions fallback
function parseQuestionsWithRegex(text: string): any[] {
  const blocks = text.split(/\n\s*\n/);
  const questions: any[] = [];

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;

    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // First line is text
    let qText = lines[0];
    // Remove leading numbers, e.g., "1. " or "Question 1: "
    qText = qText.replace(/^(\d+[\.\:\s]+|Question\s*\d+[\.\:\s]+)/i, '');

    const options: string[] = [];
    let correctAnswer = '';
    let type: QuestionType = 'SHORT_ANSWER';

    // Look for Answer: line
    let answerLineIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (/^(Answer|Correct\s*Answer)\s*:/i.test(lines[i])) {
        answerLineIndex = i;
        correctAnswer = lines[i].replace(/^(Answer|Correct\s*Answer)\s*:\s*/i, '').trim();
        break;
      }
    }

    // Capture options
    const optionLinesLimit = answerLineIndex !== -1 ? answerLineIndex : lines.length;
    for (let i = 1; i < optionLinesLimit; i++) {
      const line = lines[i];
      // Match option lines starting with A., B., C., D. or A), B), etc.
      if (/^[A-D][\.\)\s]/i.test(line)) {
        options.push(line);
      } else if (line.toLowerCase() === 'true' || line.toLowerCase() === 'false') {
        options.push(line);
      }
    }

    // Determine type
    if (options.length > 0) {
      const allTrueFalse = options.every(o => o.toLowerCase() === 'true' || o.toLowerCase() === 'false');
      if (allTrueFalse || options.length === 2 && options.some(o => o.toLowerCase().includes('true')) && options.some(o => o.toLowerCase().includes('false'))) {
        type = 'TRUE_FALSE';
      } else {
        type = 'MCQ';
      }
    } else {
      type = 'SHORT_ANSWER';
    }

    questions.push({
      text: qText,
      type,
      options,
      correctAnswer,
      marks: 5 // Default marks per question
    });
  }

  return questions;
}

// AI Question Parser Endpoint using Gemini
app.post('/api/exams/:examId/bulk-parse', authenticate, authorize(['ADMIN', 'EXAMINER']), async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Pasted text is required' });
  }

  // Check if GEMINI_API_KEY is available
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
    console.log('GEMINI_API_KEY is missing or generic. Falling back to robust regex parser.');
    const parsed = parseQuestionsWithRegex(text);
    return res.json({ questions: parsed, parserUsed: 'regex-fallback' });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Instructions prompt specified exactly by user
    const systemInstruction = `You are a JSON generator. Given raw exam question text, output a JSON object with a "questions" array. Each question has:
- "text": string
- "type": "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER"
- "options": array of strings (empty for short answer)
- "correctAnswer": string (the letter or full answer)
Infer the type: if options start with A., B., etc. → MCQ; if only two options (True/False) → TRUE_FALSE; else → SHORT_ANSWER.
Return only the JSON, no code blocks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: text,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['questions'],
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ['text', 'type', 'options', 'correctAnswer'],
                properties: {
                  text: { type: Type.STRING },
                  type: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING },
                  marks: { type: Type.INTEGER }
                }
              }
            }
          }
        }
      }
    });

    const output = response.text || '';
    const parsed = JSON.parse(output.trim());
    
    // Supplement missing marks values if any
    const finalQuestions = (parsed.questions || []).map((q: any) => ({
      ...q,
      marks: q.marks || 5
    }));

    res.json({ questions: finalQuestions, parserUsed: 'gemini-ai' });
  } catch (err: any) {
    console.error('Gemini parse failed. Falling back to regex parser.', err);
    const parsed = parseQuestionsWithRegex(text);
    res.json({ questions: parsed, parserUsed: 'regex-fallback-after-error' });
  }
});

// ------------------------------------------------------------------
// Student Exam Taking APIs
// ------------------------------------------------------------------
app.post('/api/exams/:examId/start', authenticate, authorize(['STUDENT']), (req: any, res) => {
  const { examId } = req.params;
  const studentId = req.user.id;

  const exams = db.getExams();
  const exam = exams.find(e => e.id === examId);
  if (!exam || !exam.isPublished) {
    return res.status(404).json({ error: 'Exam not found or not published' });
  }

  // Check if student already started/completed this exam
  const studentExams = db.getStudentExams();
  let attempt = studentExams.find(se => se.examId === examId && se.studentId === studentId);

  if (attempt) {
    if (attempt.status === 'COMPLETED') {
      return res.status(400).json({ error: 'You have already completed this exam' });
    }
    // Return existing attempt if in progress
    return res.json({ attempt });
  }

  // Create new attempt
  attempt = db.addStudentExam({
    studentId,
    examId,
    startedAt: new Date().toISOString(),
    submittedAt: null,
    status: 'IN_PROGRESS',
    totalMarksObtained: null,
    percentage: null
  });

  res.json({ attempt });
});

// Tab focus loss warning incrementer
app.post('/api/exams/:examId/warn', authenticate, authorize(['STUDENT']), (req: any, res) => {
  const { examId } = req.params;
  const studentId = req.user.id;

  const studentExams = db.getStudentExams();
  const attempt = studentExams.find(se => se.examId === examId && se.studentId === studentId && se.status === 'IN_PROGRESS');
  if (!attempt) {
    return res.status(404).json({ error: 'Active exam attempt not found' });
  }

  attempt.warningsCount = (attempt.warningsCount || 0) + 1;
  db.save();
  res.json({ warningsCount: attempt.warningsCount });
});

app.post('/api/exams/:examId/save-response', authenticate, authorize(['STUDENT']), (req: any, res) => {
  const { examId } = req.params;
  const { questionId, selectedAnswer } = req.body;
  const studentId = req.user.id;

  if (!questionId) {
    return res.status(400).json({ error: 'questionId is required' });
  }

  const studentExams = db.getStudentExams();
  const attempt = studentExams.find(se => se.examId === examId && se.studentId === studentId && se.status === 'IN_PROGRESS');
  if (!attempt) {
    return res.status(404).json({ error: 'Active exam attempt not found' });
  }

  const saved = db.saveStudentResponse({
    studentExamId: attempt.id,
    questionId,
    selectedAnswer: String(selectedAnswer || ''),
    isCorrect: null, // Graded upon submission
    marksObtained: 0
  });

  res.json({ response: saved });
});

app.post('/api/exams/:examId/submit', authenticate, authorize(['STUDENT']), (req: any, res) => {
  const { examId } = req.params;
  const studentId = req.user.id;

  const studentExams = db.getStudentExams();
  const attempt = studentExams.find(se => se.examId === examId && se.studentId === studentId && se.status === 'IN_PROGRESS');
  if (!attempt) {
    return res.status(404).json({ error: 'Active exam attempt not found' });
  }

  const questions = db.getQuestions().filter(q => q.examId === examId);
  const responses = db.getStudentResponses().filter(r => r.studentExamId === attempt.id);

  let totalMarksObtained = 0;
  let totalMaxMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  // Grade each MCQ and TRUE_FALSE question automatically
  questions.forEach(q => {
    const responseIndex = responses.findIndex(r => r.questionId === q.id);
    const selectedAnswer = responseIndex !== -1 ? responses[responseIndex].selectedAnswer : '';

    let isCorrect: boolean | null = null;
    let marksObtained = 0;

    if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
      // Handle flexible comparisons for MCQs, e.g., option is "A. Hyper Text..." and user submitted "A" or the full text
      const cleanAnswer = selectedAnswer.trim();
      const correctAnswer = q.correctAnswer.trim();

      // Check if matches the single option letter like 'A'
      const matchLetter = cleanAnswer.toUpperCase() === correctAnswer.toUpperCase();
      // Or matches the exact option content
      const matchFullText = q.options.some(opt => {
        const isMatchedOption = opt.toLowerCase().includes(cleanAnswer.toLowerCase()) && opt.toUpperCase().startsWith(correctAnswer.toUpperCase());
        return isMatchedOption;
      });

      // Simple matches or direct exact matches
      if (matchLetter || cleanAnswer.toLowerCase() === correctAnswer.toLowerCase() || (q.type === 'TRUE_FALSE' && cleanAnswer.toLowerCase() === correctAnswer.toLowerCase())) {
        isCorrect = true;
        marksObtained = q.marks;
      } else {
        isCorrect = false;
        marksObtained = 0;
      }

      totalMarksObtained += marksObtained;
    } else {
      // SHORT_ANSWER requires manual examiner grading
      isCorrect = null;
      marksObtained = 0;
    }

    db.saveStudentResponse({
      studentExamId: attempt.id,
      questionId: q.id,
      selectedAnswer,
      isCorrect,
      marksObtained
    });
  });

  // Calculate percentage
  const percentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;

  // Finalize attempt
  const updatedAttempt = db.updateStudentExam(attempt.id, {
    status: 'COMPLETED',
    submittedAt: new Date().toISOString(),
    totalMarksObtained,
    percentage
  });

  res.json({ attempt: updatedAttempt });
});

// ------------------------------------------------------------------
// Results & Grading APIs
// ------------------------------------------------------------------
app.get('/api/results/global', authenticate, authorize(['ADMIN']), (req, res) => {
  const studentExams = db.getStudentExams();
  const exams = db.getExams();
  const users = db.getUsers();

  const enhanced = studentExams.map(se => {
    const student = users.find(u => u.id === se.studentId);
    const exam = exams.find(e => e.id === se.examId);
    return {
      ...se,
      studentName: student ? student.name : 'Unknown Student',
      studentEmail: student ? student.email : '',
      examTitle: exam ? exam.title : 'Deleted Exam'
    };
  });

  res.json({ results: enhanced });
});

app.get('/api/results/student', authenticate, authorize(['STUDENT']), (req: any, res) => {
  const studentExams = db.getStudentExams().filter(se => se.studentId === req.user.id);
  const exams = db.getExams();

  const enhanced = studentExams.map(se => {
    const exam = exams.find(e => e.id === se.examId);
    return {
      ...se,
      examTitle: exam ? exam.title : 'Deleted Exam',
      examDescription: exam ? exam.description : ''
    };
  });

  res.json({ results: enhanced });
});

app.get('/api/results/examiner', authenticate, authorize(['ADMIN', 'EXAMINER']), (req: any, res) => {
  const studentExams = db.getStudentExams();
  const exams = db.getExams();
  const users = db.getUsers();

  // Filter exams created by this examiner (Admin sees all)
  const examinerExams = req.user.role === 'ADMIN' ? exams : exams.filter(e => e.createdById === req.user.id);
  const examIds = examinerExams.map(e => e.id);

  const filteredAttempts = studentExams.filter(se => examIds.includes(se.examId));

  const enhanced = filteredAttempts.map(se => {
    const student = users.find(u => u.id === se.studentId);
    const exam = exams.find(e => e.id === se.examId);
    return {
      ...se,
      studentName: student ? student.name : 'Unknown Student',
      studentEmail: student ? student.email : '',
      examTitle: exam ? exam.title : 'Deleted Exam'
    };
  });

  res.json({ results: enhanced });
});

app.get('/api/results/detail/:studentExamId', authenticate, (req: any, res) => {
  const { studentExamId } = req.params;

  const studentExams = db.getStudentExams();
  const attempt = studentExams.find(se => se.id === studentExamId);
  if (!attempt) {
    return res.status(404).json({ error: 'Exam attempt not found' });
  }

  // Security checks
  if (req.user.role === 'STUDENT' && attempt.studentId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden, you cannot view others results' });
  }

  const exam = db.getExams().find(e => e.id === attempt.examId);
  const questions = db.getQuestions().filter(q => q.examId === attempt.examId);
  const responses = db.getStudentResponses().filter(r => r.studentExamId === studentExamId);
  const student = db.getUsers().find(u => u.id === attempt.studentId);

  res.json({
    attempt,
    exam,
    student: student ? { name: student.name, email: student.email } : null,
    questions,
    responses
  });
});

app.post('/api/results/grade-short-answer', authenticate, authorize(['ADMIN', 'EXAMINER']), (req: any, res) => {
  const { studentExamId, questionId, marksObtained } = req.body;

  if (!studentExamId || !questionId || marksObtained === undefined) {
    return res.status(400).json({ error: 'studentExamId, questionId and marksObtained are required' });
  }

  const studentExams = db.getStudentExams();
  const attempt = studentExams.find(se => se.id === studentExamId);
  if (!attempt) {
    return res.status(404).json({ error: 'Exam attempt not found' });
  }

  const exam = db.getExams().find(e => e.id === attempt.examId);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found' });
  }

  // Check examiner ownership
  if (req.user.role === 'EXAMINER' && exam.createdById !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden, you can only grade your own exams' });
  }

  const question = db.getQuestions().find(q => q.id === questionId);
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  const marksValue = parseFloat(marksObtained);
  if (marksValue < 0 || marksValue > question.marks) {
    return res.status(400).json({ error: `Marks must be between 0 and ${question.marks}` });
  }

  // Find or create response
  const responses = db.getStudentResponses();
  const responseIndex = responses.findIndex(r => r.studentExamId === studentExamId && r.questionId === questionId);

  const updatedResponse = {
    studentExamId,
    questionId,
    selectedAnswer: responseIndex !== -1 ? responses[responseIndex].selectedAnswer : '',
    isCorrect: marksValue > 0,
    marksObtained: marksValue
  };

  db.saveStudentResponse(updatedResponse);

  // Recalculate total marks obtained & percentage for the exam attempt
  const allQuestions = db.getQuestions().filter(q => q.examId === attempt.examId);
  const examResponses = db.getStudentResponses().filter(r => r.studentExamId === studentExamId);

  let newTotalMarks = 0;
  let totalMaxMarks = allQuestions.reduce((sum, q) => sum + q.marks, 0);

  allQuestions.forEach(q => {
    const resp = examResponses.find(r => r.questionId === q.id);
    if (resp) {
      newTotalMarks += resp.marksObtained;
    }
  });

  const percentage = totalMaxMarks > 0 ? (newTotalMarks / totalMaxMarks) * 100 : 0;

  db.updateStudentExam(studentExamId, {
    totalMarksObtained: newTotalMarks,
    percentage
  });

  res.json({ success: true, totalMarksObtained: newTotalMarks, percentage });
});

// ------------------------------------------------------------------
// Vite Middleware setup for static assets and page routing
// ------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Examination Portal running on http://localhost:${PORT}`);
  });
}

startServer();
