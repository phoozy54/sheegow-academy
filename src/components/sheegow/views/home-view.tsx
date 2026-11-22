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
import { SectionHeading, type DesignTone } from "../design/section-heading";
import { FeatureTile } from "../design/feature-tile";
import { ProofStrip } from "../design/proof-strip";
import { ComparisonPanel } from "../design/comparison-panel";
import { PathwayCard } from "../design/pathway-card";
import { CtaPanel } from "../design/cta-panel";
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
  AudioLines,
  UserRoundCheck,
  Baby,
  BriefcaseBusiness,
  TrendingUp,
} from "lucide-react";

const FEATURES: Array<{
  icon: typeof Video;
  title: string;
  desc: string;
  tone: DesignTone;
}> = [
  {
    icon: Video,
    title: "LIVE Video Classes",
    desc: "Real-time interactive English classes — no recorded videos. Speak with teachers and classmates every session.",
    tone: "rose",
  },
  {
    icon: Users,
    title: "Small Group Learning",
    desc: "Learn in small batches so every student gets personal attention and speaking practice.",
    tone: "indigo",
  },
  {
    icon: GraduationCap,
    title: "Expert Teacher",
    desc: "Learn with Ciise Mohamed Sheeq (SHEEGOW) — English expert with a university degree and 15 years of teaching experience.",
    tone: "amber",
  },
  {
    icon: MessageSquare,
    title: "Real-time Chat",
    desc: "Ask questions instantly during class with live chat support alongside your video lesson.",
    tone: "emerald",
  },
  {
    icon: Award,
    title: "Certificates & Progress",
    desc: "Track your progress and earn a certificate when you complete each course.",
    tone: "indigo",
  },
  {
    icon: Globe2,
    title: "Learn From Anywhere",
    desc: "Join from anywhere in the world. Payment details are shown clearly at checkout.",
    tone: "sky",
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

      {/* ─── HONEST PROOF STRIP ────────────────────── */}
      <div className={`relative z-10 mx-auto -mt-6 max-w-7xl ${padClass}`}>
        <ProofStrip
          items={[
            {
              icon: AudioLines,
              label: "Speaking every lesson",
              detail: "Practice out loud, not just watch",
              tone: "rose",
            },
            {
              icon: UserRoundCheck,
              label: "Real teacher feedback",
              detail: "Corrections you can act on",
              tone: "emerald",
            },
            {
              icon: Award,
              label: "Certificate on completion",
              detail: "Progress you can show",
              tone: "amber",
            },
          ]}
        />
      </div>

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
        <SectionHeading
          eyebrow="Why SHEEGOW"
          icon={Sparkles}
          tone="indigo"
          title="Built for speaking, not just watching"
          description="One proven format: a real teacher, a small group and a reason to speak in every lesson."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureTile
              key={f.title}
              icon={f.icon}
              title={f.title}
              desc={f.desc}
              tone={f.tone}
            />
          ))}
        </div>
      </section>

      {/* ─── POPULAR COURSES ──────────────────────── */}
      <section className="bg-gradient-to-b from-indigo-50/50 to-background py-16 lg:py-24">
        <div className={`mx-auto max-w-7xl ${padClass}`}>
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <SectionHeading
              eyebrow="Popular Courses"
              icon={GraduationCap}
              tone="amber"
              align="left"
              className="mb-0"
              title="Live courses students love"
            />
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
        <SectionHeading
          id="how-it-works"
          eyebrow="How it works"
          icon={CheckCircle2}
          tone="emerald"
          title="Three steps to confident English"
          description="Every class is live with your teacher — no recorded videos."
        />

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
          <SectionHeading
            eyebrow="The difference is real"
            icon={Video}
            tone="amber"
            title="Live classes vs. recorded drills"
            description="Apps can build habits. Speaking with a teacher builds confidence."
          />
          <div className="grid gap-5 md:grid-cols-2">
            <ComparisonPanel
              highlighted
              title="Live with SHEEGOW"
              items={[
                "A teacher hears you and corrects you in the moment",
                "You speak in every lesson, not after finishing a module",
                "Questions get answers during the class",
                "Progress is marked by real lessons and a certificate",
              ]}
            />
            <ComparisonPanel
              title="Self-paced apps and recordings"
              items={[
                "Practice is mostly reading, tapping or repeating alone",
                "No one listens to your pronunciation in real time",
                "Mistakes can stay uncorrected for weeks",
                "Finishing videos is not the same as speaking well",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ─── PATHWAYS ─────────────────────────────── */}
      <section className={`mx-auto max-w-7xl py-16 lg:py-24 ${padClass}`}>
        <SectionHeading
          eyebrow="Choose your path"
          icon={Sparkles}
          tone="sky"
          title="There is a live class for your goal"
          description="Start with a course, ask about a trial, or explore how we work with partners."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {([
            {
              icon: GraduationCap,
              tone: "indigo",
              title: "Learners",
              desc: "Beginner to advanced live English courses.",
              cta: "Explore live courses",
              href: "/courses",
              event: "pathway_courses",
            },
            {
              icon: Baby,
              tone: "rose",
              title: "Parents",
              desc: "Playful live classes for children aged 7–12.",
              cta: "See English for kids",
              href: "/courses/english-for-kids-ages-7-12",
              event: "pathway_kids",
            },
            {
              icon: BriefcaseBusiness,
              tone: "amber",
              title: "Professionals",
              desc: "Meetings, email, interviews and presentations at work.",
              cta: "See business English",
              href: "/courses/business-english-professional",
              event: "pathway_business",
            },
            {
              icon: TrendingUp,
              tone: "emerald",
              title: "Partners & investors",
              desc: "Our mission, impact model and governance.",
              cta: "Read our impact model",
              href: "/investors",
              event: "pathway_investors",
            },
          ] as Array<{
            icon: typeof GraduationCap;
            tone: DesignTone;
            title: string;
            desc: string;
            cta: string;
            href: string;
            event: ConversionEvent;
          }>).map((path) => (
            <PathwayCard
              key={path.title}
              icon={path.icon}
              tone={path.tone}
              title={path.title}
              desc={path.desc}
              cta={path.cta}
              href={path.href}
              onClick={() => trackConversion(path.event)}
            />
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
      <CtaPanel
        className={padClass}
        title="Ready to start speaking English with confidence?"
        description="Join SHEEGOW ACADEMY today and start speaking English with expert teachers in live, interactive classes."
      >
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
      </CtaPanel>
    </div>
  );
}
