"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { LiveClass } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Radio,
  Clock,
  Loader2,
  Video,
  Calendar as CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn, isLiveNow, levelBadgeClass } from "@/lib/ui";
import { useT } from "@/lib/i18n";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Returns a Date set to the first day of the month for the given year/month
 * (month is 0-indexed, matching JS Date).
 */
function firstOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

/**
 * Returns the weekday index in a Monday-first system (Mon=0 ... Sun=6).
 * JS Date.getDay() returns Sun=0..Sat=6, so we remap.
 */
function mondayFirstIndex(date: Date) {
  const jsDay = date.getDay(); // Sun=0..Sat=6
  return (jsDay + 6) % 7;
}

/** Returns the number of days in a given month. */
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Compare two dates by Y/M/D only (ignoring time). */
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Returns YYYY-MM-DD in local time — used as the calendar day key. */
function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Build a 6x7 grid of day cells (42 cells) for a given month. Always starts
 * on Monday; days outside the month are marked `outside` so they render muted.
 */
function buildMonthGrid(year: number, month: number): Date[] {
  const first = firstOfMonth(year, month);
  const offset = mondayFirstIndex(first);
  const gridStart = new Date(year, month, 1 - offset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

function statusColor(status: string, scheduledAt: string, duration: number) {
  if (status === "ended") return "bg-muted text-muted-foreground";
  if (status === "live") return "bg-red-500 text-white hover:bg-red-600";
  if (isLiveNow(scheduledAt, duration, status)) return "bg-red-500 text-white hover:bg-red-600";
  return "bg-indigo-500 text-white hover:bg-indigo-600";
}

function statusBorder(status: string, scheduledAt: string, duration: number) {
  if (status === "ended") return "border-muted-foreground/30";
  if (status === "live") return "border-red-400";
  if (isLiveNow(scheduledAt, duration, status)) return "border-red-400";
  return "border-indigo-400";
}

function formatHourMinute(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CalendarView() {
  const t = useT();
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Show ALL classes (live + scheduled + recently ended) so the calendar
      // reflects reality. The upcoming endpoint is filtered server-side to
      // upcoming/live only — that keeps the list reasonable for the grid.
      const r = await api.upcomingClasses();
      // Defensively handle both { items } and { classes } response shapes.
      const list =
        (r as unknown as { items?: LiveClass[] }).items ?? r.classes ?? [];
      setClasses(list);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not load calendar";
      setError(msg);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const monthGrid = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor]
  );

  // Group classes by day key for O(1) lookup per calendar cell.
  const byDay = useMemo(() => {
    const map = new Map<string, LiveClass[]>();
    for (const c of classes) {
      const d = new Date(c.scheduledAt);
      const key = dayKey(d);
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    // Sort each day's classes by start time
    for (const arr of Array.from(map.values())) {
      arr.sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    }
    return map;
  }, [classes]);

  const goToPrevMonth = () =>
    setCursor((c) => ({
      year: c.month === 0 ? c.year - 1 : c.year,
      month: c.month === 0 ? 11 : c.month - 1,
    }));

  const goToNextMonth = () =>
    setCursor((c) => ({
      year: c.month === 11 ? c.year + 1 : c.year,
      month: c.month === 11 ? 0 : c.month + 1,
    }));

  const goToToday = () =>
    setCursor({ year: today.getFullYear(), month: today.getMonth() });

  // Group for mobile list view — only show classes in the current cursor month
  const monthClasses = useMemo(() => {
    return classes
      .filter((c) => {
        const d = new Date(c.scheduledAt);
        return (
          d.getFullYear() === cursor.year && d.getMonth() === cursor.month
        );
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
  }, [classes, cursor]);

  const title = `${MONTH_NAMES[cursor.month]} ${cursor.year}`;
  const isCurrentMonth =
    cursor.year === today.getFullYear() && cursor.month === today.getMonth();

  return (
    <div className="bg-background">
      {/* ─── HEADER ───────────────────────────────────── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-indigo-50/60 to-background">
        <div className="hero-mesh absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <Badge
            variant="outline"
            className="mb-4 inline-flex items-center gap-1.5 border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
          >
            <CalendarDays className="h-3 w-3" /> {t("calendar.eyebrow")}
          </Badge>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("calendar.title1")} <span className="gradient-text">{t("calendar.titleHighlight")}</span>{t("calendar.title2")}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("calendar.desc")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ─── Toolbar ─── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevMonth}
              aria-label={t("calendar.previousMonth")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="min-w-[180px] text-center text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {title}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
              aria-label={t("calendar.nextMonth")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {!isCurrentMonth && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={goToToday}
              >
                <CalendarIcon className="h-3.5 w-3.5" /> {t("calendar.today")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => router.push("/live-classes")}
            >
              <Video className="h-3.5 w-3.5" /> {t("calendar.allClasses")}
            </Button>
          </div>
        </div>

        {/* ─── Legend ─── */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            {t("calendar.liveNow")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            {t("calendar.scheduled")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
            {t("calendar.ended")}
          </span>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={load} variant="outline" className="mt-4 gap-1.5">
              <Loader2 className="h-4 w-4" /> Try again
            </Button>
          </Card>
        ) : classes.length === 0 ? (
          <Card className="p-10 text-center">
            <CalendarDays className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-semibold">{t("calendar.noClassesScheduled")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("calendar.noClassesDesc")}
            </p>
            <Button
              onClick={() => router.push("/courses")}
              variant="outline"
              className="mt-4 gap-1.5"
            >
              Browse courses
            </Button>
          </Card>
        ) : (
          <>
            {/* ─── DESKTOP: monthly grid (>= md) ─── */}
            <Card className="hidden overflow-hidden p-0 md:block">
              {/* Weekday header */}
              <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="px-2 py-2">
                    {d}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7">
                {monthGrid.map((day, i) => {
                  const key = dayKey(day);
                  const dayClasses = byDay.get(key) ?? [];
                  const outside =
                    day.getMonth() !== cursor.month ||
                    day.getFullYear() !== cursor.year;
                  const isToday = isSameDay(day, today);
                  return (
                    <div
                      key={`${key}-${i}`}
                      className={cn(
                        "min-h-[110px] border-b border-r p-1.5 align-top lg:min-h-[140px]",
                        i % 7 === 6 && "border-r-0",
                        outside && "bg-muted/30 text-muted-foreground",
                        isToday && !outside && "bg-indigo-50/60"
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            isToday
                              ? "flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white"
                              : outside
                                ? "text-muted-foreground/60"
                                : "text-foreground"
                          )}
                        >
                          {day.getDate()}
                        </span>
                        {dayClasses.length > 0 && (
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {dayClasses.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayClasses.slice(0, 3).map((c) => {
                          const live =
                            c.status === "live" ||
                            isLiveNow(c.scheduledAt, c.duration, c.status);
                          const ended = c.status === "ended";
                          return (
                            <button
                              key={c.id}
                              onClick={() => router.push(`/class/${c.id}`)}
                              className={cn(
                                "block w-full truncate rounded-md border px-1.5 py-1 text-left text-[10px] font-medium transition-colors lg:text-[11px]",
                                statusBorder(c.status, c.scheduledAt, c.duration),
                                ended
                                  ? "bg-muted/60 text-muted-foreground hover:bg-muted"
                                  : live
                                    ? "bg-red-500/95 text-white hover:bg-red-600"
                                    : "bg-indigo-500/95 text-white hover:bg-indigo-600"
                              )}
                              title={`${c.title} · ${formatHourMinute(
                                new Date(c.scheduledAt)
                              )}`}
                            >
                              <span className="font-semibold">
                                {formatHourMinute(new Date(c.scheduledAt))}
                              </span>{" "}
                              {c.title}
                            </button>
                          );
                        })}
                        {dayClasses.length > 3 && (
                          <p className="px-1 text-[10px] text-muted-foreground">
                            +{dayClasses.length - 3} {t("calendar.more")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ─── MOBILE: list grouped by date ─── */}
            <div className="space-y-4 md:hidden">
              {monthClasses.length === 0 ? (
                <Card className="p-8 text-center">
                  <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">{t("calendar.noClassesThisMonth")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("calendar.tryAnotherMonth")}
                  </p>
                </Card>
              ) : (
                monthClasses.map((c) => {
                  const start = new Date(c.scheduledAt);
                  const live =
                    c.status === "live" ||
                    isLiveNow(c.scheduledAt, c.duration, c.status);
                  const ended = c.status === "ended";
                  return (
                    <Card
                      key={c.id}
                      className={cn(
                        "p-0 overflow-hidden",
                        !ended && "card-lift"
                      )}
                    >
                      <button
                        onClick={() => router.push(`/class/${c.id}`)}
                        className="flex w-full items-stretch text-left"
                      >
                        {/* Date strip */}
                        <div
                          className={cn(
                            "flex w-16 shrink-0 flex-col items-center justify-center px-2 py-3 text-white",
                            ended
                              ? "bg-muted-foreground/40"
                              : live
                                ? "bg-red-500"
                                : "bg-indigo-500"
                          )}
                        >
                          <span className="text-[10px] font-semibold uppercase">
                            {start.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <span className="text-xl font-extrabold leading-none">
                            {start.getDate()}
                          </span>
                          <span className="mt-1 text-[10px]">
                            {formatHourMinute(start)}
                          </span>
                        </div>
                        {/* Body */}
                        <div className="min-w-0 flex-1 p-3">
                          <div className="mb-1 flex items-center gap-1.5">
                            {live && (
                              <Badge className="bg-red-500 px-1.5 py-0 text-[9px] font-bold uppercase text-white">
                                <Radio className="mr-0.5 h-2.5 w-2.5 animate-live-pulse" />
                                Live
                              </Badge>
                            )}
                            {ended && (
                              <Badge variant="outline" className="px-1.5 py-0 text-[9px] uppercase">
                                Ended
                              </Badge>
                            )}
                            {c.course?.level && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "px-1.5 py-0 text-[9px]",
                                  levelBadgeClass(c.course.level)
                                )}
                              >
                                {c.course.level}
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-sm font-bold text-foreground">
                            {c.title}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {c.duration}m
                            </span>
                            {c.teacher && (
                              <span className="truncate">· {c.teacher.fullName}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    </Card>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
