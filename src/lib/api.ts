// SHEEGOW ACADEMY — frontend API client
import type {
  AdminCourseOverview,
  Assignment,
  Certificate,
  CertificateEligibility,
  Course,
  Enrollment,
  Lesson,
  LiveClass,
  Material,
  Module,
  Payment,
  Poll,
  Quiz,
  QuizResult,
  Review,
  Roadmap,
  Stats,
  TrialRequest,
  User,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Endpoints where a 401 is a normal outcome — never auto-refresh there. */
const AUTH_ENDPOINTS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
  // "Not logged in" is a valid answer for this endpoint, never a reason to
  // rotate the session or log a 401 in the browser console.
  "/api/auth/me",
]);

/**
 * Dedupe concurrent refreshes. When several API calls fail with 401 at the
 * same time (e.g. a dashboard loading in parallel), only one refresh request
 * is made and every caller waits on the same promise.
 */
let refreshPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(
  url: string,
  options?: RequestInit,
  isRetry = false
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  const data = await res.json().catch(() => ({}));

  if (res.ok) return data as T;

  // The access token is short-lived (15 min). On a 401, rotate the session
  // once and replay the original request so users are not logged out.
  if (
    res.status === 401 &&
    !isRetry &&
    !AUTH_ENDPOINTS.has(url.split("?")[0])
  ) {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(url, options, true);
  }

  throw new ApiError(data.error || "Request failed", res.status);
}

export const api = {
  // AUTH
  register: (body: {
    fullName: string;
    email: string;
    username?: string;
    phone: string;
    password: string;
  }) =>
    request<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** One identifier is enough: username, email or Somali phone number. */
  login: (body: {
    identifier?: string;
    email?: string;
    username?: string;
    phone?: string;
    password: string;
  }) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  logout: () => request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),

  me: () => request<{ user: User | null }>("/api/auth/me"),

  refresh: () => request<{ user: User }>("/api/auth/refresh", { method: "POST" }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // COURSES
  courses: (params: {
    level?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const q = new URLSearchParams();
    if (params.level) q.set("level", params.level);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    return request<{
      items: Course[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/courses?${q.toString()}`);
  },

  course: (id: string) => request<{ course: Course }>(`/api/courses/${id}`),

  /** Admin/super-admin control center: courses, their work, students and all live classes. */
  adminCourseOverview: () =>
    request<AdminCourseOverview>("/api/admin/course-overview"),

  createCourse: (body: Partial<Course>) =>
    request<{ course: Course }>("/api/courses", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateCourse: (id: string, body: Partial<Course>) =>
    request<{ course: Course }>(`/api/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteCourse: (id: string) =>
    request<{ success: boolean }>(`/api/courses/${id}`, { method: "DELETE" }),

  addReview: (courseId: string, body: { rating: number; comment: string }) =>
    request<{ review: Review }>(`/api/courses/${courseId}/reviews`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ENROLLMENTS
  enroll: (courseId: string) =>
    request<{ enrollment: Enrollment }>("/api/enrollments", {
      method: "POST",
      body: JSON.stringify({ courseId }),
    }),

  myCourses: () =>
    request<{ enrollments: Enrollment[] }>("/api/enrollments/my"),

  // LIVE CLASSES
  liveClasses: () => request<{ classes: LiveClass[] }>("/api/live"),
  upcomingClasses: () => request<{ classes: LiveClass[] }>("/api/live/upcoming"),
  liveClass: (id: string) => request<{ liveClass: LiveClass }>(`/api/live/${id}`),

  createLiveClass: (body: Partial<LiveClass>) =>
    request<{ liveClass: LiveClass }>("/api/live", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateLiveClass: (id: string, body: Partial<LiveClass>) =>
    request<{ liveClass: LiveClass }>(`/api/live/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  startLiveClass: (id: string) =>
    request<{ liveClass: LiveClass }>(`/api/live/${id}/start`, { method: "PUT" }),
  endLiveClass: (id: string) =>
    request<{ liveClass: LiveClass }>(`/api/live/${id}/end`, { method: "PUT" }),

  messages: (classId: string) =>
    request<{ messages: any[] }>(`/api/live/${classId}/messages`),

  /** Persist a chat message; the socket service handles live delivery. */
  sendMessage: (
    classId: string,
    text: string,
    clientId?: string
  ) =>
    request<{ message: { id: string; text: string; createdAt: string } }>(
      `/api/live/${classId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ text, clientId }),
      }
    ),

  attendance: (
    classId: string,
    action: "join" | "heartbeat" | "leave" = "join"
  ) =>
    request<{ recorded: boolean }>(`/api/live/${classId}/attendance`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  leaveAttendance: (classId: string) =>
    request<{ recorded: boolean }>(`/api/live/${classId}/attendance`, {
      method: "PATCH",
    }),

  // PAYMENTS
  checkout: (body: {
    courseId: string;
    method: string;
    couponCode?: string;
  }) =>
    request<{
      payment: Payment;
      enrollment: Enrollment;
      finalAmount: number;
    }>("/api/payments/checkout", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  paymentHistory: () =>
    request<{ payments: Payment[] }>("/api/payments/history"),

  // PAYMENTS (admin / super admin)
  allPayments: (params: { status?: string; method?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.method) q.set("method", params.method);
    return request<{
      payments: Payment[];
      summary: {
        total: number;
        completed: number;
        pending: number;
        failed: number;
        refunded: number;
        revenue: number;
      };
      total: number;
    }>(`/api/payments?${q.toString()}`);
  },

  updatePaymentStatus: (id: string, status: string) =>
    request<{ payment: Payment }>(`/api/payments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  validateCoupon: (body: { code: string; courseId: string }) =>
    request<{ valid: boolean; discount?: number }>(
      "/api/payments/coupon/validate",
      { method: "POST", body: JSON.stringify(body) }
    ),

  // TRIAL ACCESS (student request / admin approval)
  trialRequests: () =>
    request<{ requests: TrialRequest[] }>("/api/trial-requests"),

  requestTrial: (classId: string) =>
    request<{ request: TrialRequest; alreadyExists?: boolean }>(
      "/api/trial-requests",
      { method: "POST", body: JSON.stringify({ classId }) }
    ),

  adminTrialRequests: () =>
    request<{ requests: TrialRequest[] }>("/api/admin/trial-requests"),

  decideTrialRequest: (id: string, action: "approve" | "reject") =>
    request<{ request: TrialRequest }>(`/api/admin/trial-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    }),

  location: () =>
    request<{ country: string | null; callingCode: string; source: string }>(
      "/api/location"
    ),

  // USERS (admin)
  users: (params: { role?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.role) q.set("role", params.role);
    if (params.search) q.set("search", params.search);
    return request<{ users: User[] }>(`/api/users?${q.toString()}`);
  },

  updateUser: (id: string, body: Partial<User>) =>
    request<{ user: User }>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  updateMyProfile: (body: Partial<{
    fullName: string;
    username: string;
    phone: string;
    level: string;
    bio: string;
    profilePicture: string;
  }>) =>
    request<{ user: User }>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteUser: (id: string) =>
    request<{ success: boolean }>(`/api/users/${id}`, { method: "DELETE" }),

  createUser: (body: {
    fullName: string;
    email: string;
    username?: string;
    phone?: string;
    password: string;
    role: "student" | "teacher" | "admin" | "super_admin";
    level?: string;
    bio?: string;
  }) =>
    request<{ user: User }>("/api/users", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // CONTACT
  contact: (body: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }) =>
    request<{ success: boolean }>("/api/contact", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // STATS (admin)
  stats: () => request<{ stats: Stats }>("/api/stats"),

  contactMessages: () =>
    request<{ messages: any[] }>("/api/contact/messages"),

  // CONTENT / CURRICULUM
  curriculum: (courseId: string) =>
    request<{
      course: Pick<Course, "id" | "title" | "teacherId" | "isActive">;
      canManage: boolean;
      hasAccess: boolean;
      accessReason: string | null;
      roadmap: Roadmap;
    }>(`/api/courses/${courseId}/curriculum`),

  createModule: (courseId: string, body: {
    title: string;
    description?: string;
    order?: number;
    isPublished?: boolean;
  }) =>
    request<{ module: Module }>(`/api/courses/${courseId}/curriculum`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateModule: (moduleId: string, body: Partial<Module>) =>
    request<{ module: Module }>(`/api/modules/${moduleId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteModule: (moduleId: string) =>
    request<{ success: boolean }>(`/api/modules/${moduleId}`, { method: "DELETE" }),

  createLesson: (moduleId: string, body: Partial<Lesson> & { title: string }) =>
    request<{ lesson: Lesson }>(`/api/modules/${moduleId}/lessons`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  lesson: (lessonId: string) =>
    request<{ lesson: Lesson; canManage: boolean; hasAccess: boolean }>(
      `/api/lessons/${lessonId}`
    ),

  updateLesson: (lessonId: string, body: Partial<Lesson>) =>
    request<{ lesson: Lesson }>(`/api/lessons/${lessonId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteLesson: (lessonId: string) =>
    request<{ success: boolean }>(`/api/lessons/${lessonId}`, { method: "DELETE" }),

  saveProgress: (lessonId: string, body: {
    status?: "in_progress" | "completed";
    lastPositionSec?: number;
    secondsWatched?: number;
  }) =>
    request<{
      progress: import("./types").LessonProgress;
      completion: { progress: number; completedLessons: number; totalLessons: number } | null;
    }>(`/api/lessons/${lessonId}/progress`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  library: () =>
    request<{
      courses: {
        courseId: string;
        title: string;
        image: string | null;
        level: string;
        percent: number;
        modules: Module[];
      }[];
    }>("/api/library"),

  activity: () =>
    request<{
      completedLessons: number;
      watchedSeconds: number;
      learningHours: number;
      certificates: number;
    }>("/api/me/activity"),

  teacherStats: () =>
    request<{
      courses: number;
      enrollments: number;
      upcoming: number;
      reviewCount: number;
      averageRating: number | null;
    }>("/api/me/teacher-stats"),

  signUpload: (body: { courseId: string; lessonId?: string; fileName?: string }) =>
    request<{
      cloudName: string;
      apiKey: string;
      timestamp: number;
      publicId: string;
      folder: string;
      signature: string;
      uploadUrl: string;
    }>("/api/uploads/sign", { method: "POST", body: JSON.stringify(body) }),

  addMaterial: (lessonId: string, body: {
    name: string;
    url: string;
    mimeType: string;
    sizeBytes?: number;
  }) =>
    request<{ material: Material }>(`/api/lessons/${lessonId}/materials`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ASSESSMENT
  createQuiz: (courseId: string, body: Record<string, unknown>) =>
    request<{ quiz: Quiz }>(`/api/courses/${courseId}/quizzes`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  quiz: (quizId: string) =>
    request<{ quiz: Quiz; canManage: boolean; hasAccess: boolean }>(
      `/api/quizzes/${quizId}`
    ),

  publishQuiz: (quizId: string, isPublished: boolean) =>
    request<{ quiz: Quiz }>(`/api/quizzes/${quizId}`, {
      method: "PATCH",
      body: JSON.stringify({ isPublished }),
    }),

  startQuiz: (quizId: string) =>
    request<{
      attempt: import("./types").QuizAttempt;
      quiz: Quiz;
      attemptsRemaining: number;
    }>(`/api/quizzes/${quizId}/start`, { method: "POST" }),

  submitQuiz: (quizId: string, body: {
    attemptId: string;
    answers: { questionId: string; choiceIds?: string[]; textAnswer?: string }[];
  }) =>
    request<{
      result: QuizResult;
      expired: boolean;
      correctAnswers: { questionId: string; correctChoiceIds: string[] }[];
    }>(`/api/quizzes/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createAssignment: (courseId: string, body: Record<string, unknown>) =>
    request<{ assignment: Assignment }>(`/api/courses/${courseId}/assignments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  assignment: (assignmentId: string) =>
    request<{ assignment: Assignment; canManage: boolean }>(
      `/api/assignments/${assignmentId}`
    ),

  submitAssignment: (assignmentId: string, body: { note?: string; fileUrl?: string }) =>
    request<{ submission: import("./types").Submission }>(
      `/api/assignments/${assignmentId}/submit`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  gradeSubmission: (submissionId: string, body: { grade: number; feedback?: string }) =>
    request<{ submission: import("./types").Submission }>(
      `/api/submissions/${submissionId}/grade`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),

  // CERTIFICATES
  certificateEligibility: (courseId: string) =>
    request<{ eligibility: CertificateEligibility; issued: boolean }>(
      `/api/certificates/eligibility?courseId=${encodeURIComponent(courseId)}`
    ),

  certificates: () => request<{ certificates: Certificate[] }>("/api/certificates"),

  issueCertificate: (courseId: string) =>
    request<{ certificate: Certificate; alreadyIssued?: boolean }>("/api/certificates", {
      method: "POST",
      body: JSON.stringify({ courseId }),
    }),

  verifyCertificate: (code: string) =>
    request<{
      valid: boolean;
      serial: string;
      issuedAt: string;
      revokedAt: string | null;
      holderName: string;
      courseTitle: string;
      issuerName: string;
      academy: string;
    }>(`/api/certificates/verify/${encodeURIComponent(code)}`),

  // LIVE INTERACTION
  polls: (classId: string) =>
    request<{ polls: Poll[] }>(`/api/live/${classId}/polls`),

  createPoll: (classId: string, body: { question: string; options: string[] }) =>
    request<{ poll: Poll }>(`/api/live/${classId}/polls`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  votePoll: (pollId: string, optionIndex: number) =>
    request<{ success: boolean }>(`/api/polls/${pollId}/vote`, {
      method: "POST",
      body: JSON.stringify({ optionIndex }),
    }),

  endPoll: (pollId: string) =>
    request<{ poll: Poll }>(`/api/polls/${pollId}`, {
      method: "PATCH",
      body: JSON.stringify({ endedAt: new Date().toISOString() }),
    }),
};
