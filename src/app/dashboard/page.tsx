"use client";

import { Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/sheegow/app-shell";

// Lazy-load the heavy UnifiedDashboard (70KB) — only loads when user
// actually visits /dashboard, not on every page.
const UnifiedDashboard = dynamic(
  () =>
    import("@/components/sheegow/views/unified-dashboard").then(
      (m) => m.UnifiedDashboard
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

export default function DashboardPage() {
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
        // UnifiedDashboard uses useSearchParams, so it needs a Suspense boundary.
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
            </div>
          }
        >
          <UnifiedDashboard />
        </Suspense>
      ) : null}
    </AppShell>
  );
}
