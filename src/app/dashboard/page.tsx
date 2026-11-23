"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/sheegow/app-shell";
import { UnifiedDashboard } from "@/components/sheegow/views/unified-dashboard";

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
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : user ? (
        // UnifiedDashboard uses useSearchParams, so it needs a Suspense boundary.
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            </div>
          }
        >
          <UnifiedDashboard />
        </Suspense>
      ) : null}
    </AppShell>
  );
}
