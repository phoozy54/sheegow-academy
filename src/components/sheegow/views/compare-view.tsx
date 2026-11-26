"use client";

/**
 * Course comparison view.
 *
 * Reads the queued course ids from the persisted compare store, fetches
 * comparison data for each via /api/courses/compare and renders a
 * side-by-side table. The page is responsive: a sticky header row on mobile
 * turns into a proper grid on desktop, with an Enroll + Remove action under
 * each column.
 *
 * Empty state: when the visitor hasn't queued any courses, the view surfaces
 * a friendly callout + a CTA to the catalog.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { CompareCourse } from "@/lib/types";
import { useCompareStore } from "@/lib/compare-store";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  Clock,
  Award,
  CheckCircle2,
  X,
  Trash2,
  GitCompare,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { cn, formatPrice, levelBadgeClass } from "@/lib/ui";
import { useT } from "@/lib/i18n";

export function CompareView() {
  const t = useT();
  const router = useRouter();
  const { user, openAuthModal } = useStore();
  const { ids, remove, clear } = useCompareStore();
  const [courses, setCourses] = useState<CompareCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comparison data whenever the queued ids change. We rely on the
  // persisted store — its first render is empty on the server, then it
  // hydrates from localStorage on the client.
  useEffect(() => {
    if (ids.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCourses([]);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    api
      .compareCourses(ids)
      .then((r) => {
        if (!active) return;
        setCourses(r.courses);
      })
      .catch((e) => {
        if (!active) return;
        const msg = e instanceof ApiError ? e.message : t("compare.loadFailed");
        setError(msg);
        setCourses([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ids, t]);

  const handleEnroll = (course: CompareCourse) => {
    if (!user) {
      openAuthModal("register");
      return;
    }
    router.push(`/checkout/${course.id}`);
  };

  /* ─── Empty state ───────────────────────────────────── */
  if (!loading && ids.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed bg-card/60 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
            <GitCompare className="h-8 w-8 text-indigo-500" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            {t("compare.emptyTitle")}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("compare.emptyDesc")}
          </p>
          <Button asChild className="mt-2 gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Link href="/courses">
              <BookOpen className="h-4 w-4" />
              {t("compare.browseCourses")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ─── Loading skeleton ──────────────────────────────── */
  if (loading && courses.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: Math.max(2, ids.length) }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  /* ─── Error state ───────────────────────────────────── */
  if (error && courses.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-24">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
          <p className="text-base font-semibold text-red-700">{error}</p>
          <Button
            variant="outline"
            onClick={() => clear()}
            className="mt-4 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            {t("compare.clear")}
          </Button>
        </div>
      </div>
    );
  }

  /* ─── Comparison table ──────────────────────────────── */
  // We render rows of (label, value1, value2, value3?) so the layout is a
  // vertical table where each course is a column. On mobile the table scrolls
  // horizontally — the first column (labels) is sticky so visitors can always
  // see which row they're reading.
  const rows: Array<{
    key: string;
    label: string;
    render: (c: CompareCourse) => React.ReactNode;
  }> = [
    {
      key: "image",
      label: t("compare.colImage"),
      render: (c) => (
        <div className="space-y-3">
          <div className="aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
            {c.image ? (
              <img
                loading="lazy"
                decoding="async"
                src={c.image}
                alt={c.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200">
                <BookOpen className="h-8 w-8 text-indigo-400" />
              </div>
            )}
          </div>
          <Link
            href={`/course/${c.id}`}
            className="block line-clamp-2 text-left text-sm font-bold text-foreground hover:text-indigo-600"
          >
            {c.title}
          </Link>
          <Button
            size="sm"
            className="w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            onClick={() => handleEnroll(c)}
          >
            {t("compare.enroll")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            onClick={() => {
              remove(c.id);
              toast.success(t("compare.removed"));
            }}
          >
            <X className="h-3.5 w-3.5" />
            {t("compare.remove")}
          </Button>
        </div>
      ),
    },
    {
      key: "level",
      label: t("compare.colLevel"),
      render: (c) => (
        <Badge variant="outline" className={cn("border", levelBadgeClass(c.level))}>
          {c.level}
        </Badge>
      ),
    },
    {
      key: "price",
      label: t("compare.colPrice"),
      render: (c) => (
        <span className="text-sm font-bold text-foreground">
          {formatPrice(c.price)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">USD</span>
        </span>
      ),
    },
    {
      key: "duration",
      label: t("compare.colDuration"),
      render: (c) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {t("compare.weeks", { count: c.duration })}
        </span>
      ),
    },
    {
      key: "rating",
      label: t("compare.colRating"),
      render: (c) => (
        <div className="flex items-center gap-1.5 text-sm">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-bold text-foreground">{c.rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">
            ({t("compare.reviews", { count: c.reviewCount })})
          </span>
        </div>
      ),
    },
    {
      key: "teacher",
      label: t("compare.colTeacher"),
      render: (c) =>
        c.teacher ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={c.teacher.profilePicture || undefined} />
              <AvatarFallback className="bg-indigo-100 text-[10px] font-bold text-indigo-700">
                {c.teacher.fullName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium text-foreground">
              {c.teacher.fullName}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t("compare.notSet")}
          </span>
        ),
    },
    {
      key: "whatYouLearn",
      label: t("compare.colWhatYouLearn"),
      render: (c) =>
        c.whatYouLearn.length === 0 ? (
          <span className="text-sm text-muted-foreground">{t("compare.no")}</span>
        ) : (
          <ul className="space-y-1.5">
            {c.whatYouLearn.map((b, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-left text-xs text-foreground"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                <span className="line-clamp-2">{b.text}</span>
              </li>
            ))}
          </ul>
        ),
    },
    {
      key: "certificate",
      label: t("compare.colCertificate"),
      render: (c) =>
        c.certificate ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600">
            <Award className="h-4 w-4" />
            {t("compare.yes")}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{t("compare.no")}</span>
        ),
    },
    {
      key: "liveHours",
      label: t("compare.colLiveHours"),
      render: (c) => (
        <span className="text-sm font-medium text-foreground">
          {t("compare.hoursPerWeek", { count: c.liveClassHours })}
        </span>
      ),
    },
  ];

  // Pad the columns so the grid stays balanced (2-3 courses). Each row always
  // renders one cell per course; an empty slot is rendered as a placeholder.
  const columns = courses;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Header row: title + clear-all */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge
            variant="outline"
            className="mb-3 inline-flex items-center gap-1.5 border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
          >
            <GitCompare className="h-3 w-3" />
            {t("compare.trayCount", { count: columns.length })}
          </Badge>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {t("compare.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("compare.subtitle")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            clear();
            toast.success(t("compare.clear"));
          }}
          className="gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        >
          <Trash2 className="h-4 w-4" />
          {t("compare.clear")}
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-700">
          {error}
        </div>
      )}

      {/* Comparison grid — label column + one column per course.
          On mobile we use horizontal scroll with a sticky first column so the
          row labels stay visible while visitors read across. */}
      <div className="overflow-x-auto pb-4">
        <div
          className="min-w-full"
          style={{
            // Auto-flow rows so each course is a column. The first column is
            // the labels (sticky) so visitors always know which row they read.
            display: "grid",
            gridTemplateColumns: `minmax(140px, 180px) repeat(${columns.length}, minmax(240px, 1fr))`,
            gap: "0.75rem",
          }}
        >
          {/* Header row: empty label cell + course title strip (rendered by
              the "image" row below to keep the title close to the action
              buttons). We render an empty spacer here so the grid alignment
              stays correct. */}
          <div className="sticky left-0 z-10 bg-background" />
          {columns.map((c) => (
            <div key={`head-${c.id}`} className="min-w-0" />
          ))}

          {/* Each row: label cell + one cell per course */}
          {rows.map((row) => (
            <RowCells
              key={row.key}
              label={row.label}
              columns={columns}
              render={row.render}
            />
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-br from-indigo-50 to-amber-50/50 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-sm font-bold text-foreground">
            {t("compare.browseCourses")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("compare.subtitle")}
          </p>
        </div>
        <Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Link href="/courses">
            <BookOpen className="h-4 w-4" />
            {t("compare.browseCourses")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** A single row: sticky label cell + one value cell per course. */
function RowCells({
  label,
  columns,
  render,
}: {
  label: string;
  columns: CompareCourse[];
  render: (c: CompareCourse) => React.ReactNode;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex items-center bg-background/95 px-3 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground backdrop-blur">
        {label}
      </div>
      {columns.map((c) => (
        <div
          key={`${c.id}-${label}`}
          className="min-w-0 rounded-xl border bg-card p-3"
        >
          {render(c)}
        </div>
      ))}
    </>
  );
}
