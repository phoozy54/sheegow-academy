"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { LiveClass, Stats } from "@/lib/types";
import {
  cn,
  formatPrice,
  formatDate,
  formatDateTime,
  timeAgo,
} from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  BookOpen,
  DollarSign,
  Video,
  ArrowUpRight,
  GraduationCap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

const PIE_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#0ea5e9",
];

const STAT_CARDS: {
  key: keyof Pick<
    Stats,
    "totalStudents" | "totalCourses" | "totalRevenue" | "liveClassesCount"
  >;
  labelKey: string;
  icon: typeof Users;
  gradient: string;
  isCurrency?: boolean;
}[] = [
  {
    key: "totalStudents",
    labelKey: "admin.dashboard.totalStudents",
    icon: Users,
    gradient: "from-indigo-500 to-indigo-600",
  },
  {
    key: "totalCourses",
    labelKey: "admin.dashboard.totalCourses",
    icon: BookOpen,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    key: "totalRevenue",
    labelKey: "admin.dashboard.totalRevenue",
    icon: DollarSign,
    gradient: "from-indigo-500 to-teal-600",
    isCurrency: true,
  },
  {
    key: "liveClassesCount",
    labelKey: "admin.dashboard.liveClasses",
    icon: Video,
    gradient: "from-violet-500 to-purple-600",
  },
];

export function AdminDashboard() {
  const t = useT();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // loading is initialized to true in useState, and this effect only runs
    // once on mount, so we don't need to call setLoading(true) again here
    // (doing so synchronously inside an effect triggers cascading renders).
    api
      .stats()
      .then((r) => {
        if (active) setStats(r.stats);
      })
      .catch((err) => {
        const msg =
          err instanceof ApiError ? err.message : t("admin.dashboard.loadFailed");
        toast.error(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    api
      .liveClasses()
      .then((r) => {
        if (active) setLiveClasses(r.classes.slice(0, 5));
      })
      .catch(() => {
        // Non-fatal: the stat card above still reports the class count.
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl sm:h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-xl md:col-span-2" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">
          {t("admin.dashboard.couldNotLoad")}
        </p>
      </Card>
    );
  }

  const recent = stats.recentEnrollments.slice(0, 5);
  const revenueData = stats.revenueByMonth.map((m) => ({
    name: m.month,
    revenue: m.revenue,
  }));
  const levelData = stats.enrollmentsByLevel.map((e) => ({
    name: e.level,
    value: e.count,
  }));

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {STAT_CARDS.map((s) => {
          const raw = stats[s.key] as number;
          const display = s.isCurrency ? formatPrice(raw) : raw.toLocaleString();
          return (
            <Card key={s.key} className="card-lift relative overflow-hidden p-3 sm:p-5">
              <div
                className={cn(
                  "absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full opacity-10 bg-gradient-to-br",
                  s.gradient
                )}
              />
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md sm:h-11 sm:w-11",
                    s.gradient
                  )}
                >
                  <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="mt-3 sm:mt-4">
                <p className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                  {display}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  {t(s.labelKey)}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Revenue */}
        <Card className="p-4 sm:p-6 md:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground sm:text-base">
                {t("admin.dashboard.revenueTitle")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("admin.dashboard.revenueSubtitle")}
              </p>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 border-indigo-200 bg-indigo-50 text-indigo-700"
            >
              <DollarSign className="h-3 w-3" />
              {formatPrice(stats.totalRevenue)}
            </Badge>
          </div>
          <div className="w-full">
            {revenueData.length === 0 ? (
              <EmptyChart label={t("admin.dashboard.noRevenueData")} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={revenueData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="barIndigo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#4338ca" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(0,0,0,0.06)"
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "currentColor" }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "currentColor" }}
                    className="text-muted-foreground"
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(99,102,241,0.08)" }}
                    formatter={(value: number) => [formatPrice(value), t("admin.dashboard.revenueLabel")]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.08)",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="url(#barIndigo)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Enrollments by level */}
        <Card className="p-4 sm:p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground sm:text-base">
              {t("admin.dashboard.enrollmentsByLevelTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("admin.dashboard.enrollmentsByLevelSubtitle")}
            </p>
          </div>
          <div className="w-full min-w-0">
            {levelData.length === 0 ? (
              <EmptyChart label={t("admin.dashboard.noEnrollmentsData")} />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={levelData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {levelData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.08)",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Recent enrollments */}
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground sm:text-base">
              {t("admin.dashboard.recentEnrollmentsTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("admin.dashboard.recentEnrollmentsSubtitle")}
            </p>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 border-amber-200 bg-amber-50 text-amber-700"
          >
            <GraduationCap className="h-3 w-3" />
            {stats.totalEnrollments.toLocaleString()} {t("admin.dashboard.total")}
          </Badge>
        </div>
        <div className="-mx-3 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">{t("admin.dashboard.colStudent")}</TableHead>
                <TableHead className="min-w-[200px]">{t("admin.dashboard.colCourse")}</TableHead>
                <TableHead className="text-right">{t("admin.dashboard.colWhen")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {recent.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {t("admin.dashboard.noEnrollments")}
                </TableCell>
              </TableRow>
            ) : (
              recent.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-foreground">
                    {e.studentName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.courseTitle}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs font-medium text-foreground">
                        {timeAgo(e.enrolledAt)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(e.enrolledAt)}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Live classes — visible on the admin overview too */}
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground sm:text-base">
              {t("admin.dashboard.liveClassesTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("admin.dashboard.liveClassesSubtitle")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard?section=live")}
            className="shrink-0 gap-1.5"
          >
            <Video className="h-3.5 w-3.5" /> {t("admin.dashboard.manage")}
          </Button>
        </div>
        {liveClasses.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("admin.dashboard.noClassesScheduled")}
          </p>
        ) : (
          <div className="space-y-2">
            {liveClasses.map((lc) => (
              <div
                key={lc.id}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {lc.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {lc.course?.title ?? t("admin.dashboard.noCourse")} · {formatDateTime(lc.scheduledAt)} · {lc.duration}{t("admin.dashboard.m")}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "w-fit shrink-0",
                    lc.status === "live"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : lc.status === "ended"
                        ? "border-muted bg-muted text-muted-foreground"
                        : "border-indigo-200 bg-indigo-50 text-indigo-700"
                  )}
                >
                  {lc.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[250px] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <ArrowUpRight className="h-8 w-8 opacity-30" />
      <p className="text-xs">{label}</p>
    </div>
  );
}
