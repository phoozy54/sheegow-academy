"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useDevice } from "@/lib/device";
import { api } from "@/lib/api";
import type { Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CourseCard } from "../course-card";
import { useMyEnrollments } from "@/lib/use-my-enrollments";
import { trackConversion, type ConversionEvent } from "@/lib/analytics";
import {
  Video,
  Users,
  GraduationCap,
  MessageSquare,
  Award,
  Globe2,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: Video,
    title: "LIVE Video Classes",
    desc: "Real-time interactive English classes — no recorded videos. Speak with teachers and classmates every session.",
    color: "from-rose-500 to-pink-600",
  },
  {
    icon: Users,
    title: "Small Group Learning",
    desc: "Learn in small batches so every student gets personal attention and speaking practice.",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    icon: GraduationCap,
    title: "Expert Teacher",
    desc: "Learn with Ciise Mohamed Sheeq (SHEEGOW) — English expert with a university degree and 15 years of teaching experience.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: MessageSquare,
    title: "Real-time Chat",
    desc: "Ask questions instantly during class with live chat support alongside your video lesson.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Award,
    title: "Certificates & Progress",
    desc: "Track your progress and earn a certificate when you complete each course.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Globe2,
    title: "Learn From Anywhere",
    desc: "Join from anywhere in the world. Payment details are shown clearly at checkout.",
    color: "from-sky-500 to-blue-600",
  },
];

export function HomeView() {
  const { navigate, openAuthModal, openPlayer, user } = useStore();
  const { enrollments, byCourse, loading: loadingEnrollments } = useMyEnrollments();
  const { isMobile, isTablet } = useDevice();
  const padClass = isMobile
    ? "px-3"
    : isTablet
      ? "px-5"
      : "px-4 sm:px-6 lg:px-8";
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .courses({ limit: 3 })
      .then((r) => setCourses(r.items))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* ─── HERO ──────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="hero-mesh absolute inset-0" />
        <div className={`relative mx-auto max-w-7xl pb-16 pt-12 sm:pt-16 lg:pb-24 lg:pt-20 ${padClass}`}>
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="text-center md:text-left lg:text-left">
              <Badge
                variant="outline"
                className="mb-5 inline-flex items-center gap-1.5 rounded-full border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
              >
                <Video className="h-3 w-3" />
                Live English classes with expert teachers
              </Badge>

              <h1 className="mb-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Speak English with confidence in{" "}
                <span className="gradient-text">live classes</span>
              </h1>

              <p className="mx-auto mb-7 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
                Talk to a real teacher from your first lesson. Small,
                conversation-first classes help you speak clearly at work, in
                exams and in everyday life — with feedback you can act on.
              </p>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-base shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700 sm:w-auto"
                >
                  <Link
                    href="/courses"
                    onClick={() => trackConversion("hero_explore_courses")}
                  >
                    Explore live courses
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
                  <Link
                    href="#how-it-works"
                    onClick={() => trackConversion("hero_how_it_works")}
                  >
                    See how it works
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start">
                {[
                  "Real human teacher",
                  "Speak from lesson one",
                  "Clear prices, secure checkout",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero image card */}
            <div className="relative">
              <div className="absolute -inset-4 animate-float-slow rounded-[2rem] bg-gradient-to-tr from-indigo-300/40 via-amber-200/30 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-indigo-500/20">
                <img
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  src="/images/hero.webp"
                  alt="Live English class in progress"
                  width={1344}
                  height={1008}
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                      <span className="h-3 w-3 animate-live-pulse rounded-full bg-red-500" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        English Conversation
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Live with SHEEGOW
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-indigo-600">
                    <Users className="h-4 w-4" /> Small group
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ─── CONTINUE LEARNING ─────────────────────── */}
      {!loadingEnrollments && enrollments.length > 0 && (
        <section className={`mx-auto max-w-7xl pt-12 ${padClass}`}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <Badge
                variant="outline"
                className="mb-3 inline-flex items-center gap-1.5 border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
              >
                <BookOpen className="h-3 w-3" /> Continue learning
              </Badge>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                Pick up where you left off
              </h2>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate("dashboard")}
              className="gap-1.5"
            >
              My dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {enrollments.slice(0, 3).map((enrollment) => (
              <Card key={enrollment.id} className="card-lift flex flex-col p-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-500">
                  {enrollment.course?.level || "Your course"}
                </p>
                <h3 className="mt-1 line-clamp-2 text-base font-bold text-foreground">
                  {enrollment.course?.title || "Course"}
                </h3>
                <div className="mb-1.5 mt-4 flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="font-bold text-foreground">{enrollment.progress}%</span>
                </div>
                <Progress value={enrollment.progress} className="h-1.5" />
                <Button
                  className="mt-4 w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => openPlayer(enrollment.courseId)}
                >
                  Continue lesson <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ─── FEATURES ──────────────────────────────── */}
      <section className={`mx-auto max-w-7xl py-16 lg:py-24 ${padClass}`}>
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-3 inline-flex items-center gap-1.5 border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
          >
            <Sparkles className="h-3 w-3" /> Why SHEEGOW
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Built for speaking, not just watching
          </h2>
          <p className="mt-3 text-muted-foreground">
            One proven format: a real teacher, a small group and a reason to
            speak in every lesson.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className="card-lift group relative overflow-hidden p-6"
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-white shadow-lg`}
              >
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── POPULAR COURSES ──────────────────────── */}
      <section className="bg-gradient-to-b from-indigo-50/50 to-background py-16 lg:py-24">
        <div className={`mx-auto max-w-7xl ${padClass}`}>
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <Badge
                variant="outline"
                className="mb-3 inline-flex items-center gap-1.5 border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
              >
                <GraduationCap className="h-3 w-3" /> Popular Courses
              </Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Live courses students love
              </h2>
            </div>
            <Button asChild variant="outline" className="gap-1.5">
              <Link href="/courses">
                View all courses
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden p-0">
                    <div className="aspect-[16/9] animate-pulse bg-muted" />
                    <div className="space-y-3 p-4">
                      <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                      <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      <div className="h-9 w-full animate-pulse rounded bg-muted" />
                    </div>
                  </Card>
                ))
              : courses.map((c) => (
                  <CourseCard key={c.id} course={c} enrollment={byCourse.get(c.id)} all={courses} />
                ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────── */}
      <section id="how-it-works" className={`mx-auto max-w-7xl py-16 lg:py-24 ${padClass}`}>
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-3 inline-flex items-center gap-1.5 border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
          >
            <CheckCircle2 className="h-3 w-3" /> How it works
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Three steps to confident English
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every class is live with your teacher — no recorded videos.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              n: "1",
              title: "Choose your course",
              desc: "Pick the level that fits you — beginner, intermediate, IELTS, business or kids.",
            },
            {
              n: "2",
              title: "Join the live class",
              desc: "See your teacher, speak, use chat and raise your hand — all in real time.",
            },
            {
              n: "3",
              title: "Earn your certificate",
              desc: "Complete the lessons and quizzes to receive a verification certificate.",
            },
          ].map((step) => (
            <Card key={step.n} className="card-lift flex flex-col p-6">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-lg font-extrabold text-white shadow-lg shadow-indigo-500/30">
                {step.n}
              </span>
              <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {step.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── LIVE vs RECORDED ────────────────────── */}
      <section className="bg-muted/30 py-16 lg:py-24">
        <div className={`mx-auto max-w-7xl ${padClass}`}>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge
              variant="outline"
              className="mb-3 inline-flex items-center gap-1.5 border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
            >
              <Video className="h-3 w-3" /> The difference is real
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Live classes vs. recorded drills
            </h2>
            <p className="mt-3 text-muted-foreground">
              Apps can build habits. Speaking with a teacher builds confidence.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Card className="border-indigo-200 bg-card p-6 shadow-lg shadow-indigo-500/10">
              <h3 className="text-lg font-bold text-indigo-600">
                Live with SHEEGOW
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {[
                  "A teacher hears you and corrects you in the moment",
                  "You speak in every lesson, not after finishing a module",
                  "Questions get answers during the class",
                  "Progress is marked by real lessons and a certificate",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="text-lg font-bold text-foreground">
                Self-paced apps and recordings
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {[
                  "Practice is mostly reading, tapping or repeating alone",
                  "No one listens to your pronunciation in real time",
                  "Mistakes can stay uncorrected for weeks",
                  "Finishing videos is not the same as speaking well",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-muted-foreground">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── PATHWAYS ─────────────────────────────── */}
      <section className={`mx-auto max-w-7xl py-16 lg:py-24 ${padClass}`}>
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-3 inline-flex items-center gap-1.5 border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700"
          >
            <Sparkles className="h-3 w-3" /> Choose your path
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            There is a live class for your goal
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start with a course, ask about a trial, or explore how we work with
            partners.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {([
            {
              title: "Learners",
              desc: "Beginner to advanced live English courses.",
              cta: "Explore live courses",
              href: "/courses",
              event: "pathway_courses",
            },
            {
              title: "Parents",
              desc: "Playful live classes for children aged 7–12.",
              cta: "See English for kids",
              href: "/courses/english-for-kids-ages-7-12",
              event: "pathway_kids",
            },
            {
              title: "Professionals",
              desc: "Meetings, email, interviews and presentations at work.",
              cta: "See business English",
              href: "/courses/business-english-professional",
              event: "pathway_business",
            },
            {
              title: "Partners & investors",
              desc: "Our mission, impact model and governance.",
              cta: "Read our impact model",
              href: "/investors",
              event: "pathway_investors",
            },
          ] as Array<{
            title: string;
            desc: string;
            cta: string;
            href: string;
            event: ConversionEvent;
          }>).map((path) => (
            <Card key={path.title} className="card-lift flex flex-col p-6">
              <h3 className="text-lg font-bold text-foreground">{path.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">
                {path.desc}
              </p>
              <Link
                href={path.href}
                onClick={() => trackConversion(path.event)}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                {path.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Card>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Want to try a class first? A free trial is available with administrator
          approval.{" "}
          <Link
            href="/contact"
            onClick={() => trackConversion("trial_enquiry")}
            className="font-semibold text-indigo-600 underline"
          >
            Ask us about a free trial
          </Link>
          .
        </p>
      </section>

      {/* ─── CTA ─────────────────────────────────── */}
      <section className={`pb-16 lg:pb-24 ${padClass}`}>
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-8 text-center shadow-2xl shadow-indigo-500/30 sm:p-12 lg:p-16">
          <div className="hero-mesh absolute inset-0 opacity-40" />
          <div className="relative">
            <Badge
              variant="outline"
              className="mb-4 inline-flex items-center gap-1.5 border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur"
            >
              <Sparkles className="h-3 w-3" /> Live classes
            </Badge>
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to start speaking English with confidence?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-indigo-100">
              Join SHEEGOW ACADEMY today and start speaking English with
              expert teachers in live, interactive classes.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {user ? (
                <Button
                  asChild
                  size="lg"
                  className="w-full gap-2 bg-white text-indigo-700 shadow-lg hover:bg-indigo-50 sm:w-auto"
                >
                  <Link href="/courses">
                    Browse Courses
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => openAuthModal("register")}
                  className="w-full gap-2 bg-white text-indigo-700 shadow-lg hover:bg-indigo-50 sm:w-auto"
                >
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
              >
                <Link href="/about">
                  About SHEEGOW ACADEMY
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
