"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/sheegow/app-shell";
import { BundleCheckoutView } from "@/components/sheegow/views/bundle-checkout-view";

export default function BundleCheckoutPage() {
  const params = useParams<{ bundleId: string }>();
  const bundleId =
    typeof params?.bundleId === "string" ? params.bundleId : "";
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
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
        </div>
      ) : user ? (
        <BundleCheckoutView bundleId={bundleId} />
      ) : null}
    </AppShell>
  );
}
