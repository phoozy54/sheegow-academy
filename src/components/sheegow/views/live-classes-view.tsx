"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import type { LiveClass } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Video,
  Radio,
  Calendar,
  Clock,
  Users,
  ArrowRight,
  Loader2,
  PlayCircle,
  ChevronRight,
} from "lucide-react";
import {
  formatDateTime,
  isLiveNow,
  levelBadgeClass,
  cn,
} from "@/lib/ui";

export function LiveClassesView() {
  const openClass = useStore((s) => s.openClass);
  const navigate = useStore((s) => s.navigate);

  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // The api.upcomingClasses() signature claims {classes} but the actual
      // endpoint returns {items}. Read both shapes to be robust.
      const r = await api.upcomingClasses();
      const list =
        (r as unknown as { items?: LiveClass[] }).items ??
        r.classes ??
        [];
      setClasses(list);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load live classes";
      setError(msg);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Partition into "live now" and "scheduled"
  const liveNow = classes.filter((c) => isLiveNow(c.scheduledAt, c.duration, c.status));
  const upcoming = classes.filter((c) => !isLiveNow(c.scheduledAt, c.duration, c.status));

  // Sum of attendees across all live classes
  const totalOnline = liveNow.reduce((sum, c) => sum + (c.attendeeCount || 0), 0);

  /* ─── Loading ──────────────────────────────────────── */
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 h-10 w-1/2 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden p-0">
              <div className="aspect-[16/9] animate-pulse bg-muted" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-9 w-full animate-pulse rounded bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Error ────────────────────────────────────────── */
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <Radio className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Couldn&apos;t load live classes</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button onClick={load} variant="outline" className="mt-6 gap-1.5">
          <Loader2 className="h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  /* ─── Empty ────────────────────────────────────────── */
  if (classes.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
          <Video className="h-8 w-8 text-indigo-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">No live classes scheduled</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Check back soon — new LIVE English classes are added every week.
        </p>
        <Button
          onClick={() => navigate("courses")}
          variant="outline"
          className="mt-6 gap-1.5"
        >
          Browse Courses
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background">
      {/* ─── HEADER ───────────────────────────────────── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-indigo-50/60 to-background">
        <div className="hero-mesh absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Badge
            variant="outline"
            className="mb-4 inline-flex items-center gap-1.5 border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
          >
            <Radio className="h-3 w-3" /> Live Classes
          </Badge>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Join a <span className="gradient-text">LIVE English class</span> right now
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            All our classes are real-time video sessions. Speak with the teacher,
            ask questions in chat, and practice with classmates — no recordings.
          </p>

          {/* Students online strip */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                <span className="h-3 w-3 animate-live-pulse rounded-full bg-red-500" />
              </span>
              <div>
                <p className="text-lg font-extrabold leading-none text-foreground">
                  {totalOnline}
                </p>
                <p className="text-xs text-muted-foreground">students online now</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15">
                <Video className="h-5 w-5 text-indigo-600" />
              </span>
              <div>
                <p className="text-lg font-extrabold leading-none text-foreground">
                  {classes.length}
                </p>
                <p className="text-xs text-muted-foreground">upcoming classes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* ─── LIVE NOW HIGHLIGHT ─────────────────────── */}
        {liveNow.length > 0 && (
          <section className="mb-12">
            <div className="mb-5 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <h2 className="text-xl font-bold text-foreground">Live now</h2>
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                {liveNow.length} happening
              </Badge>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {liveNow.map((lc) => (
                <LiveNowCard key={lc.id} liveClass={lc} onJoin={() => openClass(lc.id)} />
              ))}
            </div>
          </section>
        )}

        {/* ─── UPCOMING CLASSES ───────────────────────── */}
        {upcoming.length > 0 && (
          <section>
            <div className="mb-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-foreground">Upcoming classes</h2>
              </div>
              <span className="text-sm text-muted-foreground">
                {upcoming.length} scheduled
              </span>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((lc) => (
                <LiveClassCard key={lc.id} liveClass={lc} onJoin={() => openClass(lc.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ─── Live now highlight card ─────────────────────────── */

function LiveNowCard({
  liveClass,
  onJoin,
}: {
  liveClass: LiveClass;
  onJoin: () => void;
}) {
  const course = liveClass.course;
  return (
    <Card className="card-lift relative overflow-hidden border-red-200 p-0 shadow-lg shadow-red-500/10">
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/40 to-transparent" />
      <div className="relative flex flex-col sm:flex-row">
        {/* Thumb */}
        <div className="relative aspect-[16/9] w-full sm:h-auto sm:w-1/2">
          {course?.image ? (
            <img loading="lazy" decoding="async"
              src={course.image}
              alt={liveClass.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 text-white">
              <Video className="h-12 w-12" />
            </div>
          )}
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
            <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-white" />
            LIVE
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-lg font-bold leading-tight text-foreground">
            {liveClass.title}
          </h3>
          {liveClass.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {liveClass.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {liveClass.teacher && (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={liveClass.teacher.profilePicture || undefined} />
                  <AvatarFallback className="bg-indigo-100 text-[8px] font-bold text-indigo-700">
                    {liveClass.teacher.fullName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">
                  {liveClass.teacher.fullName}
                </span>
              </div>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {liveClass.duration} min
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {liveClass.attendeeCount} joined
            </span>
          </div>

          <Button
            onClick={onJoin}
            className="mt-4 gap-2 bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/30 hover:from-red-600 hover:to-red-700"
          >
            <Video className="h-4 w-4" /> Join Live Class
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Standard live class card ─────────────────────────── */

function LiveClassCard({
  liveClass,
  onJoin,
}: {
  liveClass: LiveClass;
  onJoin: () => void;
}) {
  const course = liveClass.course;
  const ended = liveClass.status === "ended";

  return (
    <Card className="card-lift group flex h-full flex-col overflow-hidden p-0">
      {/* Thumb */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {course?.image ? (
          <img loading="lazy" decoding="async"
            src={course.image}
            alt={liveClass.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200">
            <PlayCircle className="h-10 w-10 text-indigo-400" />
          </div>
        )}
        {/* Status badge */}
        <StatusBadge liveClass={liveClass} />
        {course?.level && (
          <Badge
            variant="outline"
            className={cn("absolute right-3 top-3 border", levelBadgeClass(course.level))}
          >
            {course.level}
          </Badge>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatDateTime(liveClass.scheduledAt)}</span>
        </div>

        <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-foreground">
          {liveClass.title}
        </h3>

        {liveClass.description && (
          <p className="mb-3 line-clamp-2 flex-1 text-sm text-muted-foreground">
            {liveClass.description}
          </p>
        )}

        {/* Teacher */}
        {liveClass.teacher && (
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarImage src={liveClass.teacher.profilePicture || undefined} />
              <AvatarFallback className="bg-indigo-100 text-[9px] font-bold text-indigo-700">
                {liveClass.teacher.fullName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate font-medium text-foreground">
              {liveClass.teacher.fullName}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {liveClass.duration}m
            </span>
          </div>
        )}

        {/* Join button */}
        <Button
          onClick={onJoin}
          disabled={ended}
          variant={ended ? "outline" : "default"}
          size="sm"
          className={cn(
            "mt-auto w-full gap-1.5",
            !ended && "bg-indigo-600 hover:bg-indigo-700"
          )}
        >
          {ended ? (
            "Class ended"
          ) : (
            <>
              Join Class <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

/* ─── Status badge ──────────────────────────────────────── */

function StatusBadge({ liveClass }: { liveClass: LiveClass }) {
  if (liveClass.status === "live") {
    return (
      <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-500/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur">
        <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-white" />
        LIVE
      </span>
    );
  }
  if (liveClass.status === "ended") {
    return (
      <span className="absolute left-3 top-3 rounded-full bg-muted/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-lg backdrop-blur">
        Ended
      </span>
    );
  }
  return (
    <span className="absolute left-3 top-3 rounded-full bg-indigo-500/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur">
      Scheduled
    </span>
  );
}
