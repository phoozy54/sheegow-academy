"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { useDevice } from "@/lib/device";
import { api, ApiError } from "@/lib/api";
import type { Course, Enrollment, Review } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMyEnrollments } from "@/lib/use-my-enrollments";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import {
  levelBadgeClass,
  formatPrice,
  formatDate,
  timeAgo,
  cn,
} from "@/lib/ui";
import { toast } from "sonner";

/* ─── Helpers ───────────────────────────────────────────── */

// Parse the newline-separated `whatYouLearn` field into clean bullet points
function parseWhatYouLearn(input?: string | null): string[] {
  if (!input) return [];
  return input
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
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

/* ─── Main view ─────────────────────────────────────────── */

export function CourseDetailView() {
  const courseId = useStore((s) => s.selectedCourseId);
  const navigate = useStore((s) => s.navigate);
  const openCheckout = useStore((s) => s.openCheckout);
  const openAuthModal = useStore((s) => s.openAuthModal);
  const openDashboard = useStore((s) => s.openDashboard);
  const openPlayer = useStore((s) => s.openPlayer);
  const user = useStore((s) => s.user);
  const { isMobile, isTablet } = useDevice();
  const padClass = isMobile
    ? "px-3"
    : isTablet
      ? "px-5"
      : "px-4 sm:px-6 lg:px-8";

  const [course, setCourse] = useState<Course | null>(null);
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
        <h2 className="text-2xl font-bold text-foreground">Course not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error || "The course you're looking for may have been removed."}
        </p>
        <Button
          onClick={() => navigate("courses")}
          variant="outline"
          className="mt-6 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Courses
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

  const handleEnroll = () => {
    if (!user) {
      openAuthModal("register");
      return;
    }
    openCheckout(course.id);
  };

  return (
    <div className="bg-background">
      {/* ─── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b">
        <div className="hero-mesh absolute inset-0" />
        <div className={`relative mx-auto max-w-7xl py-8 lg:py-10 ${padClass}`}>
          <button
            onClick={() => navigate("courses")}
            className="mb-6 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All Courses
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
                  LIVE
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
                      ({course.reviewCount} reviews)
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    {course.duration} weeks
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    Added {formatDate(course.createdAt)}
                  </span>
                </div>

                {/* Teacher chip */}
                {course.teacher && (
                  <button
                    onClick={() => navigate("courses")}
                    className="mt-5 inline-flex items-center gap-3 rounded-xl border bg-card p-2 pr-4 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={course.teacher.profilePicture || undefined} />
                      <AvatarFallback className="bg-indigo-100 text-sm font-bold text-indigo-700">
                        {course.teacher.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">Taught by</p>
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
              <div className="md:sticky md:top-20">
                {isManager ? (
                  <TeacherCourseCard
                    course={course}
                    onEdit={() => openDashboard("courses")}
                    onContent={() => openDashboard("content-builder")}
                    onOpen={() => openPlayer(course.id)}
                  />
                ) : enrollment ? (
                  <EnrolledCourseCard
                    course={course}
                    enrollment={enrollment}
                    onContinue={() => openPlayer(course.id)}
                  />
                ) : (
                  <EnrollmentCard
                    course={course}
                    onEnroll={handleEnroll}
                    isLoggedIn={!!user}
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
          {/* Left: description + what you'll learn + reviews */}
          <div className="space-y-10 md:col-span-2">
            {/* Description */}
            <div>
              <h2 className="mb-3 text-xl font-bold text-foreground">
                About this course
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {course.description}
              </p>
            </div>

            <Separator />

            {/* What you'll learn */}
            {bullets.length > 0 && (
              <div>
                <h2 className="mb-4 text-xl font-bold text-foreground">
                  What you&apos;ll learn
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {bullets.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg border bg-card p-3"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      <span className="text-sm font-medium text-foreground">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teacher bio */}
            {course.teacher && (
              <>
                <Separator />
                <div>
                  <h2 className="mb-4 text-xl font-bold text-foreground">
                    Meet your teacher
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
                          English Teacher
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
                        onClick={() => navigate("courses")}
                      >
                        <Mail className="h-3.5 w-3.5" /> Contact teacher
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
              isLoggedIn={!!user}
              onReviewAdded={loadCourse}
            />
          </div>

          {/* Right: secondary info card (mobile-friendly spacer) */}
          <div className="md:col-span-1">
            <Card className="card-lift p-6">
              <div className="mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-foreground">
                  Why students love this course
                </h3>
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {[
                  { icon: Video, label: "Live video classes every week" },
                  { icon: Users, label: "Small group — max 15 students" },
                  { icon: MessageSquare, label: "Real-time chat with the teacher" },
                  { icon: Award, label: "Certificate on completion" },
                  { icon: ShieldCheck, label: "Money-back guarantee in 7 days" },
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

function TeacherCourseCard({
  course,
  onEdit,
  onContent,
  onOpen,
}: {
  course: Course;
  onEdit: () => void;
  onContent: () => void;
  onOpen: () => void;
}) {
  return (
    <Card className="card-lift overflow-hidden p-0 shadow-xl">
      <div className="bg-gradient-to-br from-fuchsia-600 to-indigo-800 p-6 text-white">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-100">
          <LayoutDashboard className="h-4 w-4" /> Teacher controls
        </div>
        <p className="mt-2 text-lg font-extrabold leading-tight">
          You manage this course
        </p>
        <p className="mt-1 text-xs text-indigo-100">
          Edit details, build lessons and deliver live classes — no enrollment
          needed.
        </p>
      </div>

      <div className="space-y-2.5 p-6">
        <Button onClick={onEdit} size="lg" className="w-full gap-2">
          <Pencil className="h-4 w-4" /> Edit course
        </Button>
        <Button onClick={onContent} size="lg" variant="outline" className="w-full gap-2">
          <Hammer className="h-4 w-4" /> Add lessons &amp; quizzes
        </Button>
        <Button onClick={onOpen} size="lg" variant="ghost" className="w-full gap-2">
          <BookOpen className="h-4 w-4" /> Open course player
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
  const complete = enrollment.status === "completed" || enrollment.progress >= 100;

  return (
    <Card className="card-lift overflow-hidden p-0 shadow-xl">
      <div className="bg-gradient-to-br from-emerald-600 to-indigo-800 p-6 text-white">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          {complete ? "Course complete" : "You're enrolled"}
        </div>
        <p className="mt-2 text-lg font-extrabold leading-tight">
          {complete ? "Review your course anytime" : "Pick up where you left off"}
        </p>
        <p className="mt-1 text-xs text-emerald-100">
          Your lessons, tests and homework are ready.
        </p>
      </div>

      <div className="p-6">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="font-medium text-muted-foreground">Course progress</span>
          <span className="font-bold text-foreground">{enrollment.progress}%</span>
        </div>
        <Progress value={enrollment.progress} className="h-2" />
        <Button
          onClick={onContinue}
          size="lg"
          className="mt-5 w-full gap-2 bg-indigo-600 shadow-lg shadow-indigo-500/30 hover:bg-indigo-700"
        >
          <BookOpen className="h-4 w-4" />
          {complete ? "Open course" : "Continue learning"}
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
}: {
  course: Course;
  onEnroll: () => void;
  isLoggedIn: boolean;
}) {
  return (
    <Card className="card-lift overflow-hidden p-0 shadow-xl">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold">
            {formatPrice(course.price)}
          </span>
          <span className="text-sm text-indigo-200">
            / {course.duration} weeks
          </span>
        </div>
        <p className="mt-1 text-xs text-indigo-200">
          One-time payment. Lifetime access.
        </p>
      </div>

      <div className="p-6">
        <Button
          onClick={onEnroll}
          size="lg"
          className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700"
        >
          <Sparkles className="h-4 w-4" />
          {course.price === 0 ? "Start Now" : "Enroll Now"}
        </Button>

        {!isLoggedIn && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            You&apos;ll need to create an account to enroll.
          </p>
        )}

        <Separator className="my-4" />

        {/* What's included */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            This course includes
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
  isLoggedIn,
  onReviewAdded,
}: {
  courseId: string;
  reviews: Review[];
  rating: number;
  reviewCount: number;
  isLoggedIn: boolean;
  onReviewAdded: () => void;
}) {
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
          <h2 className="text-xl font-bold text-foreground">Student reviews</h2>
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
            {showForm ? "Cancel" : "Write a review"}
          </Button>
        )}
      </div>

      {/* Add review form */}
      {isLoggedIn && showForm && (
        <Card className="mb-6 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Your rating
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
                Your review
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
              Submit review
            </Button>
          </form>
        </Card>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-foreground">No reviews yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Be the first to share your experience with this course.
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
