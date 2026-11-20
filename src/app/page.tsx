"use client";

import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import { Navbar } from "@/components/sheegow/navbar";
import { Footer } from "@/components/sheegow/footer";
import { CookieConsent } from "@/components/sheegow/cookie-consent";
import { HomeView } from "@/components/sheegow/views/home-view";
import { CoursesView } from "@/components/sheegow/views/courses-view";
import { CourseDetailView } from "@/components/sheegow/views/course-detail-view";
import { AboutView } from "@/components/sheegow/views/about-view";
import { ContactView } from "@/components/sheegow/views/contact-view";
import { AppLinkBridge } from "@/components/sheegow/app-link-bridge";

function ViewLoading() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
    </div>
  );
}

// Heavy, authenticated-only views are never needed for the first paint. These
// modules use named exports, so map each one to the default dynamic expects.
const CoursePlayerView = dynamic(
  () =>
    import("@/components/sheegow/views/course-player-view").then(
      (m) => m.CoursePlayerView,
    ),
  { ssr: false, loading: ViewLoading },
);
const LibraryView = dynamic(
  () => import("@/components/sheegow/views/library-view").then((m) => m.LibraryView),
  { ssr: false, loading: ViewLoading },
);
const CertificateView = dynamic(
  () =>
    import("@/components/sheegow/views/certificate-view").then(
      (m) => m.CertificateView,
    ),
  { ssr: false, loading: ViewLoading },
);
const LiveClassesView = dynamic(
  () =>
    import("@/components/sheegow/views/live-classes-view").then(
      (m) => m.LiveClassesView,
    ),
  { ssr: false, loading: ViewLoading },
);
const LiveRoomView = dynamic(
  () =>
    import("@/components/sheegow/views/live-room-view").then(
      (m) => m.LiveRoomView,
    ),
  { ssr: false, loading: ViewLoading },
);
const UnifiedDashboard = dynamic(
  () =>
    import("@/components/sheegow/views/unified-dashboard").then(
      (m) => m.UnifiedDashboard,
    ),
  { ssr: false, loading: ViewLoading },
);
const MyCoursesView = dynamic(
  () =>
    import("@/components/sheegow/views/my-courses-view").then(
      (m) => m.MyCoursesView,
    ),
  { ssr: false, loading: ViewLoading },
);
const ProfileView = dynamic(
  () => import("@/components/sheegow/views/profile-view").then((m) => m.ProfileView),
  { ssr: false, loading: ViewLoading },
);
const CheckoutView = dynamic(
  () => import("@/components/sheegow/views/checkout-view").then((m) => m.CheckoutView),
  { ssr: false, loading: ViewLoading },
);

export default function Home() {
  const { view } = useStore();

  // The dashboard and admin views both render the UnifiedDashboard — a single
  // portal where students, teachers, and admins all access their tools.
  const isDashboard = view === "dashboard" || view === "admin";

  return (
    <div className="flex min-h-screen flex-col">
      <AppLinkBridge />
      <Navbar />
      <main className="flex-1">
        {view === "home" && <HomeView />}
        {view === "courses" && <CoursesView />}
        {view === "course-detail" && <CourseDetailView />}
        {view === "course-player" && <CoursePlayerView />}
        {view === "library" && <LibraryView />}
        {view === "certificate" && <CertificateView />}
        {view === "live" && <LiveClassesView />}
        {view === "live-room" && <LiveRoomView />}
        {view === "about" && <AboutView />}
        {view === "contact" && <ContactView />}
        {isDashboard && <UnifiedDashboard />}
        {view === "my-courses" && <MyCoursesView />}
        {view === "profile" && <ProfileView />}
        {view === "checkout" && <CheckoutView />}
      </main>
      {isDashboard ? null : <Footer />}
      <CookieConsent />
    </div>
  );
}
