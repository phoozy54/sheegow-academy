"use client";

import type { ReactNode } from "react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { CookieConsent } from "./cookie-consent";

/**
 * Shell wrapper for the interactive "app" routes (dashboard, my-courses,
 * profile, checkout, learn, class, library, certificate). Wraps the page
 * content in the sticky Navbar + CookieConsent banner, and optionally a
 * Footer (hidden on full-bleed views like the dashboard).
 */
export function AppShell({
  children,
  showFooter = true,
}: {
  children: ReactNode;
  showFooter?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      {showFooter ? <Footer /> : null}
      <CookieConsent />
    </div>
  );
}
