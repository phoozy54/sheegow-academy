"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Course, GradebookData } from "@/lib/types";
import { cn, formatDate } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GraduationCap,
  ClipboardList,
  Award,
  TrendingUp,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Teacher/Admin gradebook view. Course selector + table of enrolled students
 * with quiz and assignment grades. Falls back to per-student cards on small
 * screens.
 */
export function GradebookView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [data, setData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCoursesLoading(true);
      try {
        const r = await api.courses({ limit: 100 });
        if (cancelled) return;
        setCourses(r.items);
        if (r.items.length > 0 && !selectedCourseId) {
          setSelectedCourseId(r.items[0].id);
        }
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Failed to load courses";
        toast.error(msg);
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadGradebook = useCallback(async (courseId: string) => {
    if (!courseId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const r = await api.gradebook(courseId);
      setData(r);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load gradebook";
      toast.error(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCourseId) void loadGradebook(selectedCourseId);
  }, [selectedCourseId, loadGradebook]);

  return (
    <div className="space-y-5">
      {/* Course selector + summary */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Course
            </label>
            {coursesLoading ? (
              <Skeleton className="h-10 w-full sm:max-w-xs" />
            ) : courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No courses available. Create a course first to view its gradebook.
              </p>
            ) : (
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="w-full sm:max-w-xs">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {data && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">
                {data.summary.studentCount} student
                {data.summary.studentCount === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {data.course.level}
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {!selectedCourseId ? (
        <EmptyState
          icon={GraduationCap}
          title="Select a course"
          description="Pick a course above to see its gradebook."
        />
      ) : loading ? (
        <Card className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </Card>
      ) : !data ? (
        <EmptyState
          icon={Inbox}
          title="No gradebook data"
          description="There are no enrolled students or graded items in this course yet."
        />
      ) : (
        <GradebookContent data={data} />
      )}
    </div>
  );
}

function GradebookContent({ data }: { data: GradebookData }) {
  const summary = data.summary;
  return (
    <div className="space-y-5">
      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <SummaryTile
          icon={TrendingUp}
          color="indigo"
          label="Class average score"
          value={
            summary.averageQuizScore == null
              ? "—"
              : `${summary.averageQuizScore}%`
          }
        />
        <SummaryTile
          icon={CheckCircle2}
          color="emerald"
          label="Quiz pass rate"
          value={
            summary.passRate == null ? "—" : `${summary.passRate}%`
          }
        />
        <SummaryTile
          icon={Award}
          color="amber"
          label="Avg. progress"
          value={
            summary.averageProgress == null
              ? "—"
              : `${summary.averageProgress}%`
          }
        />
        <SummaryTile
          icon={ClipboardList}
          color="violet"
          label="Submissions graded"
          value={`${summary.gradedSubmissions} / ${
            summary.gradedSubmissions + summary.pendingSubmissions
          }`}
        />
      </div>

      {/* Desktop table */}
      <Card className="hidden p-0 md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-[200px] bg-card pl-4">
                  Student
                </TableHead>
                <TableHead className="min-w-[100px]">Progress</TableHead>
                {data.quizzes.map((q) => (
                  <TableHead key={q.id} className="min-w-[120px] text-center">
                    <div className="flex flex-col">
                      <span className="truncate font-semibold">{q.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        pass {q.passScore}%
                      </span>
                    </div>
                  </TableHead>
                ))}
                {data.assignments.map((a) => (
                  <TableHead key={a.id} className="min-w-[120px] text-center">
                    <div className="flex flex-col">
                      <span className="truncate font-semibold">{a.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        / {a.maxPoints} pts
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.students.map((row) => (
                <TableRow key={row.studentId}>
                  <TableCell className="sticky left-0 z-10 bg-card pl-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={row.profilePicture || undefined} />
                        <AvatarFallback className="bg-indigo-100 text-[10px] font-bold text-indigo-700">
                          {row.fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {row.fullName}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {row.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-bold",
                          row.enrollmentProgress >= 100
                            ? "text-emerald-600"
                            : "text-foreground"
                        )}
                      >
                        {row.enrollmentProgress}%
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          row.enrollmentStatus === "completed"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-indigo-200 bg-indigo-50 text-indigo-700"
                        )}
                      >
                        {row.enrollmentStatus}
                      </Badge>
                    </div>
                  </TableCell>
                  {data.quizzes.map((q) => {
                    const attempts = row.quizAttempts.filter(
                      (a) => a.quizId === q.id
                    );
                    const best = attempts.reduce<number | null>(
                      (best, a) =>
                        a.score == null
                          ? best
                          : best == null || a.score > best
                          ? a.score
                          : best,
                      null
                    );
                    return (
                      <TableCell key={q.id} className="text-center">
                        {attempts.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                best != null && best >= q.passScore
                                  ? "text-emerald-600"
                                  : "text-amber-600"
                              )}
                            >
                              {best == null ? "pending" : `${best}%`}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {attempts.length} attempt
                              {attempts.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                  {data.assignments.map((a) => {
                    const sub = row.submissions.find(
                      (s) => s.assignmentId === a.id
                    );
                    return (
                      <TableCell key={a.id} className="text-center">
                        {!sub ? (
                          <span className="text-xs text-muted-foreground">
                            not submitted
                          </span>
                        ) : sub.status !== "graded" ? (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                          >
                            {sub.status}
                          </Badge>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={cn(
                                "text-sm font-bold",
                                (sub.grade ?? 0) >= a.maxPoints * 0.6
                                  ? "text-emerald-600"
                                  : "text-amber-600"
                              )}
                            >
                              {sub.grade == null ? "—" : `${sub.grade}/${a.maxPoints}`}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(sub.gradedAt || sub.submittedAt)}
                            </span>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {data.students.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2 + data.quizzes.length + data.assignments.length}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No enrolled students yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.students.map((row) => (
          <Card key={row.studentId} className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={row.profilePicture || undefined} />
                <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700">
                  {row.fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {row.fullName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {row.email}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  row.enrollmentStatus === "completed"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-indigo-200 bg-indigo-50 text-indigo-700"
                )}
              >
                {row.enrollmentProgress}%
              </Badge>
            </div>
            {data.quizzes.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Quizzes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.quizzes.map((q) => {
                    const attempts = row.quizAttempts.filter(
                      (a) => a.quizId === q.id
                    );
                    const best = attempts.reduce<number | null>(
                      (best, a) =>
                        a.score == null
                          ? best
                          : best == null || a.score > best
                          ? a.score
                          : best,
                      null
                    );
                    return (
                      <span
                        key={q.id}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]"
                      >
                        <span className="truncate font-medium">{q.title}:</span>
                        <span
                          className={cn(
                            "font-bold",
                            best == null
                              ? "text-muted-foreground"
                              : best >= q.passScore
                              ? "text-emerald-600"
                              : "text-amber-600"
                          )}
                        >
                          {best == null ? "—" : `${best}%`}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {data.assignments.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Assignments
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.assignments.map((a) => {
                    const sub = row.submissions.find(
                      (s) => s.assignmentId === a.id
                    );
                    return (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]"
                      >
                        <span className="truncate font-medium">{a.title}:</span>
                        <span
                          className={cn(
                            "font-bold",
                            !sub
                              ? "text-muted-foreground"
                              : sub.status !== "graded"
                              ? "text-amber-600"
                              : (sub.grade ?? 0) >= a.maxPoints * 0.6
                              ? "text-emerald-600"
                              : "text-amber-600"
                          )}
                        >
                          {!sub
                            ? "—"
                            : sub.status !== "graded"
                            ? sub.status
                            : `${sub.grade}/${a.maxPoints}`}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        ))}
        {data.students.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="No students"
            description="No enrolled students in this course yet."
          />
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  color: "indigo" | "amber" | "emerald" | "violet";
  label: string;
  value: string;
}) {
  const palette: Record<typeof color, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            palette[color]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-extrabold text-foreground">{value}</p>
          <p className="truncate text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof GraduationCap;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}
