"use client";

/**
 * Landing page referral banner.
 *
 * When the visitor lands on the site with a `?ref=CODE` query param (e.g. by
 * following a friend's referral link), this component renders a dismissible
 * banner at the top of the page: "You were referred by a friend! Sign up to
 * get 10% off your first course."
 *
 * Logged-in visitors see nothing — they've already signed up, so the referral
 * flow no longer applies to them. The banner is also hidden after the visitor
 * dismisses it (persisted in sessionStorage so it doesn't nag them across
 * reloads during the same session).
 */
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Gift, X, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";

/** Default discount shown to the referred visitor. */
const REFERRAL_DISCOUNT = 10;
/** sessionStorage key used to remember dismissal per-browser. */
const DISMISS_KEY = "sheegow-ref-banner-dismissed";

export function ReferralBanner() {
  const t = useT();
  const { user, openAuthModal } = useStore();
  const [refCode, setRefCode] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

  // Read the ref code from the URL on the client (avoids SSR hydration
  // mismatches — the server never sees the param) and respect the dismissal
  // flag from sessionStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const code = new URLSearchParams(window.location.search).get("ref");
      if (code && code.trim()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRefCode(code.trim().toUpperCase());
      }
      if (window.sessionStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      /* sessionStorage may be unavailable — the banner just won't dismiss */
    }
  }, []);

  // Don't render for logged-in visitors (they've already signed up) or when
  // the visitor has dismissed the banner this session.
  if (!refCode || dismissed || user) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore — best-effort */
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-30 border-b border-emerald-200 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:justify-center sm:py-2.5 sm:pr-12">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 sm:flex">
            <Gift className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium sm:text-[15px]">
            {t("referral.banner", { discount: REFERRAL_DISCOUNT })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            onClick={() => openAuthModal("register")}
            className="gap-1.5 bg-white text-emerald-700 shadow-sm hover:bg-emerald-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("referral.bannerCta")}
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t("referral.bannerDismiss")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
