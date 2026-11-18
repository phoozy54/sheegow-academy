"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import type { Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CourseCard } from "../course-card";
import { Search, ChevronLeft, ChevronRight, BookOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/ui";

// Levels offered by the platform — used to drive the filter pills
const LEVELS = ["All", "Beginner", "Intermediate", "Advanced", "IELTS", "Kids"] as const;
type LevelFilter = (typeof LEVELS)[number];

const PAGE_SIZE = 9;

export function CoursesView() {
  const navigate = useStore((s) => s.navigate);

  // Filter + pagination state
  const [level, setLevel] = useState<LevelFilter>("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Data state
  const [courses, setCourses] = useState<Course[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search input (300ms) so we don't spam the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to first page whenever filters change
  useEffect(() => {
    setPage(1);
  }, [level, debouncedSearch]);

  // Fetch courses whenever filter/search/page changes
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.courses({
        level: level === "All" ? undefined : level,
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setCourses(res.items);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load courses";
      setError(msg);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [level, debouncedSearch, page]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <div className="bg-background">
      {/* ─── HEADER ───────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-indigo-50/60 to-background">
        <div className="hero-mesh absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Badge
            variant="outline"
            className="mb-4 inline-flex items-center gap-1.5 border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
          >
            <BookOpen className="h-3 w-3" /> All Courses
          </Badge>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Explore Live English <span className="gradient-text">Courses</span>
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            Browse our full catalog of LIVE English courses — every class is taught
            in real-time by an expert teacher. Choose your level and start speaking
            today.
          </p>
        </div>
      </section>

      {/* ─── CONTROLS ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses by title..."
              className="pl-9"
              aria-label="Search courses"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>

          {/* Level filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            {LEVELS.map((lvl) => {
              const active = level === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                    active
                      ? "border-transparent bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/30"
                      : "border-border bg-background text-muted-foreground hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  )}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Result count */}
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
              </span>
            ) : error ? (
              <span className="text-red-600">{error}</span>
            ) : (
              <>
                <span className="font-semibold text-foreground">{total}</span>{" "}
                {total === 1 ? "course" : "courses"} found
                {level !== "All" && (
                  <>
                    {" "}in <span className="font-semibold text-indigo-600">{level}</span>
                  </>
                )}
                {debouncedSearch && (
                  <>
                    {" "}matching &ldquo;<span className="font-semibold text-indigo-600">{debouncedSearch}</span>&rdquo;
                  </>
                )}
              </>
            )}
          </span>
        </div>
      </section>

      {/* ─── COURSES GRID ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-base font-semibold text-red-700">{error}</p>
            <Button
              variant="outline"
              onClick={fetchCourses}
              className="mt-4 gap-1.5"
            >
              Try again
            </Button>
          </div>
        ) : courses.length === 0 ? (
          <EmptyState onReset={() => { setSearch(""); setLevel("All"); }} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && courses.length > 0 && totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
                const pageNum = i + 1;
                const active = page === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition-colors",
                      active
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                        : "border border-border bg-background text-muted-foreground hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 7 && (
                <span className="px-2 text-muted-foreground">...{totalPages}</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="gap-1.5"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </section>

      {/* ─── CTA ──────────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl border bg-gradient-to-br from-indigo-50 to-amber-50/50 p-6 text-center sm:p-10">
          <h3 className="text-xl font-bold text-foreground sm:text-2xl">
            Can&apos;t find the right course?
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Reach out to our team — we&apos;ll help you pick the perfect LIVE English
            course for your goals and level.
          </p>
          <Button
            onClick={() => navigate("contact")}
            className="mt-5 gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
          >
            Talk to an Advisor
          </Button>
        </div>
      </section>
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────── */
function CourseCardSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="aspect-[16/9] animate-pulse bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded bg-muted" />
      </div>
    </Card>
  );
}

/* ─── Empty state ───────────────────────────────────────── */
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/30 p-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
        <Search className="h-8 w-8 text-indigo-400" />
      </div>
      <h3 className="text-lg font-bold text-foreground">No courses found</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Try changing your search keywords or selecting a different level filter.
      </p>
      <Button
        onClick={onReset}
        variant="outline"
        className="mt-5 gap-1.5"
      >
        Reset filters
      </Button>
    </div>
  );
}
