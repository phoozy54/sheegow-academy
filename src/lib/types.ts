// SHEEGOW ACADEMY — shared types

export type Role = "student" | "teacher" | "admin" | "super_admin";
export type Level = "Beginner" | "Intermediate" | "Advanced" | "IELTS" | "Kids";

export interface User {
  id: string;
  fullName: string;
  email: string;
  username?: string | null;
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

/**
 * Per-star review counts returned alongside a single course by
 * GET /api/courses/:id. Keys are "1".."5"; values are the number of reviews
 * with that star rating. Always present — missing buckets default to 0.
 */
export type RatingBreakdown = Record<"5" | "4" | "3" | "2" | "1", number>;

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

// ─── ANNOUNCEMENTS ───────────────────────────────────────
// Teachers/admins post announcements visible to enrolled students.

export interface Announcement {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  createdAt: string;
  author?: Pick<User, "id" | "fullName" | "profilePicture"> | null;
}

// ─── INVOICE ─────────────────────────────────────────────
// Returned by /api/payments/:id/invoice for the printable receipt page.

export interface Invoice {
  paymentId: string;
  invoiceNumber: string;
  amount: number;
  method: string;
  status: string;
  transactionId: string | null;
  couponCode: string | null;
  createdAt: string;
  student: {
    id: string;
    fullName: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
    level: string;
  } | null;
}

// ─── ADMIN COURSE OVERVIEW ─────────────────────────────────
// Admin/super-admin management view: real work and real student state.

export interface AdminLiveClass extends Omit<LiveClass, "course" | "teacher"> {
  course?: Pick<Course, "id" | "title" | "level" | "image"> | null;
  teacher?: Pick<User, "id" | "fullName" | "profilePicture"> | null;
  /** Recorded attendances, as opposed to the live attendee counter. */
  attendanceCount: number;
}

export interface CourseWorkItem {
  id: string;
  title: string;
  kind: "lesson" | "quiz" | "assignment";
  moduleTitle?: string | null;
  isPublished: boolean;
  dueAt?: string | null;
}

export interface CourseWorkCounts {
  modules: number;
  publishedModules: number;
  lessons: number;
  publishedLessons: number;
  quizzes: number;
  assignments: number;
  materials: number;
  liveClasses: number;
  certificates: number;
}

export interface CourseStudentRow {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  username?: string | null;
  email: string;
  profilePicture?: string | null;
  status: string;
  progress: number;
  enrolledAt: string;
  completedAt?: string | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  quizzesAttempted: number;
  quizzesPassed: number;
  submissions: number;
  gradedSubmissions: number;
  certificateIssuedAt?: string | null;
  lastActivityAt?: string | null;
}

export interface AdminCourseRow {
  id: string;
  title: string;
  description: string;
  level: string;
  price: number;
  duration: number;
  image?: string | null;
  isActive: boolean;
  teacherName?: string | null;
  work: CourseWorkCounts;
  /** The actual lessons, quizzes and assignments that make up the course. */
  workItems: CourseWorkItem[];
  enrolledCount: number;
  activeCount: number;
  completedCount: number;
  students: CourseStudentRow[];
}

export interface AdminCourseOverview {
  summary: {
    totalCourses: number;
    activeCourses: number;
    totalStudents: number;
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    certificatesIssued: number;
    liveClasses: number;
    liveNow: number;
    scheduled: number;
    ended: number;
  };
  courses: AdminCourseRow[];
  liveClasses: AdminLiveClass[];
}

// ─── DISCUSSION / Q&A ───────────────────────────────────
// Threads let students ask course/lesson questions; teachers/admins answer.

export interface DiscussionThreadSummary {
  id: string;
  courseId: string;
  lessonId?: string | null;
  lessonTitle?: string | null;
  studentId: string;
  title: string;
  body: string;
  isResolved: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  author?: Pick<User, "id" | "fullName" | "profilePicture"> | null;
}

export interface DiscussionReply {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: Pick<User, "id" | "fullName" | "profilePicture" | "role"> | null;
}

export interface DiscussionThreadDetail extends DiscussionThreadSummary {
  replies: DiscussionReply[];
}

// ─── GRADEBOOK ──────────────────────────────────────────
// Per-course gradebook: one row per enrolled student with quiz + assignment data.

export interface GradebookQuizColumn {
  id: string;
  title: string;
  passScore: number;
}

export interface GradebookAssignmentColumn {
  id: string;
  title: string;
  maxPoints: number;
  dueAt?: string | null;
}

export interface GradebookQuizAttempt {
  id: string;
  quizId: string;
  score: number | null;
  passed: boolean | null;
  submittedAt: string | null;
}

export interface GradebookSubmission {
  id: string;
  assignmentId: string;
  status: string;
  grade: number | null;
  feedback?: string | null;
  submittedAt: string;
  gradedAt?: string | null;
}

export interface GradebookStudentRow {
  studentId: string;
  fullName: string;
  email: string;
  profilePicture?: string | null;
  enrollmentProgress: number;
  enrollmentStatus: string;
  quizAttempts: GradebookQuizAttempt[];
  submissions: GradebookSubmission[];
}

export interface GradebookSummary {
  studentCount: number;
  averageQuizScore: number | null;
  passRate: number | null;
  averageProgress: number | null;
  gradedSubmissions: number;
  pendingSubmissions: number;
}

export interface GradebookData {
  course: {
    id: string;
    title: string;
    level: string;
  };
  quizzes: GradebookQuizColumn[];
  assignments: GradebookAssignmentColumn[];
  students: GradebookStudentRow[];
  summary: GradebookSummary;
}

// ─── STUDENT NOTES ──────────────────────────────────────
// Personal markdown note tied to one student + one lesson.

export interface LessonNote {
  id: string;
  studentId: string;
  lessonId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ─── DIRECT MESSAGING ───────────────────────────────────
// Private 1-to-1 conversations between any two users.

export interface ConversationSummary {
  id: string;
  otherUser: Pick<User, "id" | "fullName" | "profilePicture" | "role">;
  lastMessage?: {
    id: string;
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface DirectMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender?: Pick<User, "id" | "fullName" | "profilePicture"> | null;
}

// ─── WISHLIST / FAVORITES ─────────────────────────────────
// Courses a student saved to enroll in later. Returned by /api/wishlist with
// the course (and teacher) included for rendering cards.

export interface WishlistItem {
  id: string;
  studentId: string;
  courseId: string;
  createdAt: string;
  course?: Course | null;
}

// ─── NOTIFICATIONS ──────────────────────────────────────
// In-app notifications shown in the navbar bell + the /notifications page.

export type NotificationType =
  | "announcement"
  | "reply"
  | "message"
  | "class"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

/** Shape returned by GET /api/notifications — list + unread count. */
export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
}

// ─── GLOBAL SEARCH ────────────────────────────────────
// Lightweight search results returned by GET /api/search?q=. The endpoint is
// public for courses + live classes, but admin/teacher sessions additionally
// receive a `users` section. Each result carries just the fields needed to
// render a dropdown row + navigate to the right page.

export interface SearchCourseResult {
  id: string;
  title: string;
  description: string;
  level: string;
  image?: string | null;
  /** Pre-computed URL segment matching the public /courses/[slug] route. */
  slug: string;
  /** Full path: /courses/<slug>. */
  href: string;
}

export interface SearchLiveClassResult {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  status: string;
  /** Full path: /class/<id>. */
  href: string;
}

export interface SearchUserResult {
  id: string;
  fullName: string;
  email: string;
  username?: string | null;
  role: Role;
  profilePicture?: string | null;
}

export interface SearchResponse {
  courses: SearchCourseResult[];
  liveClasses: SearchLiveClassResult[];
  /** Only populated for admin / teacher sessions. */
  users?: SearchUserResult[];
}

// ─── GAMIFICATION ─────────────────────────────────────
// Points reward learning actions, streaks track consecutive days of activity,
// and badges are one-time achievement awards. Returned by /api/me/gamification.

export interface GamificationBadge {
  /** Stable identifier — see BadgeType in src/lib/badge-metadata.ts. */
  type: string;
  /** ISO timestamp when the badge was awarded. */
  awardedAt: string;
}

export interface GamificationData {
  points: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  badges: GamificationBadge[];
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  fullName: string;
  username?: string | null;
  points: number;
  currentStreak: number;
  profilePicture?: string | null;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  /** Rank of the current viewer (1-based). null when not signed in or below
   *  the rank cutoff returned. Useful for the "your rank" callout. */
  currentUserRank: number | null;
  /** The viewer's own entry, if any. null when not signed in. */
  currentUser: LeaderboardEntry | null;
}


// ─── REFUND REQUESTS ──────────────────────────────────────
// A student asks for their money back on a completed payment. Admins review
// the request: approving flips the payment status to "refunded" and notifies
// the student; rejecting leaves the payment as "completed".

export type RefundStatus = "pending" | "approved" | "rejected";

export interface RefundRequest {
  id: string;
  paymentId: string;
  studentId: string;
  reason: string;
  status: RefundStatus;
  adminNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  payment?: Payment | null;
  /** Populated when the request is fetched by an admin (cross-user). */
  student?: Pick<
    User,
    "id" | "fullName" | "email" | "phone" | "profilePicture"
  > | null;
}

// ─── COURSE BUNDLES ─────────────────────────────────────
// A bundle is a discounted package of multiple courses. Students buy the
// bundle once and are auto-enrolled in every included course. The list
// endpoints include the bundle's courses with teacher + image for cards.

export interface BundleCourseItem {
  id: string;
  bundleId: string;
  courseId: string;
  course: Course;
}

export interface Bundle {
  id: string;
  title: string;
  description: string;
  price: number;
  image?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  courses: BundleCourseItem[];
}

/** Lightweight course projection embedded inside a bundle's course list. */
export interface BundleCourseSummary {
  id: string;
  title: string;
  description: string;
  level: string;
  price: number;
  duration: number;
  image?: string | null;
  teacher?: {
    id: string;
    fullName: string;
    profilePicture?: string | null;
  } | null;
}

/** GET /api/bundles payload — flattened for cards & checkout. */
export interface BundleWithCourses extends Omit<Bundle, "courses"> {
  courses: BundleCourseSummary[];
  /** Sum of the included courses' individual prices (for the savings badge). */
  originalTotal: number;
  /** `originalTotal - price` (a positive number when the bundle is discounted). */
  savings: number;
}

/** POST /api/bundles/:id/checkout response. */
export interface BundleCheckoutResult {
  payment: Payment;
  enrollments: Enrollment[];
  bundle: Pick<Bundle, "id" | "title" | "price">;
  finalAmount: number;
  alreadyEnrolledCourseIds: string[];
}

// ─── TEACHER APPLICATIONS ──────────────────────────────────
// Students apply to become teachers by submitting an application. Admins
// review and approve (upgrading the user's role to "teacher") or reject.
// Mirrors the application flow on Udemy / Coursera / Teachable.

export type TeacherApplicationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

export type EnglishLevel = "Beginner" | "Intermediate" | "Advanced" | "Native";

export type TeachingExperience = "0" | "1-3" | "3-5" | "5-10" | "10+";

/** Payload accepted by POST /api/teacher-applications. */
export interface TeacherApplicationInput {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  nativeLanguage: string;
  englishLevel: EnglishLevel;
  teachingExperience: TeachingExperience;
  certifications?: string;
  bio: string;
  teachingPhilosophy?: string;
  sampleLesson?: string;
  linkedinUrl?: string;
  resumeUrl?: string;
  preferredCourses?: string;
  availability: string;
  /** Background-check consent. The server rejects the application when false. */
  consent: boolean;
}

export interface TeacherApplication {
  id: string;
  applicantId: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  nativeLanguage: string;
  englishLevel: EnglishLevel;
  teachingExperience: TeachingExperience;
  certifications?: string | null;
  bio: string;
  teachingPhilosophy?: string | null;
  sampleLesson?: string | null;
  linkedinUrl?: string | null;
  resumeUrl?: string | null;
  preferredCourses?: string | null;
  availability: string;
  status: TeacherApplicationStatus;
  adminNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Populated when the application is fetched by an admin (cross-user). */
  applicant?: Pick<
    User,
    "id" | "fullName" | "email" | "phone" | "profilePicture" | "role"
  > | null;
  /** Populated when the application has been reviewed. */
  reviewer?: Pick<User, "id" | "fullName"> | null;
}
