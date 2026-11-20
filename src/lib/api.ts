// SHEEGOW ACADEMY — frontend API client
import type {
  Course,
  Enrollment,
  LiveClass,
  Payment,
  Review,
  Stats,
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
    phone: string;
    password: string;
  }) =>
    request<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
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
};
