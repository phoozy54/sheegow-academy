"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import type { LiveClass, TrialRequest } from "@/lib/types";
import { toast } from "sonner";
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
  CheckCircle2,
  Sparkles,
  Pencil,
} from "lucide-react";
import {
  formatDateTime,
  isLiveNow,
  levelBadgeClass,
  cn,
} from "@/lib/ui";
import { useT } from "@/lib/i18n";

type TrialStatus = "pending" | "approved" | "rejected";

type TrialActionProps = {
  classId: string;
  status?: TrialStatus;
  isStudent: boolean;
  requesting: boolean;
  onRequest: (classId: string) => void;
};

function requestStatus(request?: TrialRequest): TrialStatus | undefined {
  if (!request) return undefined;
  if (request.status === "completed") {
    if (request.expiresAt && new Date(request.expiresAt).getTime() < Date.now()) {
      return undefined;
    }
    return "approved";
  }
  if (request.status === "failed") return "rejected";
  return "pending";
}

export function LiveClassesView() {
  const t = useT();
  const user = useStore((s) => s.user);
  const openAuthModal = useStore((s) => s.openAuthModal);
  const router = useRouter();

  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trialRequests, setTrialRequests] = useState<TrialRequest[]>([]);
  const [requestingTrial, setRequestingTrial] = useState<string | null>(null);

  const isStudent = user?.role === "student";
  // Teachers, admins and super admins host/manage classes — never students.
  const isManager =
    user?.role === "teacher" ||
    user?.role === "admin" ||
    user?.role === "super_admin";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Managers see EVERY class (including ended); students see only the
      // public upcoming/live window. Read both response shapes to be robust.
      const r = isManager
        ? await api.liveClasses()
        : await api.upcomingClasses();
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
  }, [isManager]);

  useEffect(() => {
    load();
  }, [load]);

  const loadTrials = useCallback(async () => {
    if (user?.role !== "student") {
      setTrialRequests([]);
      return;
    }
    try {
      const r = await api.trialRequests();
      setTrialRequests(r.requests);
    } catch {
      // Non-fatal: the student can still join/buy normally.
      setTrialRequests([]);
    }
  }, [user?.role]);

  useEffect(() => {
    loadTrials();
  }, [loadTrials]);

  // Latest request per class (the API returns newest first).
  const trialByClass = useMemo(() => {
    const map = new Map<string, TrialRequest>();
    for (const r of trialRequests) {
      if (r.classId && !map.has(r.classId)) map.set(r.classId, r);
    }
    return map;
  }, [trialRequests]);

  const handleRequestTrial = async (classId: string) => {
    if (!user) {
      openAuthModal("register");
      return;
    }
    setRequestingTrial(classId);
    try {
      await api.requestTrial(classId);
      toast.success("Trial request sent. An admin will review it shortly.");
      await loadTrials();
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not send the trial request"
      );
    } finally {
      setRequestingTrial(null);
    }
  };

  const trialProps = (classId: string): TrialActionProps => ({
    classId,
    status: requestStatus(trialByClass.get(classId)),
    isStudent,
    requesting: requestingTrial === classId,
    onRequest: handleRequestTrial,
  });

  // Partition into "live now" and "scheduled". Managers also get ended
  // classes, which are sorted to the bottom instead of the top of the list.
  const liveNow = classes.filter((c) => isLiveNow(c.scheduledAt, c.duration, c.status));
  const upcoming = classes
    .filter((c) => !isLiveNow(c.scheduledAt, c.duration, c.status))
    .sort((a, b) => {
      if (a.status === "ended" && b.status !== "ended") return 1;
      if (b.status === "ended" && a.status !== "ended") return -1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });

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
        <h2 className="text-2xl font-bold text-foreground">{t("live.couldNotLoad")}</h2>
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <Video className="h-8 w-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          {isManager ? t("live.noClassesYet") : t("live.noClasses")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isManager ? t("live.createFromClassManager") : t("live.checkBackSoon")}
        </p>
        <Button
          onClick={() => (isManager ? router.push("/dashboard?section=live") : router.push("/courses"))}
          variant="outline"
          className="mt-6 gap-1.5"
        >
          {isManager ? t("live.openClassManager") : t("courses.allCourses")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background">
      {/* ─── HEADER ───────────────────────────────────── */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-emerald-50/60 to-background">
        <div className="hero-mesh absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Badge
            variant="outline"
            className="mb-4 inline-flex items-center gap-1.5 border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
          >
            <Radio className="h-3 w-3" /> {t("live.badge")}
          </Badge>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t("live.joinLiveNow")} <span className="gradient-text">{t("live.englishClass")}</span> {t("live.rightNow")}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            {t("live.liveHeaderDesc")}
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
                <p className="text-xs text-muted-foreground">{t("live.studentsOnline")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                <Video className="h-5 w-5 text-emerald-600" />
              </span>
              <div>
                <p className="text-lg font-extrabold leading-none text-foreground">
                  {classes.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isManager ? t("live.classesTotal") : t("live.upcoming")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Calendar CTA — every visitor can see the monthly schedule */}
        {!loading && !error && classes.length > 0 && (
          <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Calendar className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {t("live.seeMonthlyCalendar")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("live.browseByDay")}
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/calendar")}
              variant="outline"
              size="sm"
              className="self-start gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 sm:self-auto"
            >
              <Calendar className="h-3.5 w-3.5" /> {t("live.viewCalendar")}
            </Button>
          </div>
        )}

        {/* Manager banner — admins see all statuses plus the management tools */}
        {isManager && (
          <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">
                {t("live.adminViewAll")} {classes.length} {t("live.classesVisible")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("live.adminLiveScheduled")}
              </p>
            </div>
            <Button
              onClick={() => router.push("/dashboard?section=live")}
              className="self-start gap-1.5 bg-emerald-600 hover:bg-emerald-700 sm:self-auto"
              size="sm"
            >
              <Pencil className="h-3.5 w-3.5" /> {t("live.manageAllClasses")}
            </Button>
          </div>
        )}

        {/* ─── LIVE NOW HIGHLIGHT ─────────────────────── */}
        {liveNow.length > 0 && (
          <section className="mb-12">
            <div className="mb-5 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <h2 className="text-xl font-bold text-foreground">{t("live.liveNow")}</h2>
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                {liveNow.length} {t("live.happening")}
              </Badge>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {liveNow.map((lc) => (
                <LiveNowCard
                  key={lc.id}
                  liveClass={lc}
                  onJoin={() => router.push(`/class/${lc.id}`)}
                  onManage={() => router.push("/dashboard?section=live")}
                  isManager={isManager}
                  trial={trialProps(lc.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── UPCOMING CLASSES ───────────────────────── */}
        {upcoming.length > 0 && (
          <section>
            <div className="mb-5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-foreground">
                  {isManager ? t("live.allClasses") : t("live.upcoming")}
                </h2>
              </div>
              <span className="text-sm text-muted-foreground">
                {upcoming.length} {isManager ? t("live.listed") : t("live.scheduled")}
              </span>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((lc) => (
                <LiveClassCard
                  key={lc.id}
                  liveClass={lc}
                  onJoin={() => router.push(`/class/${lc.id}`)}
                  onManage={() => router.push("/dashboard?section=live")}
                  isManager={isManager}
                  trial={trialProps(lc.id)}
                />
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
  onManage,
  isManager,
  trial,
}: {
  liveClass: LiveClass;
  onJoin: () => void;
  onManage: () => void;
  isManager: boolean;
  trial: TrialActionProps;
}) {
  const t = useT();
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
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
              <Video className="h-12 w-12" />
            </div>
          )}
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
            <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-white" />
            {t("courseDetail.live")}
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
                  <AvatarFallback className="bg-emerald-100 text-[8px] font-bold text-emerald-700">
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
              <Users className="h-3 w-3" /> {liveClass.attendeeCount} {t("live.joined")}
            </span>
          </div>

          <Button
            onClick={onJoin}
            className="mt-4 gap-2 bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/30 hover:from-red-600 hover:to-red-700"
          >
            <Video className="h-4 w-4" /> {isManager ? t("live.teachLiveClass") : t("live.joinLiveClass")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {isManager && (
            <Button onClick={onManage} variant="outline" size="sm" className="mt-2 w-full gap-2">
              <Pencil className="h-4 w-4" /> {t("live.manageClass")}
            </Button>
          )}
          <TrialAction trial={trial} />
        </div>
      </div>
    </Card>
  );
}

/* ─── Standard live class card ─────────────────────────── */

function LiveClassCard({
  liveClass,
  onJoin,
  onManage,
  isManager,
  trial,
}: {
  liveClass: LiveClass;
  onJoin: () => void;
  onManage: () => void;
  isManager: boolean;
  trial: TrialActionProps;
}) {
  const t = useT();
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
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
            <PlayCircle className="h-10 w-10 text-emerald-400" />
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
              <AvatarFallback className="bg-emerald-100 text-[9px] font-bold text-emerald-700">
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
            !ended && "bg-emerald-600 hover:bg-emerald-700"
          )}
        >
          {ended ? t("live.classEnded") : isManager ? (
            <>
              {t("live.teachClass")} <ChevronRight className="h-4 w-4" />
            </>
          ) : (
            <>
              {t("live.joinClass")} <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
        {isManager && (
          <Button onClick={onManage} variant="outline" size="sm" className="mt-2 w-full gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Manage class
          </Button>
        )}
        {!ended && <TrialAction trial={trial} />}
      </div>
    </Card>
  );
}

/* ─── Trial request action (students only) ─────────────── */

function TrialAction({ trial }: { trial: TrialActionProps }) {
  const t = useT();
  const { classId, status, isStudent, requesting, onRequest } = trial;
  if (!isStudent) return null;

  if (status === "approved") {
    return (
      <div className="mt-2 flex items-center justify-center gap-1.5 rounded-md bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> {t("live.trialApproved")}
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="mt-2 flex items-center justify-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
        <Clock className="h-3.5 w-3.5" /> {t("live.trialPending")}
      </div>
    );
  }
  return (
    <Button
      onClick={() => onRequest(classId)}
      disabled={requesting}
      variant="outline"
      size="sm"
      className="mt-2 w-full gap-1.5"
    >
      {requesting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {status === "rejected" ? t("live.requestTrialAgain") : t("live.requestFreeTrial")}
    </Button>
  );
}

/* ─── Status badge ──────────────────────────────────────── */

function StatusBadge({ liveClass }: { liveClass: LiveClass }) {
  const t = useT();
  if (liveClass.status === "live") {
    return (
      <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-500/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur">
        <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-white" />
        {t("courseDetail.live")}
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
    <span className="absolute left-3 top-3 rounded-full bg-emerald-500/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur">
      Scheduled
    </span>
  );
}
