// SHEEGOW ACADEMY — shared types

export type Role = "student" | "teacher" | "admin";
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
