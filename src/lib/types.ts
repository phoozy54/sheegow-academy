// SHEEGOW ACADEMY — shared types

export type Role = "student" | "teacher" | "admin" | "super_admin";
export type Level = "Beginner" | "Intermediate" | "Advanced" | "IELTS" | "Kids";

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
  profilePicture?: string | null;
  bio?: string | null;
  level: string;
  isActive: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: string;
  price: number;
  duration: number;
  image?: string | null;
  teacherId?: string | null;
  teacher?: Pick<
    User,
    "id" | "fullName" | "email" | "profilePicture" | "bio" | "role"
  > | null;
  rating: number;
  reviewCount: number;
  whatYouLearn?: string | null;
  isActive: boolean;
  createdAt: string;
  reviews?: Review[];
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  student?: Pick<User, "id" | "fullName" | "profilePicture"> | null;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  progress: number;
  completedLessons: string;
  status: string;
  enrolledAt: string;
  expiresAt?: string | null;
  completedAt?: string | null;
  course?: Course;
}

export interface LiveClass {
  id: string;
  courseId?: string | null;
  teacherId?: string | null;
  title: string;
  description?: string | null;
  scheduledAt: string;
  duration: number;
  meetingLink?: string | null;
  status: "scheduled" | "live" | "ended";
  attendeeCount: number;
  createdAt: string;
  course?: Course | null;
  teacher?: Pick<User, "id" | "fullName" | "profilePicture" | "bio"> | null;
}

export interface Payment {
  id: string;
  studentId: string;
  courseId?: string | null;
  amount: number;
  method: string;
  status: string;
  transactionId?: string | null;
  couponCode?: string | null;
  createdAt: string;
  course?: Course | null;
}

/** A manual trial request stored as a Payment row with method="trial". */
export interface TrialRequest {
  id: string;
  studentId: string;
  courseId?: string | null;
  classId: string | null;
  status: string; // pending | completed (approved) | failed (rejected)
  createdAt: string;
  expiresAt?: string | null;
  approvedBy?: string | null;
  student?: Pick<
    User,
    "id" | "fullName" | "email" | "phone" | "profilePicture"
  > | null;
  liveClass?: Pick<
    LiveClass,
    "id" | "title" | "status" | "scheduledAt" | "courseId"
  > | null;
}

export interface ChatMessage {
  id: string;
  classId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  text: string;
  timestamp: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Stats {
  totalStudents: number;
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  liveClassesCount: number;
  recentEnrollments: {
    id: string;
    studentName: string;
    courseTitle: string;
    enrolledAt: string;
  }[];
  revenueByMonth: { month: string; revenue: number }[];
  enrollmentsByLevel: { level: string; count: number }[];
}

// ─── CONTENT FOUNDATION ──────────────────────────────────
export type LessonType = "video" | "pdf" | "text" | "quiz" | "live" | "assignment";

export interface Material {
  id: string;
  courseId: string;
  lessonId?: string | null;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes?: number | null;
  createdAt: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  type: LessonType;
  order: number;
  body?: string | null;
  videoUrl?: string | null;
  durationSec?: number | null;
  isPreview: boolean;
  isPublished: boolean;
  materials?: Material[];
  quiz?: Quiz | null;
  assignment?: Assignment | null;
  // Prisma `include` returns an array; empty when the student has no record.
  progress?: LessonProgress[] | null;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  order: number;
  isPublished: boolean;
  lessons: Lesson[];
}

export interface LessonProgress {
  id: string;
  studentId: string;
  lessonId: string;
  status: "not_started" | "in_progress" | "completed";
  lastPositionSec: number;
  secondsWatched: number;
  completedAt?: string | null;
}

/** Student-facing roadmap with real completion data. */
export interface Roadmap {
  courseId: string;
  modules: Module[];
  totalLessons: number;
  completedLessons: number;
  percent: number;
  remainingLessons: number;
  nextLessonId: string | null;
  enrollment: Enrollment | null;
}

export interface QuizChoice {
  id: string;
  text: string;
  order: number;
  // `isCorrect` is deliberately absent: it must never reach the browser.
}

export interface QuizQuestion {
  id: string;
  type: "single" | "multiple" | "true_false" | "short";
  prompt: string;
  points: number;
  order: number;
  choices: QuizChoice[];
}

/** Quiz metadata safe to expose before/after an attempt. */
export interface Quiz {
  id: string;
  courseId: string;
  lessonId?: string | null;
  liveClassId?: string | null;
  title: string;
  description?: string | null;
  timeLimitSec?: number | null;
  passScore: number;
  maxAttempts: number;
  isLive: boolean;
  questions?: QuizQuestion[];
  attempts?: QuizAttempt[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  startedAt: string;
  submittedAt?: string | null;
  score?: number | null;
  passed?: boolean | null;
}

export interface QuizResult extends QuizAttempt {
  passed: boolean;
  score: number;
  correctCount: number;
  questionCount: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  lessonId?: string | null;
  title: string;
  instructions: string;
  dueAt?: string | null;
  maxPoints: number;
  submissions?: Submission[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  note?: string | null;
  fileUrl?: string | null;
  submittedAt: string;
  status: string;
  grade?: number | null;
  feedback?: string | null;
  gradedAt?: string | null;
}

export interface Certificate {
  id: string;
  studentId: string;
  courseId: string;
  serial: string;
  verificationCode: string;
  issuedAt: string;
  revokedAt?: string | null;
  studentName?: string;
  courseTitle?: string;
  teacherName?: string;
}

export interface CertificateEligibility {
  eligible: boolean;
  reasons: string[];
  totalLessons: number;
  completedLessons: number;
  requiredQuizzes: number;
  passedQuizzes: number;
  pendingHomework: number;
}

export interface Poll {
  id: string;
  liveClassId: string;
  question: string;
  options: string[];
  createdBy: string;
  startedAt: string;
  endedAt?: string | null;
  voted?: boolean;
  results?: { optionIndex: number; votes: number }[];
}
