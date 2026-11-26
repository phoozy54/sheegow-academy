"use client";

/**
 * Floating comparison tray.
 *
 * Renders a sticky bar at the bottom of the viewport whenever the visitor has
 * at least one course queued for comparison. Shows the selected course titles
 * (with thumbnails), a "Compare now" CTA and a "Clear all" action. Hidden on
 * the /compare page itself (the page already renders its own table).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { useCompareStore } from "@/lib/compare-store";
import { api } from "@/lib/api";
import type { Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";
import { GitCompare, X, Trash2, ArrowRight } from "lucide-react";

/** Lightweight projection used by the tray — only what the bar needs to show. */
type MiniCourse = Pick<Course, "id" | "title" | "image">;

export function CompareTray() {
  const t = useT();
  const pathname = usePathname();
  const { ids, remove, clear } = useCompareStore();
  const [courses, setCourses] = useState<MiniCourse[]>([]);
  const [loading, setLoading] = useState(false);

  // Suppress the tray on the /compare page itself — the page renders the
  // full comparison table so a second floating bar would be redundant.
  const isComparePage = pathname === "/compare";
  const visible = !isComparePage && ids.length > 0;

  // Hydration guard: the persisted store reads from localStorage on the
  // client. Render nothing on the server + first paint to avoid a flash.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Fetch lightweight course previews whenever the queued ids change.
  useEffect(() => {
    if (!mounted || ids.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCourses([]);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .courses({ limit: 50 })
      .then((res) => {
        if (!active) return;
        const byId = new Map(res.items.map((c) => [c.id, c]));
        const ordered = ids
          .map((id) => byId.get(id))
          .filter((c): c is Course => Boolean(c))
          .map((c) => ({
            id: c.id,
            title: c.title,
            image: c.image ?? null,
          }));
        setCourses(ordered);
      })
      .catch(() => {
        if (active) setCourses([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ids, mounted]);

  if (!mounted || !visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-2 pb-2 sm:px-4 sm:pb-4"
      role="region"
      aria-label={t("compare.title")}
    >
      <div className="mx-auto max-w-5xl rounded-2xl border bg-card/95 p-3 shadow-2xl shadow-indigo-500/10 backdrop-blur sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Header + count */}
          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-start">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <GitCompare className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold text-foreground">
                {t("compare.trayCount", { count: ids.length })}
              </span>
            </div>
          </div>

          {/* Selected courses (scrollable on mobile) */}
          <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1">
            {loading ? (
              Array.from({ length: ids.length }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-40 shrink-0" />
              ))
            ) : (
              courses.map((c) => (
                <div
                  key={c.id}
                  className="group flex shrink-0 items-center gap-2 rounded-lg border bg-background px-2 py-1.5"
                >
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                    {c.image ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        src={c.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <span className="max-w-[8rem] truncate text-xs font-semibold text-foreground">
                    {c.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      remove(c.id);
                      toast.success(t("compare.removed"));
                    }}
                    aria-label={t("compare.remove")}
                    className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clear();
                toast.success(t("compare.clear"));
              }}
              className="gap-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("compare.clear")}</span>
            </Button>
            <Button
              asChild
              size="sm"
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              <Link href="/compare">
                {t("compare.compareNow")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {ids.length >= 3 && (
          <p className="mt-1.5 text-[11px] font-medium text-amber-600">
            {t("compare.trayMax")}
          </p>
        )}
      </div>
    </div>
  );
}
