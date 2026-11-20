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

  // Cookie consent
  cookieConsent: "accepted" | "rejected" | null;

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
  setCookieConsent: (consent: "accepted" | "rejected") => void;
}

/** Scroll to top instantly — used on every view change for a native-app feel. */
function scrollToTop() {
  if (typeof window === "undefined") return;
  // Instant scroll on mobile for snappy navigation; smooth on desktop.
  const behavior: ScrollBehavior =
    window.matchMedia("(min-width: 768px)").matches ? "smooth" : "auto";
  window.scrollTo({ top: 0, left: 0, behavior });
  // Also scroll the main element if it has its own scroll context (admin panel).
  const main = document.querySelector("main");
  if (main) main.scrollTo({ top: 0, left: 0, behavior });
}

export const useStore = create<AppState>((set, get) => ({
  view: "home",
  selectedCourseId: null,
  selectedClassId: null,
  checkoutCourseId: null,
  authModal: null,
  user: null,
  authLoading: true,
  mobileMenuOpen: false,
  cookieConsent: null,

  navigate: (view) => {
    set({ view, mobileMenuOpen: false });
    scrollToTop();
  },

  openCourse: (id) => {
    set({ view: "course-detail", selectedCourseId: id, mobileMenuOpen: false });
    scrollToTop();
  },

  openClass: (id) => {
    set({ view: "live-room", selectedClassId: id, mobileMenuOpen: false });
    scrollToTop();
  },

  openCheckout: (courseId) => {
    set({ view: "checkout", checkoutCourseId: courseId, mobileMenuOpen: false });
    scrollToTop();
  },

  openAuthModal: (modal) => set({ authModal: modal, mobileMenuOpen: false }),
  closeAuthModal: () => set({ authModal: null }),
  setUser: (user) => set({ user }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),

  setCookieConsent: (consent) => {
    set({ cookieConsent: consent });
    try {
      localStorage.setItem("sheegow-cookie-consent", consent);
    } catch {
      /* localStorage unavailable */
    }
  },
}));

/** Initialize cookie consent from localStorage on the client. */
export function initCookieConsent() {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("sheegow-cookie-consent");
    if (stored === "accepted" || stored === "rejected") {
      useStore.setState({ cookieConsent: stored });
    }
  } catch {
    /* ignore */
  }
}
