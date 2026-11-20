"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Enrollment, LiveClass } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  ArrowRight,
  PlayCircle,
  Video,
  Calendar,
  CheckCircle2,
  Sparkles,
  LogIn,
  Loader2,
  BookMarked,
} from "lucide-react";
import {
  formatDate,
  formatDateTime,
  formatTime,
  levelBadgeClass,
  timeAgo,
} from "@/lib/ui";

const RECENT_ACTIVITY = [
  {
    icon: CheckCircle2,
    title: "Completed Lesson 3",
    meta: "2h ago",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: Video,
    title: "Joined Live Class",
    meta: "5h ago",
    color: "bg-rose-100 text-rose-600",
  },
  {
    icon: BookMarked,
    title: "Enrolled in IELTS Speaking",
    meta: "2d ago",
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    icon: Award,
    title: "Earned a certificate",
    meta: "4d ago",
    color: "bg-amber-100 text-amber-600",
  },
];

export function DashboardView() {
  const { user, authLoading, openAuthModal, navigate, openCourse, openClass } =
    useStore();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [upcoming, setUpcoming] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .myCourses()
      .then((r) => {
        if (active) setEnrollments(r.enrollments);
      })
      .catch(() => {
        if (active) setEnrollments([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    api
      .upcomingClasses()
      .then((r) => {
        if (!active) return;
        // Server returns { items }, but the api.ts type says { classes }.
        // Normalize defensively.
        const list = (r as unknown as { items?: LiveClass[] }).items;
        setUpcoming(list ? list.slice(0, 3) : []);
      })
      .catch(() => {
        if (active) setUpcoming([]);
      })
      .finally(() => {
        if (active) setLoadingUpcoming(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const stats = useMemo(() => {
    const active = enrollments.filter((e) => e.status === "active").length;
    const completedLessons = enrollments.reduce((sum, e) => {
      if (e.completedLessons) {
        const parsed = String(e.completedLessons)
          .split(",")
          .filter(Boolean).length;
        if (parsed > 0) return sum + parsed;
      }
      return sum + Math.round((e.progress || 0) / 10);
    }, 0);
    const learningHours = enrollments.length * 2;
    const certificates = enrollments.filter(
      (e) => e.status === "completed"
    ).length;
    return { active, completedLessons, learningHours, certificates };
  }, [enrollments]);

  // ─── Auth gate ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
            <LogIn className="h-7 w-7 text-indigo-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold">Please log in</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            You need to be logged in to view your dashboard.
          </p>
          <Button
            onClick={() => openAuthModal("login")}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
          >
            Log in
          </Button>
        </Card>
      </div>
    );
  }

  const firstName = user.fullName.split(" ")[0] || "Student";
  const today = formatDate(new Date().toISOString());

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ─── Welcome header ──────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Welcome back, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Today is {today}. Keep up the momentum — every lesson brings you
            closer to fluency.
          </p>
        </div>
        <Button
          onClick={() => navigate("courses")}
          variant="outline"
          className="gap-2"
        >
          <Sparkles className="h-4 w-4 text-indigo-600" />
          Explore courses
        </Button>
      </div>

      {/* ─── Stats cards ────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Active Courses"
          value={stats.active}
          color="bg-indigo-100 text-indigo-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed Lessons"
          value={stats.completedLessons}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          icon={Clock}
          label="Learning Hours"
          value={`${stats.learningHours}h`}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          icon={Award}
          label="Certificates"
          value={stats.certificates}
          color="bg-violet-100 text-violet-600"
        />
      </div>

      {/* ─── Two-column layout ──────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: My Courses */}
        <div className="lg:col-span-2">
          <Card className="h-full p-0">
            <CardHeader className="flex-row items-center justify-between border-b">
              <div>
                <CardTitle className="text-lg">My Courses</CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Pick up where you left off
                </CardDescription>
              </div>
              {enrollments.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("my-courses")}
                  className="gap-1 text-indigo-600 hover:text-indigo-700"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-lg p-3"
                    >
                      <Skeleton className="h-16 w-24 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : enrollments.length === 0 ? (
                <EmptyCourses
                  onBrowse={() => navigate("courses")}
                />
              ) : (
                <ul className="divide-y">
                  {enrollments.slice(0, 4).map((enr) => {
                    const course = enr.course;
                    if (!course) return null;
                    const teacher = course.teacher;
                    return (
                      <li
                        key={enr.id}
                        className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center"
                      >
                        <button
                          onClick={() => openCourse(course.id)}
                          className="relative h-16 w-full shrink-0 overflow-hidden rounded-lg sm:w-28"
                          aria-label={`Open ${course.title}`}
                        >
                          {course.image ? (
                            <img loading="lazy" decoding="async"
                              src={course.image}
                              alt={course.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200">
                              <PlayCircle className="h-6 w-6 text-indigo-500" />
                            </div>
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`border ${levelBadgeClass(course.level)}`}
                            >
                              {course.level}
                            </Badge>
                            {enr.status === "completed" && (
                              <Badge className="bg-emerald-100 text-emerald-700">
                                Completed
                              </Badge>
                            )}
                          </div>
                          <button
                            onClick={() => openCourse(course.id)}
                            className="block w-full text-left text-sm font-bold leading-snug text-foreground hover:text-indigo-600"
                          >
                            {course.title}
                          </button>
                          {teacher && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              with {teacher.fullName}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <Progress
                              value={enr.progress || 0}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {enr.progress || 0}%
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => openCourse(course.id)}
                          className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 sm:shrink-0"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Continue
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Upcoming + Activity */}
        <div className="space-y-6">
          {/* Upcoming live classes */}
          <Card className="p-0">
            <CardHeader className="flex-row items-center justify-between border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                  <Video className="h-4 w-4" />
                </span>
                Upcoming Live Classes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingUpcoming ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : upcoming.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No upcoming classes</p>
                  <p className="text-xs text-muted-foreground">
                    Check back soon for new sessions.
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {upcoming.map((cls) => (
                    <li
                      key={cls.id}
                      className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                        <span className="text-[10px] font-semibold uppercase leading-none">
                          {new Date(cls.scheduledAt).toLocaleDateString(
                            "en-US",
                            { month: "short" }
                          )}
                        </span>
                        <span className="text-sm font-extrabold leading-none">
                          {new Date(cls.scheduledAt).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {cls.title}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(cls.scheduledAt)}
                          {cls.teacher && (
                            <>
                              <span className="text-border">·</span>
                              <span>{cls.teacher.fullName}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openClass(cls.id)}
                        className="gap-1 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        Join
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("live")}
                  className="w-full justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  View all classes
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="p-0">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1.5rem)] before:w-px before:bg-border">
                {RECENT_ACTIVITY.map((a, i) => (
                  <li key={i} className="relative flex items-start gap-3">
                    <span
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${a.color}`}
                    >
                      <a.icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-medium text-foreground">
                        {a.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.meta}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <Card className="card-lift p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-extrabold leading-tight text-foreground">
            {value}
          </p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {label}
          </p>
        </div>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

function EmptyCourses({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
        <BookOpen className="h-7 w-7 text-indigo-600" />
      </div>
      <p className="mb-1 text-sm font-semibold text-foreground">
        You haven&apos;t enrolled in any courses yet
      </p>
      <p className="mb-5 max-w-xs text-xs text-muted-foreground">
        Browse our catalog and join your first live English class today.
      </p>
      <Button
        onClick={onBrowse}
        className="gap-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
      >
        Browse Courses
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
