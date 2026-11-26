"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/sheegow/app-shell";

// Lazy-load the heavy CoursePlayerView (35KB) — only loads when user
// actually starts a lesson.
const CoursePlayerView = dynamic(
  () =>
    import("@/components/sheegow/views/course-player-view").then(
      (m) => m.CoursePlayerView
    ),
  {
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
      </div>
    ),
    ssr: false,
  }
);

export default function LearnPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = typeof params?.courseId === "string" ? params.courseId : "";
  const { user, authLoading, openAuthModal } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal("login");
      router.replace("/");
    }
  }, [authLoading, user, openAuthModal, router]);

  return (
    <AppShell showFooter={false}>
      {authLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        </div>
      ) : user ? (
        <CoursePlayerView courseId={courseId} />
      ) : null}
    </AppShell>
  );
}
