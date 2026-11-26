"use client";

/**
 * Dedicated /search page view.
 *
 * Reads `?q=` from the URL, runs a debounced search via the same hook the
 * navbar uses, and renders full-width result lists (no 5-item cap) by
 * re-querying the API directly. Supports pressing Enter to re-search, an
 * empty state, and a loading skeleton.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type {
  SearchCourseResult,
  SearchLiveClassResult,
  SearchResponse,
  SearchUserResult,
} from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search as SearchIcon,
  Loader2,
  BookOpen,
  Video,
  Users as UsersIcon,
  ArrowLeft,
  X,
} from "lucide-react";
import { cn, formatDateTime, levelBadgeClass } from "@/lib/ui";
import { useT } from "@/lib/i18n";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
/** Higher cap so the dedicated page can show "everything" matching. */
const FULL_LIMIT = 25;

function liveStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "live":
      return {
        label: "Live now",
        className:
          "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30",
      };
    case "ended":
      return {
        label: "Ended",
        className: "bg-muted text-muted-foreground border-border",
      };
    default:
      return {
        label: "Scheduled",
        className:
          "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
      };
  }
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case "super_admin":
      return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30";
    case "admin":
      return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30";
    case "teacher":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30";
    default:
      return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30";
  }
}

/* ------------------------------------------------------------------ */
/*  Result cards                                                       */
/* ------------------------------------------------------------------ */

function CourseResultCard({ course }: { course: SearchCourseResult }) {
  const t = useT();
  return (
    <Link
      href={course.href}
      className="group flex gap-3 rounded-xl border bg-card p-3 transition-all hover:border-indigo-300 hover:shadow-sm sm:p-4"
    >
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-20 sm:w-32">
        {course.image ? (
          <img
            src={course.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-500">
            <BookOpen className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight transition-colors group-hover:text-indigo-600 sm:text-base">
            {course.title}
          </h3>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 border",
              levelBadgeClass(course.level),
            )}
          >
            {course.level}
          </Badge>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
          {course.description}
        </p>
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-medium text-indigo-600">
          {t("search.viewCourse")}
        </span>
      </div>
    </Link>
  );
}

function LiveClassResultCard({ liveClass }: { liveClass: SearchLiveClassResult }) {
  const t = useT();
  const status = liveStatusBadge(liveClass.status);
  return (
    <Link
      href={liveClass.href}
      className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:border-amber-300 hover:shadow-sm sm:p-4"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 sm:h-14 sm:w-14">
        <Video className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 text-sm font-semibold leading-tight transition-colors group-hover:text-amber-700 sm:text-base">
          {liveClass.title}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
          {formatDateTime(liveClass.scheduledAt)} · {liveClass.duration} min
        </p>
      </div>
      <Badge variant="outline" className={cn("shrink-0 border", status.className)}>
        {status.label}
      </Badge>
    </Link>
  );
}

function UserResultCard({ user }: { user: SearchUserResult }) {
  const t = useT();
  return (
    <Link
      href="/dashboard"
      className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:border-violet-300 hover:shadow-sm sm:p-4"
    >
      <Avatar className="h-12 w-12 shrink-0 sm:h-14 sm:w-14">
        <AvatarImage src={user.profilePicture || undefined} />
        <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700">
          {user.fullName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold leading-tight sm:text-base">
          {user.fullName}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
          {user.username ? `@${user.username}` : user.email}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {user.email}
        </p>
      </div>
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 border capitalize",
          roleBadgeClass(user.role),
        )}
      >
        {user.role.replace("_", " ")}
      </Badge>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Section shell                                                      */
/* ------------------------------------------------------------------ */

function ResultSection({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof BookOpen;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <header className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h2>
        <Badge variant="secondary" className="ml-1">
          {count}
        </Badge>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main view                                                          */
/* ------------------------------------------------------------------ */

export function SearchView() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the input in sync with the URL whenever the user navigates back /
  // forward, or lands on /search?q=... via a deep link.
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const trimmed = initialQuery.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.search(trimmed, FULL_LIMIT);
        if (cancelled) return;
        setResults(res);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof ApiError ? e.message : "Search failed. Try again.";
        setError(msg);
        setResults(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [initialQuery]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const trimmed = initialQuery.trim();
  const hasResults =
    !!results &&
    (results.courses.length > 0 ||
      results.liveClasses.length > 0 ||
      (results.users?.length ?? 0) > 0);

  const totalResults = results
    ? results.courses.length +
      results.liveClasses.length +
      (results.users?.length ?? 0)
    : 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("search.backToHome")}
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t("search.title")}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {t("search.desc")}
      </p>

      <form onSubmit={submit} className="mt-5">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, classes, people…"
            aria-label={t("search.searchQuery")}
            className="h-12 rounded-full border-muted bg-muted/40 pl-11 pr-24 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:bg-background sm:text-base"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t("search.clearSearch")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button
              type="submit"
              size="sm"
              className="h-8 rounded-full bg-indigo-600 px-4 hover:bg-indigo-700"
            >
              Search
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-8">
        {trimmed.length < MIN_QUERY_LENGTH ? (
          <EmptyHint />
        ) : loading ? (
          <LoadingState />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : !hasResults ? (
          <NoResults query={trimmed} />
        ) : (
          <div>
            <p className="mb-5 text-sm text-muted-foreground">
              {t("search.showing")}{" "}
              <span className="font-semibold text-foreground">
                {totalResults}
              </span>{" "}
              {totalResults === 1 ? t("search.resultSingular") : t("search.resultPlural")} {t("search.for")}{" "}
              <span className="font-medium text-foreground">
                &ldquo;{trimmed}&rdquo;
              </span>
              {totalResults >= FULL_LIMIT && (
                <span className="ml-1 text-xs">
                  {t("search.showingTop")} {FULL_LIMIT} {t("search.perCategory")}
                </span>
              )}
            </p>

            {results!.courses.length > 0 && (
              <ResultSection
                icon={BookOpen}
                title={t("search.courses")}
                count={results!.courses.length}
              >
                {results!.courses.map((c) => (
                  <CourseResultCard key={c.id} course={c} />
                ))}
              </ResultSection>
            )}

            {results!.liveClasses.length > 0 && (
              <ResultSection
                icon={Video}
                title={t("search.liveClasses")}
                count={results!.liveClasses.length}
              >
                {results!.liveClasses.map((lc) => (
                  <LiveClassResultCard key={lc.id} liveClass={lc} />
                ))}
              </ResultSection>
            )}

            {(results!.users?.length ?? 0) > 0 && (
              <ResultSection
                icon={UsersIcon}
                title={t("search.users")}
                count={results!.users!.length}
              >
                {results!.users!.map((u) => (
                  <UserResultCard key={u.id} user={u} />
                ))}
              </ResultSection>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyHint() {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/30 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-indigo-500 shadow-sm">
        <SearchIcon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold">{t("search.searchAcrossAcademy")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("search.searchAcrossDesc")}
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  const t = useT();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("search.searching")}
      </div>
      {[0, 1, 2].map((section) => (
        <div key={section}>
          <Skeleton className="mb-3 h-5 w-32" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl border bg-card p-3 sm:p-4"
              >
                <Skeleton className="h-16 w-24 shrink-0 rounded-lg sm:h-20 sm:w-32" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/30 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm">
        <SearchIcon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold">{t("search.noResults")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("search.noResultsDesc")}{" "}
          <span className="font-medium text-foreground">
            &ldquo;{query}&rdquo;
          </span>
          {t("search.tryDifferent")}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <BookOpen className="h-3.5 w-3.5" /> Browse all courses
        </Link>
        <Link
          href="/live-classes"
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Video className="h-3.5 w-3.5" /> Browse live classes
        </Link>
      </div>
    </div>
  );
}
