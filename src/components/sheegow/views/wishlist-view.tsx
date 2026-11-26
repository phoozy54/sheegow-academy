"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Course, WishlistItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart,
  LogIn,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { CourseCard } from "../course-card";
import { useT } from "@/lib/i18n";

export function WishlistView() {
  const t = useT();
  const { user, authLoading, openAuthModal } = useStore();
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .wishlist()
      .then((r) => {
        if (active) setItems(r.items);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  // ─── Auth gate ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm">{t("wishlist.loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <LogIn className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold">{t("wishlist.pleaseLogin")}</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {t("wishlist.loginToSee")}
          </p>
          <Button
            onClick={() => openAuthModal("login")}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
          >
            Log in
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            <Heart className="h-7 w-7 fill-rose-500 text-rose-500" />
            {t("wishlist.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("wishlist.headerDesc")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 font-semibold text-rose-700">
            <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
            {items.length} {t("wishlist.saved")}
          </span>
        </div>
      </div>

      {/* ─── Grid ──────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden p-0">
              <Skeleton className="aspect-[16/9] w-full" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-9 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyWishlist onBrowse={() => router.push("/courses")} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const course = item.course;
            if (!course) return null;
            // Pass the list of all wishlisted titles so CourseCard can build a
            // pretty /courses/<slug> URL for each one. The heart on each card
            // already toggles wishlist state, so it doubles as the "remove"
            // action here — no separate button is needed.
            const all = items
              .map((i) => i.course)
              .filter((c): c is Course => !!c)
              .map((c) => ({ id: c.id, title: c.title }));
            return (
              <CourseCard
                key={item.id}
                course={course}
                enrollment={null}
                all={all}
                wishlisted
                // Drop the card from the grid when the user un-favorites it
                // via the heart. Optimistic — keeps the page in sync without
                // a full refetch.
                onWishlistToggle={(courseId, nowWishlisted) => {
                  if (!nowWishlisted) {
                    setItems((prev) => prev.filter((i) => i.courseId !== courseId));
                  }
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyWishlist({ onBrowse }: { onBrowse: () => void }) {
  const t = useT();
  return (
    <Card className="p-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
        <Heart className="h-8 w-8 text-rose-400" />
      </div>
      <h3 className="mb-1 text-lg font-bold">{t("wishlist.emptyTitle")}</h3>
      <p className="mb-5 mx-auto max-w-sm text-sm text-muted-foreground">
        {t("wishlist.emptyDesc")}
      </p>
      <Button
        onClick={onBrowse}
        className="gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
      >
        <Sparkles className="h-4 w-4" />
        {t("cta.browseCourses")}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Card>
  );
}
