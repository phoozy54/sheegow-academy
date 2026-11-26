"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import type { Lesson, Quiz } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  FileText,
  Loader2,
  LockKeyhole,
  LogIn,
  PlayCircle,
  Video,
  ClipboardList,
  Hammer,
  Pencil,
  Sparkles,
  StickyNote,
  MessageSquare,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { AnnouncementsPanel } from "./announcements-panel";
import { DiscussionPanel } from "./discussion-panel";
import { NotesPanel } from "./notes-panel";
import { useT } from "@/lib/i18n";
import { formatDateTime } from "@/lib/ui";

type CurriculumData = Awaited<ReturnType<typeof api.curriculum>>;
type RoadmapLesson = Lesson;

const TYPE_ICONS: Record<string, typeof BookOpen> = {
  video: Video,
  pdf: FileText,
  text: BookOpen,
  quiz: ClipboardList,
  live: PlayCircle,
  assignment: ClipboardList,
};

export function CoursePlayerView({ courseId }: { courseId: string }) {
  const t = useT();
  const { user, authLoading, openAuthModal } = useStore();
  const router = useRouter();
  const [data, setData] = useState<CurriculumData | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.curriculum(courseId);
      setData(res);
      setActiveId((current) => {
        // Keep the current lesson if it still exists AND isn't locked.
        if (current) {
          const match = res.roadmap.modules
            .flatMap((m) => m.lessons)
            .find((l) => l.id === current);
          if (match && !match.isLocked) return current;
        }
        // nextLessonId from the API already skips locked lessons, so prefer it.
        if (res.roadmap.nextLessonId) return res.roadmap.nextLessonId;
        // Fall back to the first non-locked lesson in the roadmap.
        const firstAvailable = res.roadmap.modules
          .flatMap((m) => m.lessons)
          .find((l) => !l.isLocked);
        return firstAvailable?.id ?? res.roadmap.modules[0]?.lessons[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("coursePlayer.couldNotLoad"));
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  const allLessons = useMemo(
    () => data?.roadmap.modules.flatMap((m) => m.lessons) ?? [],
    [data]
  );
  const activeLesson = allLessons.find((l) => l.id === activeId) ?? null;

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <LogIn className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
        <h1 className="text-xl font-bold">{t("myCourses.loginToSee")}</h1>
        <Button className="mt-4" onClick={() => openAuthModal("login")}>{t("auth.logIn")}</Button>
      </div>
    );
  }

  const roadmap = data?.roadmap;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 gap-1.5 -ml-2" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4" /> {t("coursePlayer.dashboard")}
          </Button>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            {data?.course.title || t("coursePlayer.courseFallback")}
          </h1>
        </div>
        {roadmap && (
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {roadmap.completedLessons}/{roadmap.totalLessons} {t("coursePlayer.lessons")}
            </Badge>
            <Badge variant="outline">{roadmap.remainingLessons} {t("coursePlayer.left")}</Badge>
          </div>
        )}
      </div>

      {data?.canManage && courseId && (
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 border-fuchsia-200 bg-fuchsia-50/60 p-4 dark:bg-fuchsia-950/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-fuchsia-800 dark:text-fuchsia-200">
            <Hammer className="h-4 w-4" /> {t("coursePlayer.teacherMode")}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => router.push("/dashboard?section=courses")}>
              <Pencil className="h-3.5 w-3.5" /> {t("coursePlayer.editCourse")}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => router.push("/dashboard?section=content-builder")}>
              <Hammer className="h-3.5 w-3.5" /> {t("coursePlayer.manageLessons")}
            </Button>
          </div>
        </Card>
      )}

      {roadmap && (
        <div className="mb-5">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-medium text-muted-foreground">{t("coursePlayer.yourRoadmap")}</span>
            <span className="font-bold text-foreground">{roadmap.percent}% {t("coursePlayer.complete")}</span>
          </div>
          <Progress value={roadmap.percent} className="h-2" />
        </div>
      )}

      {error && (
        <Card className="mb-5 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}{" "}
          <button className="font-semibold underline" onClick={() => router.push("/courses")}>
            {t("coursePlayer.browseCourses")}
          </button>
        </Card>
      )}

      {data && (data.hasAccess || data.canManage) && (
        <div className="mb-5">
          <AnnouncementsPanel
            courseId={courseId}
            canManage={!!data.canManage}
            compact
          />
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <Skeleton className="h-[500px] w-full" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      ) : data && roadmap ? (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* ─── Roadmap sidebar ─── */}
          <aside className="order-2 lg:order-1 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  {t("coursePlayer.courseRoadmap")}
                </h2>
                <span className="text-xs font-semibold text-emerald-600">
                  {roadmap.percent}%
                </span>
              </div>
              <div className="space-y-5">
                {roadmap.modules.map((module, mi) => (
                  <div key={module.id}>
                    <div className="mb-2 flex items-baseline gap-2">
                      <span className="text-[11px] font-bold uppercase text-emerald-500">
                        {t("coursePlayer.module")} {mi + 1}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{module.title}</span>
                    </div>
                    <div className="space-y-1">
                      {module.lessons.map((lesson) => {
                        const done = lesson.progress?.[0]?.status === "completed";
                        const isActive = lesson.id === activeId;
                        const Icon = TYPE_ICONS[lesson.type] || BookOpen;
                        const isLocked = !!lesson.isLocked;
                        const unlockLabel = lesson.unlockAt
                          ? t("coursePlayer.availableOn", {
                              date: formatDateTime(lesson.unlockAt),
                            })
                          : t("coursePlayer.lockedLesson");
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              // Locked lessons can't be opened — show a toast
                              // explaining when they unlock.
                              if (isLocked) {
                                toast.info(unlockLabel);
                                return;
                              }
                              setActiveId(lesson.id);
                            }}
                            disabled={isLocked}
                            aria-disabled={isLocked}
                            title={isLocked ? unlockLabel : undefined}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                              isActive
                                ? "bg-emerald-50 font-semibold text-emerald-700"
                                : isLocked
                                  ? "cursor-not-allowed text-muted-foreground/60"
                                  : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {isLocked ? (
                              <LockKeyhole className="h-4 w-4 shrink-0 text-amber-600" />
                            ) : done ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                            ) : isActive ? (
                              <Circle className="h-4 w-4 shrink-0 fill-emerald-500 text-emerald-500" />
                            ) : data.hasAccess || lesson.isPreview ? (
                              <Icon className="h-4 w-4 shrink-0" />
                            ) : (
                              <LockKeyhole className="h-4 w-4 shrink-0" />
                            )}
                            <span className="line-clamp-2 flex-1">{lesson.title}</span>
                            {isLocked && lesson.unlockAt && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                                <CalendarClock className="h-3 w-3" />
                                {unlockLabel}
                              </span>
                            )}
                            {!isLocked && lesson.type === "quiz" && (
                              <span className="text-[10px] font-bold uppercase text-amber-600">{t("coursePlayer.test")}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </aside>

          {/* ─── Lesson panel ─── */}
          <section className="order-1 min-w-0 lg:order-2">
            {activeLesson ? (
              <LessonPanel
                key={activeLesson.id}
                lesson={activeLesson}
                hasAccess={data.hasAccess || activeLesson.isPreview}
                courseId={courseId}
                onRefresh={refresh}
                onEnroll={() => router.push(`/checkout/${courseId}`)}
                onNext={() => {
                  // Skip locked lessons when advancing — jump to the next
                  // available (non-locked) lesson in the roadmap.
                  const index = allLessons.findIndex((l) => l.id === activeLesson.id);
                  for (let i = index + 1; i < allLessons.length; i++) {
                    if (!allLessons[i].isLocked) {
                      setActiveId(allLessons[i].id);
                      return true;
                    }
                  }
                  return false;
                }}
              />
            ) : (
              <Card className="p-10 text-center">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
                <h2 className="font-bold">{t("coursePlayer.noLessons")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("coursePlayer.teacherPreparing")}
                </p>
                <Button className="mt-4" variant="outline" onClick={() => router.push(`/learn/${courseId}`)}>
                  {t("coursePlayer.refresh")}
                </Button>
              </Card>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Single lesson ──────────────────────────────────────────────── */

function LessonPanel({
  lesson,
  hasAccess,
  courseId,
  onRefresh,
  onEnroll,
  onNext,
}: {
  lesson: RoadmapLesson;
  hasAccess: boolean;
  courseId: string;
  onRefresh: () => Promise<void>;
  onEnroll: () => void;
  onNext: () => boolean;
}) {
  const t = useT();
  const [saving, setSaving] = useState(false);
  const lastSave = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [finished, setFinished] = useState(false);

  const save = async (
    status?: "in_progress" | "completed",
    position?: number,
    advance = false
  ) => {
    setSaving(true);
    try {
      await api.saveProgress(lesson.id, {
        status,
        lastPositionSec: position,
        secondsWatched: position,
      });
      await onRefresh();
      if (status === "completed") {
        toast.success(t("coursePlayer.lessonCompletedToast"));
        if (advance && !onNext()) setFinished(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("coursePlayer.couldNotSaveProgress"));
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (!onNext()) setFinished(true);
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const now = Date.now();
    if (now - lastSave.current < 15_000) return;
    lastSave.current = now;
    void save("in_progress", Math.floor(video.currentTime));
  };

  const done = lesson.progress?.[0]?.status === "completed";
  const isLocked = !!lesson.isLocked;
  const unlockLabel = lesson.unlockAt
    ? t("coursePlayer.lessonLockedDesc", { date: formatDateTime(lesson.unlockAt) })
    : t("coursePlayer.lessonLocked");

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="border-b p-5 sm:p-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">{lesson.type}</Badge>
            {isLocked && (
              <Badge className="gap-1 bg-amber-500">
                <LockKeyhole className="h-3 w-3" /> {t("coursePlayer.lockedLesson")}
              </Badge>
            )}
            {done && (
              <Badge className="gap-1 bg-emerald-600">
                <CheckCircle2 className="h-3 w-3" /> {t("coursePlayer.completed")}
              </Badge>
            )}
            {lesson.durationSec ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {Math.round(lesson.durationSec / 60)} {t("coursePlayer.min")}
              </span>
            ) : null}
          </div>
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{lesson.title}</h2>
        </div>

        <CardContent className="p-5 sm:p-6">
          {isLocked ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
              <CalendarClock className="mx-auto mb-3 h-10 w-10 text-amber-600" />
              <p className="text-lg font-bold text-amber-900">
                {t("coursePlayer.lessonLocked")}
              </p>
              <p className="mt-1 text-sm text-amber-800">{unlockLabel}</p>
              <p className="mt-3 text-xs text-amber-700/80">
                {t("coursePlayer.comeBackLater")}
              </p>
            </div>
          ) : !hasAccess ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
              <LockKeyhole className="mx-auto mb-2 h-7 w-7 text-amber-600" />
              <p className="font-semibold text-amber-900">{t("coursePlayer.thisLessonEnrolled")}</p>
              <p className="mt-1 text-sm text-amber-800">
                {t("coursePlayer.enrollToUnlock")}
              </p>
              <Button
                className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={onEnroll}
              >
                <Sparkles className="h-4 w-4" /> {t("coursePlayer.enrollToUnlockBtn")}
              </Button>
            </div>
          ) : (
            <>
              {lesson.type === "video" && lesson.videoUrl && (
                <video
                  ref={videoRef}
                  controls
                  preload="metadata"
                  className="mb-5 aspect-video w-full rounded-lg bg-black"
                  src={lesson.videoUrl}
                  onTimeUpdate={onTimeUpdate}
                  onEnded={() =>
                    void save("completed", Math.floor(videoRef.current?.duration || 0), true)
                  }
                />
              )}
              {lesson.type === "video" && !lesson.videoUrl && (
                <div className="mb-5 flex aspect-video items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                  {t("coursePlayer.noVideoUploaded")}
                </div>
              )}

              {lesson.body && (
                <div className="prose prose-sm mb-5 max-w-none text-foreground dark:prose-invert">
                  <ReactMarkdown>{lesson.body}</ReactMarkdown>
                </div>
              )}

              {lesson.materials && lesson.materials.length > 0 && (
                <div className="mb-5">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                    <FileText className="h-4 w-4 text-emerald-500" /> {t("coursePlayer.courseMaterials")}
                  </h3>
                  <div className="space-y-2">
                    {lesson.materials.map((m) => (
                      <a
                        key={m.id}
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-emerald-500" />
                          <span className="truncate font-medium">{m.name}</span>
                        </span>
                        <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {lesson.type === "quiz" && lesson.quiz && (
                <QuizPanel
                  quizId={lesson.quiz.id}
                  onPassed={() => void save("completed")}
                  onNext={goNext}
                />
              )}
              {lesson.type === "assignment" && lesson.assignment && (
                <AssignmentPanel
                  assignmentId={lesson.assignment.id}
                  courseId={courseId}
                  onSubmitted={() => void save("completed")}
                />
              )}

              <div className="flex flex-wrap items-center gap-2 border-t pt-5">
                {lesson.type !== "quiz" && (
                  <Button
                    onClick={() => void save("completed", undefined, true)}
                    disabled={saving || done}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {done ? t("coursePlayer.completed") : t("coursePlayer.markComplete")}
                  </Button>
                )}
                <Button variant="outline" onClick={goNext} className="gap-2">
                  {t("coursePlayer.nextLesson")} <ArrowLeft className="h-4 w-4 rotate-180" />
                </Button>
                <Button
                  variant="ghost"
                  className="ml-auto gap-2 text-emerald-700"
                  onClick={async () => {
                    const res = await api.certificateEligibility(courseId);
                    setShowCertificate(true);
                    if (!res.eligibility.eligible) {
                      toast.info(res.eligibility.reasons[0] || t("coursePlayer.keepGoing"));
                    }
                  }}
                >
                  <Award className="h-4 w-4" /> {t("coursePlayer.certificate")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {finished && (
        <Card className="border-emerald-200 bg-emerald-50 p-6 text-center">
          <Award className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
          <h3 className="text-lg font-bold text-emerald-900">{t("coursePlayer.reachedEnd")}</h3>
          <p className="mt-1 text-sm text-emerald-800">
            {t("coursePlayer.checkCertificate")}
          </p>
          <Button
            className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setShowCertificate(true)}
          >
            <Award className="h-4 w-4" /> {t("coursePlayer.viewCertificateOptions")}
          </Button>
        </Card>
      )}

      {showCertificate && (
        <CertificateQuickPanel courseId={courseId} onClose={() => setShowCertificate(false)} />
      )}

      {hasAccess && !isLocked && (
        <Tabs defaultValue="notes" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <TabsTrigger
              value="notes"
              className="flex items-center justify-center gap-2 py-2 text-sm data-[state=active]:bg-background data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              <StickyNote className="h-4 w-4" /> {t("coursePlayer.myNotes")}
            </TabsTrigger>
            <TabsTrigger
              value="qa"
              className="flex items-center justify-center gap-2 py-2 text-sm data-[state=active]:bg-background data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              <MessageSquare className="h-4 w-4" /> {t("coursePlayer.qaLesson")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="notes" className="mt-4">
            <NotesPanel lessonId={lesson.id} variant="card" />
          </TabsContent>
          <TabsContent value="qa" className="mt-4">
            <DiscussionPanel
              courseId={courseId}
              compact
              defaultOpen
              filterLessonId={lesson.id}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ─── Quiz in the player ─────────────────────────────────────────── */

function QuizPanel({
  quizId,
  onPassed,
  onNext,
}: {
  quizId: string;
  onPassed: () => void;
  onNext: () => void;
}) {
  const t = useT();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api.quiz(quizId).then((r) => { if (active) setQuiz(r.quiz); }).catch(() => {});
    return () => { active = false; };
  }, [quizId]);

  const start = async () => {
    setBusy(true);
    try {
      const r = await api.startQuiz(quizId);
      setAttemptId(r.attempt.id);
      setQuiz(r.quiz);
      setAnswers({});
      setResult(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("coursePlayer.couldNotStartTest"));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!attemptId) return;
    setBusy(true);
    try {
      const r = await api.submitQuiz(quizId, {
        attemptId,
        answers: Object.entries(answers).map(([questionId, choiceIds]) => ({ questionId, choiceIds })),
      });
      setResult({ score: r.result.score, passed: r.result.passed });
      if (r.result.passed) onPassed();
      toast.success(t("coursePlayer.scoreToast", { score: r.result.score, status: r.result.passed ? t("coursePlayer.scorePassed") : t("coursePlayer.scoreNotPassed") }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("coursePlayer.couldNotSubmitTest"));
    } finally {
      setBusy(false);
    }
  };

  if (!quiz) return <Skeleton className="h-40 w-full" />;

  if (result) {
    return (
      <div className={`rounded-lg border p-5 text-center ${result.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <p className="text-3xl font-extrabold">{result.score}%</p>
        <p className="mt-1 font-semibold">
          {result.passed ? t("coursePlayer.youPassed") : t("coursePlayer.tryAgain")}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void start()}
            disabled={busy}
          >
            <ClipboardList className="h-4 w-4" /> {result.passed ? t("coursePlayer.retakeTest") : t("coursePlayer.tryAgainBtn")}
          </Button>
          {result.passed && (
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={onNext}>
              {t("coursePlayer.nextLesson")} <ArrowLeft className="h-4 w-4 rotate-180" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!attemptId) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
        <ClipboardList className="mx-auto mb-2 h-7 w-7 text-emerald-600" />
        <p className="font-semibold">{quiz.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {quiz.questions?.length || 0} {t("coursePlayer.questions")} · {t("coursePlayer.passMark")} {quiz.passScore}% · {quiz.maxAttempts} {t("coursePlayer.attempts")}
        </p>
        <Button className="mt-3 gap-2 bg-emerald-600" onClick={() => void start()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          {t("coursePlayer.startTest")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {quiz.questions?.map((q, qi) => (
        <div key={q.id} className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-semibold">
            {qi + 1}. {q.prompt}
          </p>
          <div className="space-y-2">
            {(q.choices || []).map((c) => {
              const selected = (answers[q.id] || []).includes(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${selected ? "border-emerald-400 bg-emerald-50" : ""}`}
                >
                  <input
                    type={q.type === "multiple" ? "checkbox" : "radio"}
                    name={q.id}
                    checked={selected}
                    onChange={() => {
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: q.type === "multiple"
                          ? selected
                            ? (prev[q.id] || []).filter((id) => id !== c.id)
                            : [...(prev[q.id] || []), c.id]
                          : [c.id],
                      }));
                    }}
                  />
                  {c.text}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <Button onClick={() => void submit()} disabled={busy} className="gap-2 bg-emerald-600">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {t("coursePlayer.submitTest")}
      </Button>
    </div>
  );
}

/* ─── Homework in the player ─────────────────────────────────────── */

function AssignmentPanel({
  assignmentId,
  courseId,
  onSubmitted,
}: {
  assignmentId: string;
  courseId: string;
  onSubmitted: () => void;
}) {
  const t = useT();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.assignment>> | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api.assignment(assignmentId).then((r) => { if (active) setData(r); }).catch(() => {});
    return () => { active = false; };
  }, [assignmentId]);

  if (!data) return <Skeleton className="h-32 w-full" />;
  const submission = data.assignment.submissions?.[0];

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <ClipboardList className="h-4 w-4 text-amber-600" /> {data.assignment.title}
      </h3>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{data.assignment.instructions}</p>
      {submission && (
        <div className="mt-3 rounded-md border bg-white p-3 text-sm">
          <p className="font-semibold">
            {submission.status === "graded" ? `${t("coursePlayer.grade")}: ${submission.grade}/${data.assignment.maxPoints}` : t("coursePlayer.submittedAwaiting")}
          </p>
          {submission.feedback && <p className="mt-1 text-muted-foreground">{submission.feedback}</p>}
        </div>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("coursePlayer.writeAnswerHere")}
        rows={4}
        className="mt-3 w-full rounded-md border bg-white p-3 text-sm"
      />
      <Button
        className="mt-2 gap-2"
        disabled={busy || !note.trim()}
        onClick={async () => {
          setBusy(true);
          try {
            await api.submitAssignment(assignmentId, { note });
            const r = await api.assignment(assignmentId);
            setData(r);
            onSubmitted();
            toast.success(t("coursePlayer.homeworkSubmittedToast"));
          } catch (e) {
            toast.error(e instanceof Error ? e.message : t("coursePlayer.couldNotSubmitHomework"));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {submission ? t("coursePlayer.resubmit") : t("coursePlayer.submitHomework")}
      </Button>
      <p className="mt-2 text-[11px] text-muted-foreground">{t("coursePlayer.courseLabel", { courseId })}</p>
    </div>
  );
}

/* ─── Certificate quick panel ────────────────────────────────────── */

function CertificateQuickPanel({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const t = useT();
  const [eligibility, setEligibility] = useState<Awaited<ReturnType<typeof api.certificateEligibility>> | null>(null);
  const [certificate, setCertificate] = useState<Awaited<ReturnType<typeof api.issueCertificate>> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.certificateEligibility(courseId).then(setEligibility).catch(() => {});
  }, [courseId]);

  return (
    <Card className="border-emerald-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold">
            <Award className="h-5 w-5 text-emerald-600" /> {t("coursePlayer.professionalCertificate")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("coursePlayer.issuedAfter")}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>{t("myCourses.close")}</Button>
      </div>
      {eligibility && !certificate && (
        <div className="mt-4 space-y-2 text-sm">
          {eligibility.eligibility.reasons.map((r) => (
            <p key={r} className="flex items-center gap-2 text-amber-700">• {r}</p>
          ))}
          <Button
            className="mt-2 gap-2 bg-emerald-600"
            disabled={!eligibility.eligibility.eligible || busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api.issueCertificate(courseId);
                setCertificate(r);
                toast.success(t("coursePlayer.certificateIssuedToast"));
              } catch {
                toast.error(t("coursePlayer.couldNotIssueCertificate"));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
            {t("coursePlayer.issueCertificate")}
          </Button>
        </div>
      )}
      {certificate && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-800">{t("coursePlayer.serial", { serial: certificate.certificate.serial })}</p>
          <a
            className="mt-2 inline-block font-semibold text-emerald-700 underline"
            href={`/verify/${certificate.certificate.verificationCode}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("coursePlayer.openVerification")}
          </a>
        </div>
      )}
    </Card>
  );
}
