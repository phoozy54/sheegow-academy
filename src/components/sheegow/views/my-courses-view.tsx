"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Enrollment } from "@/lib/types";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  PlayCircle,
  Award,
  Download,
  LogIn,
  Loader2,
  Clock,
  GraduationCap,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, levelBadgeClass } from "@/lib/ui";

type TabValue = "all" | "in-progress" | "completed";

export function MyCoursesView() {
  const { user, authLoading, openAuthModal, navigate, openCourse } = useStore();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabValue>("all");
  const [certOpen, setCertOpen] = useState<Enrollment | null>(null);

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
    return () => {
      active = false;
    };
  }, [user]);

  const counts = useMemo(() => {
    const enrolled = enrollments.length;
    const completed = enrollments.filter(
      (e) => e.status === "completed"
    ).length;
    return { enrolled, completed };
  }, [enrollments]);

  const filtered = useMemo(() => {
    if (tab === "in-progress")
      return enrollments.filter((e) => e.status !== "completed");
    if (tab === "completed")
      return enrollments.filter((e) => e.status === "completed");
    return enrollments;
  }, [enrollments, tab]);

  // ─── Auth gate ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading your courses...</p>
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
            Log in to see the courses you&apos;re enrolled in.
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            My Courses
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Continue learning and track your progress across all enrolled
            courses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 font-semibold text-indigo-700">
            <BookOpen className="h-3.5 w-3.5" />
            {counts.enrolled} enrolled
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {counts.completed} completed
          </span>
        </div>
      </div>

      {/* ─── Tabs ───────────────────────────────────────────── */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabValue)}
        className="mb-6"
      >
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ─── Grid ───────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden p-0">
              <Skeleton className="aspect-[16/9] w-full" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          tab={tab}
          onBrowse={() => navigate("courses")}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((enr) => (
            <EnrollmentCard
              key={enr.id}
              enrollment={enr}
              onContinue={() => {
                if (enr.course) openCourse(enr.course.id);
              }}
              onViewCertificate={() => setCertOpen(enr)}
            />
          ))}
        </div>
      )}

      {/* ─── Certificate dialog ─────────────────────────────── */}
      <CertificateDialog
        enrollment={certOpen}
        userName={user.fullName}
        onClose={() => setCertOpen(null)}
      />
    </div>
  );
}

function EnrollmentCard({
  enrollment,
  onContinue,
  onViewCertificate,
}: {
  enrollment: Enrollment;
  onContinue: () => void;
  onViewCertificate: () => void;
}) {
  const course = enrollment.course;
  if (!course) return null;
  const teacher = course.teacher;
  const completed = enrollment.status === "completed";

  return (
    <Card className="card-lift group flex h-full flex-col overflow-hidden p-0">
      <button
        onClick={onContinue}
        className="relative block aspect-[16/9] w-full overflow-hidden"
        aria-label={`Continue ${course.title}`}
      >
        {course.image ? (
          <img
            src={course.image}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200">
            <PlayCircle className="h-10 w-10 text-indigo-400" />
          </div>
        )}
        <Badge
          variant="outline"
          className={`absolute left-3 top-3 border ${levelBadgeClass(course.level)}`}
        >
          {course.level}
        </Badge>
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-lg backdrop-blur ${
            completed
              ? "bg-emerald-500/90 text-white"
              : "bg-indigo-500/90 text-white"
          }`}
        >
          {completed ? "Completed" : "Active"}
        </span>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{course.duration} weeks</span>
        </div>

        <button
          onClick={onContinue}
          className="mb-2 line-clamp-2 text-left text-base font-bold leading-snug transition-colors hover:text-indigo-600"
        >
          {course.title}
        </button>

        {teacher && (
          <div className="mb-3 flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={teacher.profilePicture || undefined} />
              <AvatarFallback className="bg-indigo-100 text-[10px] font-bold text-indigo-700">
                {teacher.fullName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs text-muted-foreground">
              {teacher.fullName}
            </span>
          </div>
        )}

        {/* Progress */}
        <div className="mb-4 mt-auto">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Progress</span>
            <span className="font-bold text-foreground">
              {enrollment.progress || 0}%
            </span>
          </div>
          <Progress
            value={enrollment.progress || 0}
            className={`h-1.5 ${completed ? "[&_>div]:bg-emerald-500" : ""}`}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={onContinue}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            size="sm"
          >
            <PlayCircle className="h-4 w-4" />
            Continue Learning
          </Button>
          {completed && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewCertificate}
              className="gap-1.5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <Award className="h-4 w-4" />
              View Certificate
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function CertificateDialog({
  enrollment,
  userName,
  onClose,
}: {
  enrollment: Enrollment | null;
  userName: string;
  onClose: () => void;
}) {
  const course = enrollment?.course;
  return (
    <Dialog open={enrollment !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>
            Certificate of Completion — {course?.title}
          </DialogTitle>
          <DialogDescription>
            Your certificate of completion for this course.
          </DialogDescription>
        </DialogHeader>

        {/* Certificate visual */}
        <div className="relative overflow-hidden rounded-t-lg border-b bg-gradient-to-br from-indigo-50 via-white to-amber-50 px-6 py-8 text-center">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background:repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(99,102,241,0.05)_10px,rgba(99,102,241,0.05)_11px)]" />
          <div className="relative">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg">
              <GraduationCap className="h-7 w-7" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-500">
              SHEEGOW ACADEMY
            </p>
            <p className="mt-2 text-xl font-extrabold tracking-tight text-foreground">
              Certificate of Completion
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              This certifies that
            </p>
            <p className="mt-1 text-lg font-bold text-indigo-700">
              {userName}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              has successfully completed the course
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {course?.title}
            </p>
            <div className="mt-5 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  {formatDate(
                    enrollment?.enrolledAt || new Date().toISOString()
                  )}
                </p>
                <p>Enrolled</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  {formatDate(new Date().toISOString())}
                </p>
                <p>Issued</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-1 text-amber-600">
              <Award className="h-4 w-4" />
              <span className="text-xs font-semibold">
                Awarded with {enrollment?.progress || 100}% completion
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 px-6 pb-6 pt-4 sm:flex-row">
          <Button
            variant="outline"
            onClick={onClose}
            className="sm:flex-1"
          >
            Close
          </Button>
          <Button
            onClick={() => {
              toast.success("Certificate downloaded (demo)");
            }}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 sm:flex-1"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({
  tab,
  onBrowse,
}: {
  tab: TabValue;
  onBrowse: () => void;
}) {
  const isFiltered = tab !== "all";
  return (
    <Card className="p-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
        {isFiltered ? (
          <Sparkles className="h-8 w-8 text-indigo-500" />
        ) : (
          <BookOpen className="h-8 w-8 text-indigo-500" />
        )}
      </div>
      <h3 className="mb-1 text-lg font-bold">
        {isFiltered
          ? "Nothing here yet"
          : "You haven't enrolled in any courses"}
      </h3>
      <p className="mb-5 max-w-sm text-sm text-muted-foreground">
        {isFiltered
          ? "Try switching tabs to see your other courses, or browse new ones."
          : "Explore our live English courses and start learning today."}
      </p>
      <Button
        onClick={onBrowse}
        className="gap-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
      >
        Browse Courses
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Card>
  );
}
