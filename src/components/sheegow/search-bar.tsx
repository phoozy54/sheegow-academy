"use client";

/**
 * Global search for SHEEGOW ACADEMY.
 *
 * Public search across courses + live classes; admin/teacher sessions also
 * see matching users. Two presentations share the same logic:
 *
 *  - <SearchBar />            — inline desktop input with a Popover dropdown
 *  - <MobileSearchButton />   — icon button that opens a full-width Sheet
 *
 * Behavior:
 *  - Input is debounced 300ms before hitting the API
 *  - Loading skeleton while fetching
 *  - "No results found" empty state
 *  - Escape closes the dropdown; Enter jumps to the first result (or to the
 *    dedicated /search page when there is no result yet)
 *  - Clicking any row navigates to the right page and closes the UI
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search,
  Loader2,
  BookOpen,
  Video,
  Users as UsersIcon,
  X,
  CornerDownLeft,
} from "lucide-react";
import { cn, formatDateTime, levelBadgeClass } from "@/lib/ui";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

/* ------------------------------------------------------------------ */
/*  Hook: debounced search                                             */
/* ------------------------------------------------------------------ */

interface UseSearchState {
  loading: boolean;
  results: SearchResponse | null;
  error: string | null;
}

export function useSearchQuery(query: string, enabled = true) {
  const [state, setState] = useState<UseSearchState>({
    loading: false,
    results: null,
    error: null,
  });

  // Track the latest request so a slow response can't overwrite a newer one.
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const trimmed = query.trim();
    // Skip the debounce when the query is too short — the consumer hides the
    // dropdown / sheet anyway based on `query.length`, so we don't need to
    // synchronously clear `results` here (which would trigger cascading
    // renders). State simply stays stale until the next valid search.
    if (trimmed.length < MIN_QUERY_LENGTH) return;

    const handle = window.setTimeout(async () => {
      const id = ++requestId.current;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await api.search(trimmed);
        // Drop stale responses — the user kept typing past this query.
        if (id !== requestId.current) return;
        setState({ loading: false, results: res, error: null });
      } catch (e) {
        if (id !== requestId.current) return;
        const msg =
          e instanceof ApiError ? e.message : "Search failed. Try again.";
        setState({ loading: false, results: null, error: msg });
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query, enabled]);

  return state;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30";
  }
}

function firstHref(results: SearchResponse | null): string | null {
  if (!results) return null;
  return (
    results.courses[0]?.href ??
    results.liveClasses[0]?.href ??
    // Per the task spec, clicking a user goes to /dashboard for now.
    results.users?.[0] ? "/dashboard" : null
  );
}

/* ------------------------------------------------------------------ */
/*  Result rows                                                        */
/* ------------------------------------------------------------------ */

function CourseRow({ course }: { course: SearchCourseResult }) {
  return (
    <Link
      href={course.href}
      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
    >
      <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {course.image ? (
          <img
            src={course.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-500">
            <BookOpen className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{course.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {course.description}
        </p>
      </div>
      <Badge
        variant="outline"
        className={cn("shrink-0 border", levelBadgeClass(course.level))}
      >
        {course.level}
      </Badge>
    </Link>
  );
}

function LiveClassRow({ liveClass }: { liveClass: SearchLiveClassResult }) {
  const status = liveStatusBadge(liveClass.status);
  return (
    <Link
      href={liveClass.href}
      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600">
        <Video className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{liveClass.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDateTime(liveClass.scheduledAt)}
        </p>
      </div>
      <Badge variant="outline" className={cn("shrink-0 border", status.className)}>
        {status.label}
      </Badge>
    </Link>
  );
}

function UserRow({ user }: { user: SearchUserResult }) {
  // Per the task spec: clicking a user just goes to /dashboard for now.
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent focus:bg-accent focus:outline-none"
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={user.profilePicture || undefined} />
        <AvatarFallback className="bg-indigo-100 text-[10px] font-bold text-indigo-700">
          {user.fullName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {user.username ? `@${user.username}` : user.email}
        </p>
      </div>
      <Badge
        variant="outline"
        className={cn("shrink-0 border capitalize", roleBadgeClass(user.role))}
      >
        {user.role.replace("_", " ")}
      </Badge>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Results list (shared by dropdown + sheet)                          */
/* ------------------------------------------------------------------ */

interface ResultsListProps {
  loading: boolean;
  results: SearchResponse | null;
  error: string | null;
  query: string;
  /** Called when a result is chosen — used to close the parent container. */
  onPick?: () => void;
}

function ResultsList({
  loading,
  results,
  error,
  query,
  onPick,
}: ResultsListProps) {
  if (loading) {
    return (
      <div className="space-y-1 p-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-sm text-red-600">{error}</div>;
  }

  if (!results) {
    // Nothing searched yet (query shorter than the minimum length).
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Type at least {MIN_QUERY_LENGTH} characters to search
      </div>
    );
  }

  const hasAny =
    results.courses.length > 0 ||
    results.liveClasses.length > 0 ||
    (results.users?.length ?? 0) > 0;

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No results found</p>
        <p className="text-xs text-muted-foreground">
          We could not find courses, classes or users matching{" "}
          <span className="font-medium text-foreground">
            &ldquo;{query}&rdquo;
          </span>
          .
        </p>
        <Link
          href={`/search?q=${encodeURIComponent(query)}`}
          onClick={onPick}
          className="mt-1 text-xs font-semibold text-indigo-600 hover:underline"
        >
          View full search page →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto p-1.5">
      {results.courses.length > 0 && (
        <section className="mb-1">
          <header className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            Courses
          </header>
          {results.courses.map((c) => (
            <div key={c.id} onClick={onPick}>
              <CourseRow course={c} />
            </div>
          ))}
        </section>
      )}

      {results.liveClasses.length > 0 && (
        <section className="mb-1">
          <header className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Video className="h-3 w-3" />
            Live Classes
          </header>
          {results.liveClasses.map((lc) => (
            <div key={lc.id} onClick={onPick}>
              <LiveClassRow liveClass={lc} />
            </div>
          ))}
        </section>
      )}

      {(results.users?.length ?? 0) > 0 && (
        <section>
          <header className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <UsersIcon className="h-3 w-3" />
            Users
          </header>
          {results.users!.map((u) => (
            <div key={u.id} onClick={onPick}>
              <UserRow user={u} />
            </div>
          ))}
        </section>
      )}

      <div className="mt-1 border-t px-2 py-1.5">
        <Link
          href={`/search?q=${encodeURIComponent(query)}`}
          onClick={onPick}
          className="flex items-center justify-between text-xs font-medium text-indigo-600 hover:underline"
        >
          <span>See all results</span>
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" /> Enter
          </span>
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop search bar                                                 */
/* ------------------------------------------------------------------ */

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { loading, results, error } = useSearchQuery(query, open);

  const handleEnter = useCallback(() => {
    const first = firstHref(results);
    if (first) {
      router.push(first);
      setOpen(false);
      inputRef.current?.blur();
    } else if (query.trim().length >= MIN_QUERY_LENGTH) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      inputRef.current?.blur();
    }
  }, [results, query, router]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      handleEnter();
    }
  };

  // Clear the query shortly after the dropdown closes so the next open
  // starts fresh, without flickering the previous results during the close
  // animation.
  useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => setQuery(""), 150);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const trimmed = query.trim();
  const showResults =
    trimmed.length >= MIN_QUERY_LENGTH && (loading || !!results || !!error);

  return (
    <div className={cn("relative", className)}>
      <Popover open={open && showResults} onOpenChange={() => {}}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!open && e.target.value.trim().length >= MIN_QUERY_LENGTH) {
                  setOpen(true);
                }
              }}
              onFocus={() => {
                if (query.trim().length >= MIN_QUERY_LENGTH) setOpen(true);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search courses, classes…"
              aria-label="Search"
              className="h-9 w-full rounded-full border-muted bg-muted/40 pl-9 pr-8 text-sm placeholder:text-muted-foreground focus-visible:bg-background"
            />
            {loading && (
              <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {!loading && query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[min(28rem,90vw)] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <ResultsList
            loading={loading}
            results={results}
            error={error}
            query={trimmed}
            onPick={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile search button (opens a Sheet)                              */
/* ------------------------------------------------------------------ */

export function MobileSearchButton({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when the sheet opens so the keyboard shows up on
  // touch devices.
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const { loading, results, error } = useSearchQuery(query, open);

  const handleEnter = useCallback(() => {
    const first = firstHref(results);
    if (first) {
      router.push(first);
      setOpen(false);
    } else if (query.trim().length >= MIN_QUERY_LENGTH) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
    }
  }, [results, query, router]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEnter();
    }
  };

  const trimmed = query.trim();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-10 w-10 lg:hidden", className)}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="w-full p-0 sm:max-w-md">
        <SheetTitle className="sr-only">Search SHEEGOW ACADEMY</SheetTitle>
        <div className="flex flex-col gap-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search courses, classes…"
              aria-label="Search"
              className="h-11 rounded-full border-muted bg-muted/40 pl-10 pr-9 text-sm placeholder:text-muted-foreground focus-visible:bg-background"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            {!loading && query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="rounded-xl border bg-popover">
            <ResultsList
              loading={loading}
              results={results}
              error={error}
              query={trimmed}
              onPick={() => setOpen(false)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Re-export the result types for callers that need to render results
 *  themselves (e.g. the search page). */
export type {
  SearchCourseResult,
  SearchLiveClassResult,
  SearchUserResult,
  SearchResponse,
};
