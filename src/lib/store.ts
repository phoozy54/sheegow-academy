// SHEEGOW ACADEMY — global UI store (Zustand)
import { create } from "zustand";
import type { User } from "./types";

export type View =
  | "home"
  | "courses"
  | "course-detail"
  | "live"
  | "live-room"
  | "about"
  | "contact"
  | "login"
  | "register"
  | "dashboard"
  | "my-courses"
  | "profile"
  | "checkout"
  | "admin"
  | "admin-courses"
  | "admin-students"
  | "admin-live"
  | "admin-teachers";

interface AppState {
  // Navigation
  view: View;
  selectedCourseId: string | null;
  selectedClassId: string | null;
  checkoutCourseId: string | null;
  authModal: "login" | "register" | null;

  // Auth
  user: User | null;
  authLoading: boolean;

  // Mobile menu
  mobileMenuOpen: boolean;

  // Actions
  navigate: (view: View) => void;
  openCourse: (id: string) => void;
  openClass: (id: string) => void;
  openCheckout: (courseId: string) => void;
  openAuthModal: (modal: "login" | "register") => void;
  closeAuthModal: () => void;
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  view: "home",
  selectedCourseId: null,
  selectedClassId: null,
  checkoutCourseId: null,
  authModal: null,
  user: null,
  authLoading: true,
  mobileMenuOpen: false,

  navigate: (view) => {
    set({ view, mobileMenuOpen: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  openCourse: (id) =>
    set({ view: "course-detail", selectedCourseId: id, mobileMenuOpen: false }),

  openClass: (id) =>
    set({ view: "live-room", selectedClassId: id, mobileMenuOpen: false }),

  openCheckout: (courseId) =>
    set({ view: "checkout", checkoutCourseId: courseId, mobileMenuOpen: false }),

  openAuthModal: (modal) => set({ authModal: modal, mobileMenuOpen: false }),
  closeAuthModal: () => set({ authModal: null }),
  setUser: (user) => set({ user }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
}));
