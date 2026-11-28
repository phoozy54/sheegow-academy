// SHEEGOW ACADEMY — global UI store (Zustand)
//
// Navigation is now handled by the Next.js App Router (useRouter / Link / URL
// params). This store only retains cross-cutting client UI state: the current
// user, the auth modal, the mobile nav drawer and cookie consent.
import { create } from "zustand";
import type { User } from "./types";

interface AppState {
  // Auth
  user: User | null;
  authLoading: boolean;

  // Auth modal (login / register overlay shown from anywhere)
  authModal: "login" | "register" | null;

  // Mobile menu (navbar sheet)
  mobileMenuOpen: boolean;

  // Cookie consent banner
  cookieConsent: "accepted" | "rejected" | null;

  // Actions
  openAuthModal: (modal: "login" | "register") => void;
  closeAuthModal: () => void;
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setCookieConsent: (consent: "accepted" | "rejected") => void;
}

/**
 * G1 / CONSENT-1: mirror the UI choice into a signed, HttpOnly cookie so the
 * analytics endpoint can enforce consent server-side. Fire-and-forget — a
 * network failure must never block the banner.
 */
function syncConsentCookie(consent: "accepted" | "rejected") {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ consent }),
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    /* offline / restricted environment */
  }
}

export const useStore = create<AppState>((set) => ({
  user: null,
  authLoading: true,
  authModal: null,
  mobileMenuOpen: false,
  cookieConsent: null,

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
    syncConsentCookie(consent);
  },
}));

/** Initialize cookie consent from localStorage on the client. */
export function initCookieConsent() {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("sheegow-cookie-consent");
    if (stored === "accepted" || stored === "rejected") {
      useStore.setState({ cookieConsent: stored });
      // Returning users chose before the signed cookie existed — re-issue it.
      syncConsentCookie(stored);
    }
  } catch {
    /* ignore */
  }
}
