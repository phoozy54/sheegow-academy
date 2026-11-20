"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import type { Course } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CourseCard } from "../course-card";
import {
  PlayCircle,
  Video,
  Users,
  GraduationCap,
  MessageSquare,
  Award,
  Globe2,
  Star,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Quote,
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
    title: "Expert Teachers",
    desc: "TESOL-certified instructors who specialize in teaching English to Somali speakers.",
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
    desc: "Join from Somaliland or anywhere in the diaspora. Pay easily with EVC Plus or Zaad.",
    color: "from-sky-500 to-blue-600",
  },
];

const TESTIMONIALS = [
  {
    name: "Hodan Abdi",
    role: "Student, Hargeisa",
    rating: 5,
    text: "I joined SHEEGOW ACADEMY with zero English. After 8 weeks of live classes, I can have full conversations. The teachers are so patient and the live classes make it real.",
    avatar: null,
  },
  {
    name: "Mahamed Yusuf",
    role: "University Applicant",
    rating: 5,
    text: "The IELTS course helped me score Band 7.5! The live speaking practice with Amina was exactly what I needed to build confidence. Highly recommend.",
    avatar: null,
  },
  {
    name: "Fadumo Cali",
    role: "Mother of two",
    rating: 5,
    text: "My kids love the English for Kids course. The live video classes are fun and engaging. They actually look forward to learning English now!",
    avatar: null,
  },
  {
    name: "Abdullahi Farah",
    role: "Business Owner",
    rating: 4,
    text: "The Business English course improved my emails and meetings with international clients. The live roleplay sessions were incredibly practical.",
    avatar: null,
  },
];

const STATS = [
  { label: "Active Students", value: "2,400+", icon: Users },
  { label: "Live Classes", value: "150+", icon: Video },
  { label: "Expert Teachers", value: "25+", icon: GraduationCap },
  { label: "Success Rate", value: "94%", icon: Award },
];

export function HomeView() {
  const { navigate, openAuthModal, user } = useStore();
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
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <Badge
                variant="outline"
                className="mb-5 inline-flex items-center gap-2 rounded-full border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                LIVE class happening now
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
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("live")}
                  className="w-full gap-2 sm:w-auto"
                >
                  <PlayCircle className="h-4 w-4 text-indigo-600" />
                  Watch Live Demo
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start">
                {[
                  "Expert live teachers",
                  "EVC Plus & Zaad",
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
                        Live with Teacher Amina
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-indigo-600">
                    <Users className="h-4 w-4" /> 28
                  </div>
                </div>
              </div>

              {/* Floating stats */}
              <div className="absolute -left-3 top-8 hidden rounded-2xl border bg-card p-3 shadow-xl sm:block">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <Star className="h-5 w-5 fill-current" />
                  </span>
                  <div>
                    <p className="text-lg font-extrabold leading-none">4.9</p>
                    <p className="text-[10px] text-muted-foreground">
                      Avg. rating
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 gap-4 rounded-2xl border bg-card p-6 shadow-sm sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <s.icon className="mx-auto mb-2 h-6 w-6 text-indigo-500" />
                <p className="text-2xl font-extrabold text-foreground">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ──────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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

      {/* ─── TESTIMONIALS ─────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-3 inline-flex items-center gap-1.5 border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
          >
            <Quote className="h-3 w-3" /> Student Stories
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Real students. Real progress.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Thousands of Somali learners have improved their English with our
            live classes. Here&apos;s what they say.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="card-lift flex flex-col p-6">
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < t.rating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-muted text-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-foreground">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3 border-t pt-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={t.avatar || undefined} />
                  <AvatarFallback className="bg-indigo-100 text-xs font-bold text-indigo-700">
                    {t.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
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
