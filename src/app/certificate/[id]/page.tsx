"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/sheegow/app-shell";
import { CertificateView } from "@/components/sheegow/views/certificate-view";

export default function CertificatePage() {
  // The [id] segment is reserved for future per-certificate deep links; the
  // current view lists all of the user's certificates.
  useParams<{ id: string }>();
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
        <CertificateView />
      ) : null}
    </AppShell>
  );
}
