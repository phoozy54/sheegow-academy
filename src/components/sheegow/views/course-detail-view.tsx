"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useDevice } from "@/lib/device";
import { api, ApiError } from "@/lib/api";
import type { Course, Enrollment, RatingBreakdown, Review } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMyEnrollments } from "@/lib/use-my-enrollments";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SampleCertificate } from "@/components/sheegow/sample-certificate";
import {
  ArrowLeft,
  Star,
  Clock,
  Calendar,
  Users,
  PlayCircle,
  CheckCircle2,
  Award,
  MessageSquare,
  Video,
  Mail,
  Loader2,
  Sparkles,
  ShieldCheck,
  Pencil,
  Hammer,
  BookOpen,
  LayoutDashboard,
  ListChecks,
  Target,
  GraduationCap,
  Share2,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { levelBadgeClass, formatDate, timeAgo, cn } from "@/lib/ui";
import { toast } from "sonner";
import { AnnouncementsPanel } from "./announcements-panel";
import { DiscussionPanel } from "./discussion-panel";
import { useT } from "@/lib/i18n";

/* ─── Helpers ───────────────────────────────────────────── */

// Parse the newline-separated `whatYouLearn` field into clean bullet points
function parseWhatYouLearn(input?: string | null): string[] {
  if (!input) return [];
  return input
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Derive a professional "Who this course is for" list from level + title
function deriveAudience(course: Pick<Course, "level" | "title">): string[] {
  const level = (course.level || "").toLowerCase();
  const title = (course.title || "").toLowerCase();

  if (level === "kids" || title.includes("kids")) {
    return [
      "Young learners aged 7–14 starting their English journey",
      "Children who learn best through play, songs and stories",
      "Parents who want a safe, structured online class",
      "Beginners with little or no previous English",
    ];
  }

  if (level === "ielts" || title.includes("ielts")) {
    return [
      "Students preparing for the IELTS academic or general exam",
      "Learners aiming for band 6.5 or higher",
      "University or scholarship applicants",
      "Professionals who need a recognised English certificate",
    ];
  }

  if (
    title.includes("business") ||
    title.includes("workplace") ||
    title.includes("email") ||
    title.includes("interview")
  ) {
    return [
      "Working professionals who use English at the office",
      "Job seekers preparing for English-language interviews",
      "Anyone who writes emails, reports or proposals in English",
      "Learners who want to sound confident in meetings",
    ];
  }

  if (level === "beginner") {
    return [
      "Students starting English from zero — or restarting after a break",
      "Learners who can read simple words but struggle to speak",
      "Travellers who want basic survival English",
      "Anyone who wants a friendly, supportive teacher",
    ];
  }

  if (level === "advanced") {
    return [
      "Proficient speakers aiming for near-native fluency",
      "Professionals working in English-only environments",
      "University students writing essays and dissertations",
      "Learners preparing for advanced certifications",
    ];
  }

  // Intermediate default
  return [
    "Learners who can hold basic conversations but want real fluency",
    "Students who have finished a beginner course and want more",
    "Professionals who use English occasionally at work",
    "Anyone preparing to take an IELTS or academic English course",
  ];
}

// Derive skill badges from course level + title
function deriveSkills(course: Pick<Course, "level" | "title">): string[] {
  const level = (course.level || "").toLowerCase();
  const title = (course.title || "").toLowerCase();

  const base = ["Speaking", "Listening", "Vocabulary", "Grammar", "Confidence"];
  const extra: string[] = [];

  if (level === "ielts" || title.includes("ielts")) {
    extra.push("Reading", "Writing", "Test Strategy", "Time Management");
  }
  if (
    title.includes("business") ||
    title.includes("workplace") ||
    title.includes("email") ||
    title.includes("interview")
  ) {
    extra.push("Professional Writing", "Email Etiquette", "Meeting Skills");
  }
  if (
    title.includes("conversation") ||
    title.includes("hadal") ||
    title.includes("ingiriis")
  ) {
    extra.push("Pronunciation", "Conversation Skills", "Fluency");
  }
  if (level === "kids" || title.includes("kids")) {
    extra.push("Phonics", "Reading", "Storytelling");
  }
  if (level === "advanced") {
    extra.push("Critical Thinking", "Academic Writing");
  }

  // Dedupe + cap at 8 badges
  const all = Array.from(new Set([...base, ...extra]));
  return all.slice(0, 8);
}

// Render a row of 5 stars (filled up to `rating`)
function Stars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            size,
            i < Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted"
          )}
        />
      ))}
    </div>
  );
}

/* ─── Rating breakdown histogram ───────────────────────────
 * Five horizontal bars (5★ down to 1★) showing how many reviews each star
 * level received. The average rating + total review count sit next to the
 * bars so visitors can see both the headline number and the distribution.
 * Bars are amber (filled) on a muted track and scale to the largest bucket.
 */
function RatingBreakdownHistogram({
  rating,
  reviewCount,
  breakdown,
}: {
  rating: number;
  reviewCount: number;
  breakdown: RatingBreakdown;
}) {
  const t = useT();
  const buckets: Array<{ stars: 5 | 4 | 3 | 2 | 1; count: number }> = [
    { stars: 5, count: breakdown["5"] ?? 0 },
    { stars: 4, count: breakdown["4"] ?? 0 },
    { stars: 3, count: breakdown["3"] ?? 0 },
    { stars: 2, count: breakdown["2"] ?? 0 },
    { stars: 1, count: breakdown["1"] ?? 0 },
  ];
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <Card className="mb-6 p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
        {/* Average + total — the headline number */}
        <div className="flex shrink-0 flex-row items-center gap-4 sm:flex-col sm:items-center sm:justify-center sm:gap-1">
          <div className="text-center">
            <p className="text-4xl font-extrabold leading-none text-foreground sm:text-5xl">
              {rating.toFixed(1)}
            </p>
            <div className="mt-2 flex justify-center">
              <Stars rating={rating} size="h-4 w-4" />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {reviewCount} {t("courseDetail.reviewsCount")}
            </p>
          </div>
        </div>

        {/* Bars — stack vertically on mobile, single column on desktop */}
        <div className="min-w-0 flex-1 space-y-2">
          {buckets.map(({ stars, count }) => {
            const pct = Math.round((count / max) * 100);
            return (
              <div
                key={stars}
                className="flex items-center gap-3 text-sm"
                aria-label={`${stars} ${t("courseDetail.starLabel")}: ${count} ${t("courseDetail.reviewsCount")}`}
              >
                <span className="flex w-8 shrink-0 items-center gap-0.5 font-medium text-foreground">
                  {stars}
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </span>
                <div
                  className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={count}
                  aria-valuemin={0}
                  aria-valuemax={max}
                >
                  <div
                    className="h-full rounded-full bg-amber-400 transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/* ─── Main view ─────────────────────────────────────────── */

export function CourseDetailView({ courseId }: { courseId: string }) {
  const t = useT();
  const openAuthModal = useStore((s) => s.openAuthModal);
  const user = useStore((s) => s.user);
  const router = useRouter();
  const { isMobile, isTablet } = useDevice();
  const padClass = isMobile
    ? "px-3"
    : isTablet
      ? "px-5"
      : "px-4 sm:px-6 lg:px-8";

  const [course, setCourse] = useState<Course | null>(null);
  const [ratingBreakdown, setRatingBreakdown] = useState<RatingBreakdown>({
    "5": 0,
    "4": 0,
    "3": 0,
    "2": 0,
    "1": 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { byCourse } = useMyEnrollments();

  const loadCourse = useCallback(async () => {
    if (!courseId) {
      setError("No course selected");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.course(courseId);
      setCourse(res.course);
      setRatingBreakdown(res.ratingBreakdown ?? {
        "5": 0,
        "4": 0,
        "3": 0,
        "2": 0,
        "1": 0,
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load course";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  /* ─── Loading state ─────────────────────────────────── */
  if (loading) {
    return (
      <div className={`mx-auto max-w-7xl py-10 ${padClass}`}>
        <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="aspect-[16/9] animate-pulse rounded-2xl bg-muted" />
            <div className="mt-6 h-8 w-3/4 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="mt-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  /* ─── Error state ───────────────────────────────────── */
  if (error || !course) {
    return (
      <div className={`mx-auto max-w-3xl py-20 text-center ${padClass}`}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <PlayCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">{t("courseDetail.courseNotFound")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error || t("courseDetail.notFoundDesc")}
        </p>
        <Button
          onClick={() => router.push("/courses")}
          variant="outline"
          className="mt-6 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> {t("courseDetail.backToCourses")}
        </Button>
      </div>
    );
  }

  const bullets = parseWhatYouLearn(course.whatYouLearn);
  const reviews: Review[] = course.reviews || [];
  // Teachers, admins and super admins manage courses — they are never shown
  // the student enroll/pay flow.
  const isManager =
    user?.role === "teacher" ||
    user?.role === "admin" ||
    user?.role === "super_admin";
  const enrollment = byCourse.get(course.id);

  // Prerequisite handling — when the course requires another course to be
  // completed first, students who haven't done so cannot enroll. Managers are
  // always exempt (they manage the course). Logged-out visitors are blocked
  // by the normal "create an account" path, so the enroll button stays
  // enabled to send them through registration.
  const prerequisite = course.prerequisiteCourse ?? null;
  const prereqEnrollment = prerequisite
    ? byCourse.get(prerequisite.id)
    : undefined;
  const prereqCompleted = !!prereqEnrollment && prereqEnrollment.status === "completed";
  const prereqBlocksEnroll = !!prerequisite && !isManager && !prereqCompleted;

  const handleEnroll = () => {
    if (!user) {
      openAuthModal("register");
      return;
    }
    if (prereqBlocksEnroll) {
      toast.error(
        t("courseDetail.completePrereqFirst", {
          title: prerequisite?.title ?? "",
        })
      );
      return;
    }
    router.push(`/checkout/${course.id}`);
  };

  return (
    <div className="bg-background">
      {/* ─── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b">
        <div className="hero-mesh absolute inset-0" />
        <div className={`relative mx-auto max-w-7xl py-8 lg:py-10 ${padClass}`}>
          <button
            onClick={() => router.push("/courses")}
            className="mb-6 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("courseDetail.allCourses")}
          </button>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Hero image */}
            <div className="md:col-span-2">
              <div className="relative overflow-hidden rounded-2xl border bg-card shadow-lg">
                {course.image ? (
                  <img loading="lazy" decoding="async"
                    src={course.image}
                    alt={course.title}
                    className="aspect-[16/9] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200">
                    <PlayCircle className="h-16 w-16 text-indigo-400" />
                  </div>
                )}
                {/* LIVE + level badges */}
                <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-red-500/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-white" />
                  {t("courseDetail.live")}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "absolute right-4 top-4 border",
                    levelBadgeClass(course.level)
                  )}
                >
                  {course.level}
                </Badge>
              </div>

              {/* Title + meta */}
              <div className="mt-6">
                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                  {course.title}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Stars rating={course.rating} />
                    <span className="font-semibold text-foreground">
                      {course.rating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      ({course.reviewCount} {t("courseDetail.reviewsCount")})
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    {course.duration} {t("courseDetail.weeks")}
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    {t("courseDetail.added")} {formatDate(course.createdAt)}
                  </span>
                  {/* Share button */}
                  <button
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.share) {
                        navigator.share({
                          title: course.title,
                          url: window.location.href,
                        }).catch(() => undefined);
                      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Course link copied to clipboard!");
                      }
                    }}
                    className="flex items-center gap-1.5 text-indigo-600 transition-colors hover:text-indigo-700"
                  >
                    <Share2 className="h-4 w-4" />
                    {t("courseDetail.share")}
                  </button>
                </div>

                {/* Teacher chip */}
                {course.teacher && (
                  <button
                    onClick={() => router.push("/courses")}
                    className="mt-5 inline-flex items-center gap-3 rounded-xl border bg-card p-2 pr-4 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={course.teacher.profilePicture || undefined} />
                      <AvatarFallback className="bg-indigo-100 text-sm font-bold text-indigo-700">
                        {course.teacher.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">{t("courseDetail.taughtBy")}</p>
                      <p className="text-sm font-bold text-foreground">
                        {course.teacher.fullName}
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Sticky enrollment card */}
            <div className="md:col-span-1">
              <div className="md:sticky md:top-20 space-y-3">
                {prerequisite && !isManager && (
                  <div
                    className={`rounded-xl border p-4 text-sm ${
                      prereqCompleted
                        ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {prereqCompleted ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
                          {t("courseDetail.prerequisite")}
                        </p>
                        <p className="mt-0.5 text-sm font-medium">
                          {prereqCompleted
                            ? t("courseDetail.prereqCompleted")
                            : t("courseDetail.prerequisiteNotice", {
                                title: prerequisite.title,
                              })}
                        </p>
                        <button
                          onClick={() => router.push(`/course/${prerequisite.id}`)}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline"
                        >
                          {prerequisite.title}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {isManager ? (
                  <ManagerCourseCard
                    course={course}
                    role={user?.role}
                    onEdit={() => router.push("/dashboard?section=courses")}
                    onContent={() => router.push("/dashboard?section=content-builder")}
                    onOpen={() => router.push(`/learn/${course.id}`)}
                  />
                ) : enrollment ? (
                  <EnrolledCourseCard
                    course={course}
                    enrollment={enrollment}
                    onContinue={() => router.push(`/learn/${course.id}`)}
                  />
                ) : (
                  <EnrollmentCard
                    course={course}
                    onEnroll={handleEnroll}
                    isLoggedIn={!!user}
                    prereqBlocksEnroll={prereqBlocksEnroll}
                    prerequisiteTitle={prerequisite?.title ?? null}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─────────────────────────────────── */}
      <section className={`mx-auto max-w-7xl py-12 ${padClass}`}>
        <div className="grid gap-10 md:grid-cols-3">
          {/* Left: tabbed course content + teacher + reviews */}
          <div className="space-y-10 md:col-span-2">
            {/* Tabs: Overview / Learning Outcomes / Certification */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted p-1">
                <TabsTrigger
                  value="overview"
                  className="flex flex-col items-center gap-1 py-2 text-xs data-[state=active]:bg-background data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm sm:flex-row sm:gap-2 sm:text-sm"
                >
                  <BookOpen className="h-4 w-4" />
                  {t("course.overview")}
                </TabsTrigger>
                <TabsTrigger
                  value="outcomes"
                  className="flex flex-col items-center gap-1 py-2 text-xs data-[state=active]:bg-background data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm sm:flex-row sm:gap-2 sm:text-sm"
                >
                  <ListChecks className="h-4 w-4" />
                  {t("courseDetail.outcomes")}
                </TabsTrigger>
                <TabsTrigger
                  value="certification"
                  className="flex flex-col items-center gap-1 py-2 text-xs data-[state=active]:bg-background data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm sm:flex-row sm:gap-2 sm:text-sm"
                >
                  <Award className="h-4 w-4" />
                  {t("course.certification")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <CourseOverviewTab course={course} bullets={bullets} />
              </TabsContent>
              <TabsContent value="outcomes" className="mt-6">
                <LearningOutcomesTab course={course} bullets={bullets} />
              </TabsContent>
              <TabsContent value="certification" className="mt-6">
                <CertificationTab course={course} />
              </TabsContent>
            </Tabs>

            {/* Teacher bio */}
            {course.teacher && (
              <>
                <Separator />
                <div>
                  <h2 className="mb-4 text-xl font-bold text-foreground">
                    {t("course.meetTeacher")}
                  </h2>
                  <Card className="card-lift flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
                    <Avatar className="h-16 w-16 shrink-0 border">
                      <AvatarImage src={course.teacher.profilePicture || undefined} />
                      <AvatarFallback className="bg-indigo-100 text-lg font-bold text-indigo-700">
                        {course.teacher.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-foreground">
                          {course.teacher.fullName}
                        </h3>
                        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
                          {t("courseDetail.englishTeacher")}
                        </Badge>
                      </div>
                      {course.teacher.bio && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {course.teacher.bio}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-1.5"
                        onClick={() => {
                          if (course.teacher?.id) {
                            router.push(`/messages?u=${encodeURIComponent(course.teacher.id)}`);
                          } else {
                            router.push("/courses");
                          }
                        }}
                      >
                        <Mail className="h-3.5 w-3.5" /> {t("courseDetail.contactTeacher")}
                      </Button>
                    </div>
                  </Card>
                </div>
              </>
            )}

            <Separator />

            {/* Reviews */}
            <ReviewsSection
              courseId={course.id}
              reviews={reviews}
              rating={course.rating}
              reviewCount={course.reviewCount}
              ratingBreakdown={ratingBreakdown}
              isLoggedIn={!!user}
              onReviewAdded={loadCourse}
            />

            <Separator />

            {/* Announcements — collapsible, closed by default for visitors */}
            <AnnouncementsPanel
              courseId={course.id}
              canManage={isManager}
              defaultOpen={false}
            />

            <Separator />

            {/* Discussion / Q&A — open for everyone with course visibility */}
            <DiscussionPanel
              courseId={course.id}
              canManage={isManager}
              defaultOpen={false}
            />
          </div>

          {/* Right: secondary info card (mobile-friendly spacer) */}
          <div className="md:col-span-1">
            <Card className="card-lift p-6">
              <div className="mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-foreground">
                  {t("courseDetail.whyStudentsLove")}
                </h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {[
                  { icon: Video, label: t("courseDetail.liveVideoEveryWeek") },
                  { icon: Users, label: t("courseDetail.smallGroupMax") },
                  { icon: MessageSquare, label: t("courseDetail.realTimeChatTeacher") },
                  { icon: Award, label: t("courseDetail.certificateOnCompletion") },
                  { icon: ShieldCheck, label: t("courseDetail.moneyBack7") },
                ].map(({ icon: Icon, label }, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="pt-1 text-foreground">{label}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Teacher / admin controls (never shown to students) ── */

function ManagerCourseCard({
  course,
  role,
  onEdit,
  onContent,
  onOpen,
}: {
  course: Course;
  role?: string;
  onEdit: () => void;
  onContent: () => void;
  onOpen: () => void;
}) {
  const t = useT();
  const isAdmin = role === "admin" || role === "super_admin";
  return (
    <Card className="card-lift overflow-hidden p-0 shadow-xl">
      <div className="bg-gradient-to-br from-fuchsia-600 to-indigo-800 p-6 text-white">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-100">
          <LayoutDashboard className="h-4 w-4" /> {isAdmin ? t("courseDetail.managerAccess") : t("courseDetail.teacherControls")}
        </div>
        <p className="mt-2 text-lg font-extrabold leading-tight">
          {isAdmin ? t("courseDetail.openDirectly") : t("courseDetail.youManage")}
        </p>
        <p className="mt-1 text-xs text-indigo-100">
          {isAdmin ? t("courseDetail.adminCanEdit") : t("courseDetail.teacherCanEdit")}
        </p>
      </div>

      <div className="space-y-2.5 p-6">
        <Button onClick={onOpen} size="lg" className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
          <BookOpen className="h-4 w-4" /> {t("courseDetail.openCourse")}
        </Button>
        <Button onClick={onContent} size="lg" variant="outline" className="w-full gap-2">
          <Hammer className="h-4 w-4" /> {t("courseDetail.manageLessons")}
        </Button>
        <Button onClick={onEdit} size="lg" variant="ghost" className="w-full gap-2">
          <Pencil className="h-4 w-4" /> {t("courseDetail.editCourse")}
        </Button>
        <p className="pt-1 text-center text-xs text-muted-foreground">
          {course.title}
        </p>
      </div>
    </Card>
  );
}

/* ─── Enrolled student card ─────────────────────────────── */

function EnrolledCourseCard({
  course,
  enrollment,
  onContinue,
}: {
  course: Course;
  enrollment: Enrollment;
  onContinue: () => void;
}) {
  const t = useT();
  const complete = enrollment.status === "completed" || enrollment.progress >= 100;

  return (
    <Card className="card-lift overflow-hidden p-0 shadow-xl">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-100">
          <CheckCircle2 className="h-4 w-4" />
          {complete ? t("courseDetail.courseComplete") : t("courseDetail.youreEnrolled")}
        </div>
        <p className="mt-2 text-lg font-extrabold leading-tight">
          {complete ? t("courseDetail.reviewAnytime") : t("courseDetail.pickUpLeft")}
        </p>
        <p className="mt-1 text-xs text-indigo-100">
          {t("courseDetail.lessonsReady")}
        </p>
      </div>

      <div className="p-6">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="font-medium text-muted-foreground">{t("courseDetail.courseProgress")}</span>
          <span className="font-bold text-foreground">{enrollment.progress}%</span>
        </div>
        <Progress value={enrollment.progress} className="h-2" />
        <Button
          onClick={onContinue}
          size="lg"
          className="mt-5 w-full gap-2 bg-indigo-600 shadow-lg shadow-indigo-500/30 hover:bg-indigo-700"
        >
          <BookOpen className="h-4 w-4" />
          {complete ? t("courseDetail.openCourse") : t("courseDetail.continueLearning")}
        </Button>
        <p className="pt-3 text-center text-xs text-muted-foreground">{course.title}</p>
      </div>
    </Card>
  );
}

/* ─── Enrollment card ───────────────────────────────────── */

function EnrollmentCard({
  course,
  onEnroll,
  isLoggedIn,
  prereqBlocksEnroll,
  prerequisiteTitle,
}: {
  course: Course;
  onEnroll: () => void;
  isLoggedIn: boolean;
  prereqBlocksEnroll: boolean;
  prerequisiteTitle: string | null;
}) {
  const t = useT();
  const enrollLabel = prereqBlocksEnroll && prerequisiteTitle
    ? t("courseDetail.completePrereqFirst", { title: prerequisiteTitle })
    : course.price === 0
      ? t("course.startNow")
      : t("course.enrollNow");
  return (
    <Card className="card-lift overflow-hidden p-0 shadow-xl">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white">
        <p className="text-sm font-semibold text-indigo-100">
          {course.duration}-{t("courseDetail.weekLiveCourse")}
        </p>
        <p className="mt-1 text-xs text-indigo-200">
          Full price and payment options are shown at checkout.
        </p>
      </div>

      <div className="p-6">
        <Button
          onClick={onEnroll}
          size="lg"
          disabled={prereqBlocksEnroll}
          className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {prereqBlocksEnroll ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {enrollLabel}
        </Button>

        {prereqBlocksEnroll && (
          <p className="mt-2 text-center text-xs text-amber-700">
            {t("courseDetail.prerequisiteRequired")}
          </p>
        )}

        {!isLoggedIn && !prereqBlocksEnroll && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            You&apos;ll need to create an account to enroll.
          </p>
        )}

        <Separator className="my-4" />

        {/* What's included */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("course.includes")}
          </p>
          {[
            { icon: Video, label: `${course.duration * 4}+ live class hours` },
            { icon: MessageSquare, label: "Real-time chat support" },
            { icon: Award, label: "Certificate of completion" },
            { icon: Users, label: "Access to student community" },
          ].map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              <Icon className="h-4 w-4 shrink-0 text-indigo-500" />
              <span className="text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ─── Reviews section + add-review form ──────────────────── */

function ReviewsSection({
  courseId,
  reviews,
  rating,
  reviewCount,
  ratingBreakdown,
  isLoggedIn,
  onReviewAdded,
}: {
  courseId: string;
  reviews: Review[];
  rating: number;
  reviewCount: number;
  ratingBreakdown: RatingBreakdown;
  isLoggedIn: boolean;
  onReviewAdded: () => void;
}) {
  const t = useT();
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formComment.trim()) {
      toast.error("Please write a short comment for your review.");
      return;
    }
    setSubmitting(true);
    try {
      await api.addReview(courseId, {
        rating: formRating,
        comment: formComment.trim(),
      });
      toast.success("Review submitted. Thank you for your feedback!");
      setFormComment("");
      setFormRating(5);
      setShowForm(false);
      onReviewAdded();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to submit review";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("course.reviews")}</h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Stars rating={rating} />
            <span className="font-semibold text-foreground">
              {rating.toFixed(1)}
            </span>
            <span>·</span>
            <span>{reviewCount} reviews</span>
          </div>
        </div>

        {isLoggedIn && (
          <Button
            variant={showForm ? "outline" : "default"}
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            className="gap-1.5"
          >
            <MessageSquare className="h-4 w-4" />
            {showForm ? t("common.cancel") : t("courseDetail.writeReview")}
          </Button>
        )}
      </div>

      {/* Rating breakdown histogram */}
      <RatingBreakdownHistogram
        rating={rating}
        reviewCount={reviewCount}
        breakdown={ratingBreakdown}
      />

      {/* Add review form */}
      {isLoggedIn && showForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                {t("courseDetail.yourRating")}
              </label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => {
                  const val = i + 1;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormRating(val)}
                      aria-label={`Rate ${val} star${val > 1 ? "s" : ""}`}
                      className="rounded-md p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          "h-7 w-7 transition-colors",
                          val <= formRating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-muted text-muted-foreground/40"
                        )}
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-sm font-semibold text-foreground">
                  {formRating}/5
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                {t("courseDetail.yourReview")}
              </label>
              <Textarea
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                placeholder="Share your experience with this course..."
                rows={4}
                maxLength={500}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {formComment.length}/500
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t("courseDetail.submitReview")}
            </Button>
          </form>
        </Card>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-foreground">{t("courseDetail.noReviews")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("courseDetail.beFirstReview")}
          </p>
        </div>
      ) : (
        <div className="max-h-[640px] overflow-y-auto pr-1 custom-scroll">
          <div className="space-y-4">
            {reviews.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const t = useT();
  const name = review.student?.fullName || "Anonymous student";
  const avatar = review.student?.profilePicture || null;
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar || undefined} />
          <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">
                {timeAgo(review.createdAt)}
              </p>
            </div>
            <Stars rating={review.rating} size="h-3.5 w-3.5" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {review.comment}
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ─── Tab content: Course Overview ─────────────────────────── */

function CourseOverviewTab({
  course,
  bullets,
}: {
  course: Course;
  bullets: string[];
}) {
  const t = useT();
  const highlights = [
    {
      icon: Video,
      title: t("courseDetail.liveInteractiveSessions"),
      desc: t("courseDetail.realTimeClasses"),
    },
    {
      icon: Users,
      title: t("courseDetail.expertTeacherFeedback"),
      desc: t("courseDetail.personalisedCorrections"),
    },
    {
      icon: MessageSquare,
      title: t("courseDetail.realConversationPractice"),
      desc: t("courseDetail.speakConfidence"),
    },
    {
      icon: Award,
      title: t("courseDetail.certificateOnCompletion"),
      desc: t("courseDetail.verifiableProof"),
    },
  ];

  const audience = deriveAudience(course);

  return (
    <div className="space-y-8 rounded-xl border bg-card p-4 sm:p-6">
      {/* Intro paragraph */}
      <div>
        <h2 className="mb-3 text-xl font-bold text-foreground sm:text-2xl">
          {t("course.aboutCourse")}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {course.description}
        </p>
      </div>

      {/* Key highlights */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
          <Sparkles className="h-5 w-5 text-amber-500" /> {t("courseDetail.keyHighlights")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map(({ icon: Icon, title, desc }, i) => (
            <Card key={i} className="card-lift gap-0 p-4">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold text-foreground">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* What's covered */}
      {bullets.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
            <BookOpen className="h-5 w-5 text-indigo-500" /> {t('courseDetail.whatsCovered')}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {bullets.map((b, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-lg border bg-card p-3"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Who this course is for */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
          <Target className="h-5 w-5 text-amber-500" /> {t("courseDetail.whoFor")}
        </h3>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {audience.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
              <span className="text-sm text-muted-foreground">{a}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Tab content: Learning Outcomes ──────────────────────── */

function LearningOutcomesTab({
  course,
  bullets,
}: {
  course: Course;
  bullets: string[];
}) {
  const t = useT();
  const skills = deriveSkills(course);

  return (
    <div className="space-y-8 rounded-xl border bg-card p-4 sm:p-6">
      <div>
        <h2 className="mb-3 text-xl font-bold text-foreground sm:text-2xl">
          {t("courseDetail.learningOutcomesTitle")}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("courseDetail.byEndOfCourse")}
        </p>
      </div>

      {/* Outcomes checklist grid */}
      {bullets.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {bullets.map((b, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-lg border bg-card p-3"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
              <span className="text-sm font-medium text-foreground">{b}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {t("courseDetail.outcomesSoon")}
        </p>
      )}

      {/* Skills you'll develop */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
          <Sparkles className="h-5 w-5 text-amber-500" /> {t('courseDetail.skillsDevelop')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {skills.map((s, i) => (
            <Badge
              key={i}
              variant="outline"
              className="border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Tab content: Certification ───────────────────────────── */

function CertificationTab({ course }: { course: Course }) {
  const t = useT();
  const includes = [
    t("courseDetail.yourFullName"),
    t("courseDetail.courseTitle"),
    t("courseDetail.completionDate"),
    t("courseDetail.uniqueId"),
    t("courseDetail.sheegowSeal"),
  ];

  const steps = [
    {
      title: t("courseDetail.stepEnroll"),
      desc: t("courseDetail.stepEnrollDesc"),
    },
    {
      title: t("courseDetail.stepAttend"),
      desc: t("courseDetail.stepAttendDesc"),
    },
    {
      title: t("courseDetail.stepComplete"),
      desc: t("courseDetail.stepCompleteDesc"),
    },
  ];

  return (
    <div className="space-y-8 rounded-xl border bg-card p-4 sm:p-6">
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-foreground sm:text-2xl">
          <GraduationCap className="h-6 w-6 text-indigo-600" />
          {t("courseDetail.earnCertificate")}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Upon completing this course (attending live classes + finishing
          assignments), you&apos;ll receive a verified SHEEGOW ACADEMY
          certificate of completion. Share it on LinkedIn, add it to your CV,
          or print it.
        </p>
      </div>

      {/* Sample certificate */}
      <SampleCertificate courseTitle={course.title} />

      {/* What's included + How to earn it */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
            <Award className="h-5 w-5 text-amber-500" /> {t('courseDetail.whatsIncluded')}
          </h3>
          <ul className="space-y-2">
            {includes.map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500" />
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
            <ListChecks className="h-5 w-5 text-indigo-500" /> {t("courseDetail.howToEarn")}
          </h3>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
