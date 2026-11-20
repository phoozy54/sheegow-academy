"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Stats } from "@/lib/types";
import {
  cn,
  formatPrice,
  formatDate,
  timeAgo,
} from "@/lib/ui";
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

const PIE_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#0ea5e9",
];

const STAT_CARDS: {
  key: keyof Pick<
    Stats,
    "totalStudents" | "totalCourses" | "totalRevenue" | "liveClassesCount"
  >;
  label: string;
  icon: typeof Users;
  gradient: string;
  isCurrency?: boolean;
}[] = [
  {
    key: "totalStudents",
    label: "Total Students",
    icon: Users,
    gradient: "from-indigo-500 to-indigo-600",
  },
  {
    key: "totalCourses",
    label: "Total Courses",
    icon: BookOpen,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    key: "totalRevenue",
    label: "Total Revenue",
    icon: DollarSign,
    gradient: "from-emerald-500 to-teal-600",
    isCurrency: true,
  },
  {
    key: "liveClassesCount",
    label: "Live Classes",
    icon: Video,
    gradient: "from-violet-500 to-purple-600",
  },
];

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
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
          err instanceof ApiError ? err.message : "Failed to load dashboard";
        toast.error(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
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
          Could not load dashboard data. Please try again later.
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
                  {s.label}
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
                Revenue (last 6 months)
              </h3>
              <p className="text-xs text-muted-foreground">
                Monthly completed payment totals
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
              <EmptyChart label="No revenue data yet" />
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
                    formatter={(value: number) => [formatPrice(value), "Revenue"]}
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
              Enrollments by Level
            </h3>
            <p className="text-xs text-muted-foreground">
              Distribution across course levels
            </p>
          </div>
          <div className="w-full">
            {levelData.length === 0 ? (
              <EmptyChart label="No enrollments yet" />
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
              Recent Enrollments
            </h3>
            <p className="text-xs text-muted-foreground">
              Latest students who joined a course
            </p>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 border-amber-200 bg-amber-50 text-amber-700"
          >
            <GraduationCap className="h-3 w-3" />
            {stats.totalEnrollments.toLocaleString()} total
          </Badge>
        </div>
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Student</TableHead>
                <TableHead className="min-w-[200px]">Course</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {recent.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No enrollments yet.
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
