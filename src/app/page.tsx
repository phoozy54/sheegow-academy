"use client";

import { useStore } from "@/lib/store";
import { Navbar } from "@/components/sheegow/navbar";
import { Footer } from "@/components/sheegow/footer";
import { HomeView } from "@/components/sheegow/views/home-view";
import { CoursesView } from "@/components/sheegow/views/courses-view";
import { CourseDetailView } from "@/components/sheegow/views/course-detail-view";
import { LiveClassesView } from "@/components/sheegow/views/live-classes-view";
import { LiveRoomView } from "@/components/sheegow/views/live-room-view";
import { AboutView } from "@/components/sheegow/views/about-view";
import { ContactView } from "@/components/sheegow/views/contact-view";
import { UnifiedDashboard } from "@/components/sheegow/views/unified-dashboard";
import { MyCoursesView } from "@/components/sheegow/views/my-courses-view";
import { ProfileView } from "@/components/sheegow/views/profile-view";
import { CheckoutView } from "@/components/sheegow/views/checkout-view";

export default function Home() {
  const { view } = useStore();

  // The dashboard and admin views both render the UnifiedDashboard — a single
  // portal where students, teachers, and admins all access their tools.
  const isDashboard = view === "dashboard" || view === "admin";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {view === "home" && <HomeView />}
        {view === "courses" && <CoursesView />}
        {view === "course-detail" && <CourseDetailView />}
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
    </div>
  );
}
