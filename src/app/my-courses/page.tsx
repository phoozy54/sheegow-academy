"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/sheegow/app-shell";
import { MyCoursesView } from "@/components/sheegow/views/my-courses-view";

export default function MyCoursesPage() {
  const { user, authLoading, openAuthModal } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal("login");
      router.replace("/");
    }
  }, [authLoading, user, openAuthModal, router]);

  return (
    <AppShell>
      {authLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : user ? (
        <MyCoursesView />
      ) : null}
    </AppShell>
  );
}
