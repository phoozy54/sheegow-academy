"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/sheegow/app-shell";
import { WishlistView } from "@/components/sheegow/views/wishlist-view";

export default function WishlistPage() {
  const { user, authLoading, openAuthModal } = useStore();
  const router = useRouter();

  // Protected route — bounce anonymous users home and prompt login.
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
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        </div>
      ) : user ? (
        <WishlistView />
      ) : null}
    </AppShell>
  );
}
