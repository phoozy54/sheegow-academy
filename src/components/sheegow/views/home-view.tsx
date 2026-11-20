"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useDevice } from "@/lib/device";
import { api } from "@/lib/api";
import type { Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseCard } from "../course-card";
import {
  Video,
  Users,
  GraduationCap,
  MessageSquare,
  Award,
  Globe2,
  ArrowRight,
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
    desc: "Learn with Ciise Mohamed Sheeq (SHEEGOW) — London-educated English expert with 15 years of teaching experience.",
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
    desc: "Join from Somaliland or anywhere in the diaspora. Pay easily with Card, Zaad Service or Edahab.",
    color: "from-sky-500 to-blue-600",
  },
];

export function HomeView() {
  const { navigate, openAuthModal, user } = useStore();
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
                Learn English with{" "}
                <span className="gradient-text">LIVE Classes</span> — built for
                Somali students
              </h1>

              <p className="mx-auto mb-7 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
                SHEEGOW ACADEMY teaches English through real-time interactive
                video classes. Speak with expert teachers, practice with
                classmates, and gain confidence — no recorded videos, ever.
              </p>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={() => navigate("courses")}
                  className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-base shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700 sm:w-auto"
                >
                  Start Learning
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start">
                {[
                  "Expert live teachers",
                  "Zaad Service & Edahab",
                  "Certificates included",
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
                <img loading="lazy" decoding="async"
                  src="/images/hero.png"
                  alt="Live English class in progress"
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
                    <Users className="h-4 w-4" /> 28
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

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
            Everything you need to master English
          </h2>
          <p className="mt-3 text-muted-foreground">
            Our platform is designed around live, interactive learning — because
            English is meant to be spoken, not just watched.
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
            <Button
              variant="outline"
              onClick={() => navigate("courses")}
              className="gap-1.5"
            >
              View all courses
              <ArrowRight className="h-4 w-4" />
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
              : courses.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────── */}
      <section className={`mx-auto max-w-7xl py-16 lg:py-24 ${padClass}`}>
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
              <Button
                size="lg"
                onClick={() =>
                  user ? navigate("courses") : openAuthModal("register")
                }
                className="w-full gap-2 bg-white text-indigo-700 shadow-lg hover:bg-indigo-50 sm:w-auto"
              >
                {user ? "Browse Courses" : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("about")}
                className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
