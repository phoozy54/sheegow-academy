// SHEEGOW ACADEMY — frontend API client
import type {
  AdminCourseOverview,
  Announcement,
  ApplyReferralResult,
  Assignment,
  Bundle,
  BundleCheckoutResult,
  BundleWithCourses,
  Certificate,
  CertificateEligibility,
  CompareCourse,
  ConversationSummary,
  Course,
  DirectMessageItem,
  DiscussionThreadDetail,
  DiscussionThreadSummary,
  Enrollment,
  GamificationData,
  GradebookData,
  Invoice,
  LeaderboardResponse,
  Lesson,
  LessonNote,
  LiveClass,
  Material,
  Module,
  Notification,
  NotificationListResponse,
  Payment,
  Poll,
  Quiz,
  QuizResult,
  RatingBreakdown,
  ReferralStats,
  RefundRequest,
  Review,
  Roadmap,
  SearchResponse,
  Stats,
  TeacherApplication,
  TeacherApplicationInput,
  TeacherApplicationStatus,
  TrialRequest,
  User,
  WishlistItem,
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

/**
 * G1 / SW-1: after logout or password change, remove every cached page so a
 * private screen cannot be reopened offline on a shared device. The worker
 * also receives a message so an already-active registration drops its caches.
 * Never throws — cache cleanup must not break the auth flow.
 */
async function purgeAppCaches(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if ("caches" in window) {
      const keys = await window.caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("sheegow-"))
          .map((key) => window.caches.delete(key)),
      );
    }
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      registration?.active?.postMessage({ type: "CACHE_PURGE" });
    }
  } catch {
    /* Private mode / disabled storage — nothing to purge. */
  }
}

async function authChanging<T>(work: () => Promise<T>): Promise<T> {
  try {
    const result = await work();
    await purgeAppCaches();
    return result;
  } catch (error) {
    // Even a failed server logout should leave this device with no stale data.
    await purgeAppCaches();
    throw error;
  }
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
    /** Optional referral code (?ref=CODE) — auto-links on signup. */
    ref?: string;
  }) => {
    // Forward the referral code as a `ref` query param so the server can
    // auto-link it during registration. The body is preserved as-is.
    const ref = body.ref?.trim();
    const url = ref
      ? `/api/auth/register?ref=${encodeURIComponent(ref)}`
      : "/api/auth/register";
    // Strip `ref` from the body — it's already in the query string.
    const { ref: _omit, ...payload } = body;
    void _omit;
    return request<{ user: User }>(url, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

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

  logout: () =>
    authChanging(() =>
      request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),
    ),

  me: () => request<{ user: User | null }>("/api/auth/me"),

  refresh: () => request<{ user: User }>("/api/auth/refresh", { method: "POST" }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    authChanging(() =>
      request<{ success: boolean }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    ),

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

  course: (id: string) =>
    request<{ course: Course; ratingBreakdown: RatingBreakdown }>(
      `/api/courses/${id}`
    ),

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

  /** Global search across courses, live classes and (for admins/teachers) users.
   *  Returns an empty payload when the query is shorter than 2 characters.
   *  The default limit is 5 results per category; pass a higher number on the
   *  dedicated search page to surface more matches. */
  search: (query: string, limit?: number) => {
    const q = new URLSearchParams();
    const trimmed = query.trim();
    if (trimmed) q.set("q", trimmed);
    if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
      q.set("limit", String(Math.min(Math.floor(limit), 50)));
    }
    return request<SearchResponse>(`/api/search?${q.toString()}`);
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

  // ANNOUNCEMENTS — course-scoped posts visible to enrolled students.
  announcements: (courseId: string) =>
    request<{ announcements: Announcement[] }>(
      `/api/courses/${courseId}/announcements`
    ),

  createAnnouncement: (
    courseId: string,
    body: { title: string; body: string }
  ) =>
    request<{ announcement: Announcement }>(
      `/api/courses/${courseId}/announcements`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  deleteAnnouncement: (courseId: string, announcementId: string) =>
    request<{ success: boolean }>(
      `/api/courses/${courseId}/announcements/${announcementId}`,
      { method: "DELETE" }
    ),

  // INVOICE — printable receipt data for a completed payment.
  invoice: (paymentId: string) =>
    request<Invoice>(`/api/payments/${paymentId}/invoice`),

  // ─── DISCUSSION / Q&A ─────────────────────────────────
  // Students ask questions, teachers/admins answer. Threaded replies.

  threads: (courseId: string) =>
    request<{ threads: DiscussionThreadSummary[] }>(
      `/api/courses/${courseId}/threads`
    ),

  createThread: (
    courseId: string,
    body: { title: string; body: string; lessonId?: string }
  ) =>
    request<{ thread: DiscussionThreadDetail }>(
      `/api/courses/${courseId}/threads`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  thread: (courseId: string, threadId: string) =>
    request<{ thread: DiscussionThreadDetail }>(
      `/api/courses/${courseId}/threads/${threadId}`
    ),

  updateThread: (
    courseId: string,
    threadId: string,
    body: { isResolved: boolean }
  ) =>
    request<{ thread: DiscussionThreadDetail }>(
      `/api/courses/${courseId}/threads/${threadId}`,
      { method: "PATCH", body: JSON.stringify(body) }
    ),

  deleteThread: (courseId: string, threadId: string) =>
    request<{ success: boolean }>(
      `/api/courses/${courseId}/threads/${threadId}`,
      { method: "DELETE" }
    ),

  replyToThread: (courseId: string, threadId: string, body: { body: string }) =>
    request<{ reply: import("./types").DiscussionReply }>(
      `/api/courses/${courseId}/threads/${threadId}/replies`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  // ─── GRADEBOOK ────────────────────────────────────────
  // Teacher/admin per-course gradebook view (quizzes + assignments).

  gradebook: (courseId: string) =>
    request<GradebookData>(`/api/courses/${courseId}/gradebook`),

  /**
   * Teacher/admin: download a CSV snapshot of student progress for a course.
   * Returns a Blob (text/csv) that the caller can turn into an object URL and
   * trigger as a browser download. Uses a raw fetch because the response is
   * not JSON; the standard `request` helper parses JSON and would mangle it.
   */
  exportCourseProgressCsv: async (courseId: string): Promise<Blob> => {
    const res = await fetch(`/api/courses/${courseId}/export`, {
      credentials: "include",
    });
    if (!res.ok) {
      // Try to surface the JSON error message from the standard error shape.
      let message = "Failed to export CSV";
      try {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (data.error) message = data.error;
      } catch {
        /* ignore — non-JSON error body */
      }
      throw new ApiError(message, res.status);
    }
    return res.blob();
  },

  // ─── STUDENT NOTES ────────────────────────────────────
  // Personal notes tied to one student + one lesson (auto-saved by the player).

  lessonNote: (lessonId: string) =>
    request<{ note: LessonNote | null }>(`/api/lessons/${lessonId}/notes`),

  saveLessonNote: (lessonId: string, body: { content: string }) =>
    request<{ note: LessonNote }>(`/api/lessons/${lessonId}/notes`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteLessonNote: (lessonId: string, noteId: string) =>
    request<{ success: boolean }>(`/api/lessons/${lessonId}/notes/${noteId}`, {
      method: "DELETE",
    }),

  // ─── DIRECT MESSAGING ─────────────────────────────────
  // Private 1-to-1 conversations between any two users.

  conversations: () =>
    request<{ conversations: ConversationSummary[] }>(`/api/conversations`),

  startConversation: (userId: string) =>
    request<{ conversation: ConversationSummary }>(`/api/conversations`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  conversationMessages: (conversationId: string) =>
    request<{ messages: DirectMessageItem[] }>(
      `/api/conversations/${conversationId}/messages`
    ),

  sendDirectMessage: (conversationId: string, body: { body: string }) =>
    request<{ message: DirectMessageItem }>(
      `/api/conversations/${conversationId}/messages`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  // ─── WISHLIST / FAVORITES ─────────────────────────────
  // Per-user list of courses saved for later. Stored on the server so it syncs
  // across devices once a student logs in.

  wishlist: () =>
    request<{ items: WishlistItem[] }>("/api/wishlist"),

  addToWishlist: (courseId: string) =>
    request<{ item: WishlistItem; alreadyExists?: boolean }>("/api/wishlist", {
      method: "POST",
      body: JSON.stringify({ courseId }),
    }),

  removeFromWishlist: (courseId: string) =>
    request<{ success: boolean }>(`/api/wishlist/${encodeURIComponent(courseId)}`, {
      method: "DELETE",
    }),

  /** Quick lookup used by course cards to show a filled heart. */
  isWishlisted: (courseId: string) =>
    request<{ wishlisted: boolean }>(
      `/api/wishlist/${encodeURIComponent(courseId)}`
    ),

  // ─── NOTIFICATIONS ────────────────────────────────────
  // In-app bell notifications. Polling is handled by the NotificationBell
  // component (every 30s while closed). Marking as read on click drives the
  // unread badge to zero.

  notifications: () =>
    request<NotificationListResponse>("/api/notifications"),

  markAllNotificationsRead: () =>
    request<{ success: boolean }>("/api/notifications", { method: "POST" }),

  markNotificationRead: (id: string) =>
    request<{ notification: Notification }>(`/api/notifications/${id}`, {
      method: "PATCH",
    }),

  deleteNotification: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}`, {
      method: "DELETE",
    }),

  // ─── COURSE BUNDLES ───────────────────────────────────
  // A bundle is a discounted package of multiple courses. Students buy the
  // bundle once and are auto-enrolled in every included course.

  /** Public list of active bundles with their courses (teacher + image). */
  bundles: () =>
    request<{ bundles: BundleWithCourses[] }>("/api/bundles"),

  /** Single bundle with courses — used by the bundle checkout page. */
  bundle: (id: string) =>
    request<{ bundle: BundleWithCourses }>(`/api/bundles/${id}`),

  /** Admin: create a new bundle. Pass `courseIds` to set the included courses. */
  createBundle: (body: {
    title: string;
    description: string;
    price: number;
    image?: string;
    courseIds: string[];
    isActive?: boolean;
  }) =>
    request<{ bundle: Bundle }>("/api/bundles", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Admin: update a bundle's metadata and the courses it contains. */
  updateBundle: (
    id: string,
    body: Partial<{
      title: string;
      description: string;
      price: number;
      image: string | null;
      courseIds: string[];
      isActive: boolean;
    }>
  ) =>
    request<{ bundle: Bundle }>(`/api/bundles/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  /** Admin: permanently delete a bundle (cascade removes BundleCourse rows). */
  deleteBundle: (id: string) =>
    request<{ success: boolean }>(`/api/bundles/${id}`, {
      method: "DELETE",
    }),

  /** Authed: purchase a bundle. Creates a payment + enrolls the student in
   *  every included course in one transaction. */
  checkoutBundle: (id: string, body: { method: string; couponCode?: string }) =>
    request<BundleCheckoutResult>(`/api/bundles/${id}/checkout`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ─── REFUND REQUESTS ──────────────────────────────────
  // Students ask for their money back on a completed payment. Admins review
  // the request from the admin console. Approving flips payment.status to
  // "refunded" and notifies the student.

  /** List refund requests. Students see their own; admins see all. */
  refunds: () => request<{ refunds: RefundRequest[] }>("/api/refunds"),

  /** Get a single refund request by id. */
  refund: (id: string) =>
    request<{ refund: RefundRequest }>(`/api/refunds/${id}`),

  /** Create a refund request for a completed payment. Body: { paymentId, reason }. */
  createRefund: (body: { paymentId: string; reason: string }) =>
    request<{ refund: RefundRequest }>("/api/refunds", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Admin: approve or reject a refund request. When approved, the payment
   *  status is flipped to "refunded" and the student is notified. */
  decideRefund: (
    id: string,
    body: { status: "approved" | "rejected"; adminNote?: string }
  ) =>
    request<{ refund: RefundRequest }>(`/api/refunds/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  // ─── GAMIFICATION ─────────────────────────────────────
  // Points, daily streaks and badges. /api/me/gamification returns the
  // current viewer's data; /api/leaderboard returns the top 10 students.

  /** Authed: returns the caller's points, streak and earned badges. */
  gamification: () =>
    request<GamificationData>("/api/me/gamification"),

  /** Public: top 10 students by points. When the caller is signed in,
   *  the response also includes their own rank + entry (even if outside top 10). */
  leaderboard: () =>
    request<LeaderboardResponse>("/api/leaderboard"),

  // ─── TEACHER APPLICATIONS ────────────────────────────
  // Students apply to become teachers; admins review and approve (which
  // upgrades the user's role to "teacher") or reject. Approving/rejecting
  // also notifies the applicant in-app.

  /** Authed: list applications. Students see their own; admins see all. */
  teacherApplications: () =>
    request<{ applications: TeacherApplication[] }>(
      "/api/teacher-applications"
    ),

  /** Authed: get a single application (own or admin). */
  teacherApplication: (id: string) =>
    request<{ application: TeacherApplication }>(
      `/api/teacher-applications/${id}`
    ),

  /** Student: submit a new teacher application. */
  createTeacherApplication: (body: TeacherApplicationInput) =>
    request<{ application: TeacherApplication }>(
      "/api/teacher-applications",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    ),

  /** Admin: update an application's status (under_review | approved | rejected)
   *  and attach an optional admin note. Approving upgrades the applicant's
   *  role to "teacher" and notifies them; rejecting notifies them with the
   *  reason. */
  decideTeacherApplication: (
    id: string,
    body: { status: TeacherApplicationStatus; adminNote?: string }
  ) =>
    request<{ application: TeacherApplication }>(
      `/api/teacher-applications/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    ),

  // ─── AFFILIATE / REFERRAL ────────────────────────────
  // Students get a unique referral code (e.g. "AHMED10"). When someone signs
  // up via their link, the referred student gets a one-time discount coupon
  // and the referrer accumulates successful referrals. Stats are shown on
  // the dashboard referral widget.

  /** Authed: returns the caller's referral code (if any) + aggregate stats. */
  referralStats: () => request<ReferralStats>("/api/referral"),

  /** Authed: claim a referral code. Auto-generates one from the user's name
   *  when no `code` is supplied. Returns the existing code if already set. */
  generateReferralCode: (body?: { code?: string }) =>
    request<{ code: ReferralStats }>("/api/referral", {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),

  /** Authed: apply a referral code. Validates the code, creates a Referral
   *  record and generates a one-time discount coupon for the caller. */
  applyReferralCode: (body: { code: string }) =>
    request<ApplyReferralResult>("/api/referral/apply", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ─── COURSE COMPARISON ───────────────────────────────
  // Up to 3 courses can be compared side-by-side. The compare tray (floating
  // bottom bar) holds the selected course ids and the compare page renders
  // the comparison table.

  /** Public: returns comparison data for up to 3 courses by id. */
  compareCourses: (ids: string[]) => {
    const q = new URLSearchParams();
    q.set("ids", ids.filter(Boolean).join(","));
    return request<{ courses: CompareCourse[] }>(
      `/api/courses/compare?${q.toString()}`
    );
  },
};
