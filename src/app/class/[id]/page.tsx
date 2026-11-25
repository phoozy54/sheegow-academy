"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/sheegow/app-shell";

// Lazy-load the heavy LiveRoomView (63KB) — only loads when user
// actually joins a live class.
const LiveRoomView = dynamic(
  () =>
    import("@/components/sheegow/views/live-room-view").then(
      (m) => m.LiveRoomView
    ),
  {
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </div>
    ),
    ssr: false,
  }
);

export default function ClassRoomPage() {
  const params = useParams<{ id: string }>();
  const classId = typeof params?.id === "string" ? params.id : "";
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
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : user ? (
        <LiveRoomView classId={classId} />
      ) : null}
    </AppShell>
  );
}
