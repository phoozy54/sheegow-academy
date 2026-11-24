"use client";

import { Navbar } from "@/components/sheegow/navbar";
import { Footer } from "@/components/sheegow/footer";
import { CookieConsent } from "@/components/sheegow/cookie-consent";
import { HomeView } from "@/components/sheegow/views/home-view";
import { ReferralBanner } from "@/components/sheegow/referral-banner";

/**
 * Root route. The home page is rendered directly; every other "view" lives at
 * its own URL (e.g. /courses, /dashboard, /learn/[courseId]) and is handled by
 * the App Router. This shell provides the Navbar + Footer + CookieConsent that
 * wrap the home page. The ReferralBanner renders above the navbar when the
 * visitor arrived via a ?ref=CODE referral link.
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <ReferralBanner />
      <Navbar />
      <main id="main-content" className="flex-1">
        <HomeView />
      </main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
