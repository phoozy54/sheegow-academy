"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useStore, initCookieConsent } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Cookie, X, Check } from "lucide-react";

/**
 * Cookie consent banner — shows on first visit, persists choice in localStorage.
 * Appears as a fixed bottom sheet on mobile (full-width) and a floating card on desktop.
 */
export function CookieConsent() {
  const { cookieConsent, setCookieConsent } = useStore();

  useEffect(() => {
    initCookieConsent();
  }, []);

  // Don't render if already decided or still loading
  if (cookieConsent !== null) return null;

  return (
    <div
      className="no-print fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-3 sm:px-4 sm:pb-4"
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
    >
      <div className="w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-300 rounded-2xl border border-indigo-100 bg-card/95 p-4 shadow-2xl shadow-indigo-500/10 backdrop-blur-lg sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {/* Icon */}
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:flex">
            <Cookie className="h-6 w-6" />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Cookie className="h-4 w-4 text-indigo-600 sm:hidden" />
              <h2 className="text-sm font-bold text-foreground sm:text-base">
                Cookies & Privacy
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              We use cookies to keep you logged in, remember your preferences,
              and improve your learning experience. By clicking &ldquo;Accept&rdquo;,
              you agree to our use of cookies. Read our{" "}
              <Link
                href="/privacy"
                className="font-medium text-indigo-600 underline-offset-2 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCookieConsent("rejected")}
              className="h-9 px-3 text-xs sm:text-sm"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() => setCookieConsent("accepted")}
              className="h-9 bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 text-xs shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700 sm:text-sm"
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
