"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useT } from "@/lib/i18n";
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
    tone: "indigo",
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
  const { openAuthModal, user } = useStore();
  const router = useRouter();
  const t = useT();
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
                {t("home.heroBadge")}
              </Badge>

              <h1 className="mb-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {t("home.heroTitle1")}{" "}
                <span className="gradient-text">{t("home.heroTitleHighlight")}</span>
              </h1>

              <p className="mx-auto mb-7 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
                {t("home.heroDesc")}
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
                    {t("home.exploreLiveCourses")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
                  <Link
                    href="#how-it-works"
                    onClick={() => trackConversion("hero_how_it_works")}
                  >
                    {t("home.seeHowItWorks")}
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
                        {t("home.englishConversation")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("home.liveWithSheegow")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-indigo-600">
                    <Users className="h-4 w-4" /> {t("home.smallGroup")}
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
              label: t("home.proofSpeaking"),
              detail: t("home.proofSpeakingDetail"),
              tone: "rose",
            },
            {
              icon: UserRoundCheck,
              label: t("home.proofFeedback"),
              detail: t("home.proofFeedbackDetail"),
              tone: "indigo",
            },
            {
              icon: Award,
              label: t("home.proofCertificate"),
              detail: t("home.proofCertificateDetail"),
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
                className="mb-3 inline-flex items-center gap-1.5 border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
              >
                <BookOpen className="h-3 w-3" /> {t("home.continueLearning")}
              </Badge>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {t("home.pickUpWhereLeft")}
              </h2>
            </div>
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="gap-1.5"
            >
              {t("home.myDashboard")} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {enrollments.slice(0, 3).map((enrollment) => (
              <Card key={enrollment.id} className="card-lift flex flex-col p-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-500">
                  {enrollment.course?.level || t("dashboard.sectionCourses")}
                </p>
                <h3 className="mt-1 line-clamp-2 text-base font-bold text-foreground">
                  {enrollment.course?.title || "Course"}
                </h3>
                <div className="mb-1.5 mt-4 flex justify-between text-xs text-muted-foreground">
                  <span>{t("home.progress")}</span>
                  <span className="font-bold text-foreground">{enrollment.progress}%</span>
                </div>
                <Progress value={enrollment.progress} className="h-1.5" />
                <Button
                  className="mt-4 w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => router.push(`/learn/${enrollment.courseId}`)}
                >
                  {t("home.continueLesson")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ─── FEATURES ──────────────────────────────── */}
      <section className={`mx-auto max-w-7xl py-16 lg:py-24 ${padClass}`}>
        <SectionHeading
          eyebrow={t("home.featuresEyebrow")}
          icon={Sparkles}
          tone="indigo"
          title={t("home.featuresTitle")}
          description={t("home.featuresDesc")}
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
              eyebrow={t("home.popularCoursesEyebrow")}
              icon={GraduationCap}
              tone="amber"
              
              title={t("home.popularCoursesTitle")}
            />
            <Button asChild variant="outline" className="gap-1.5">
              <Link href="/courses">
                {t("home.viewAllCourses")}
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
      <section  className={`mx-auto max-w-7xl py-16 lg:py-24 ${padClass}`}>
        <SectionHeading
          
          eyebrow={t("home.howItWorksEyebrow")}
          icon={CheckCircle2}
          tone="indigo"
          title={t("home.howItWorksTitle")}
          description={t("home.howItWorksDesc")}
        />

        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              n: "1",
              title: t("home.step1Title"),
              desc: t("home.step1Desc"),
            },
            {
              n: "2",
              title: t("home.step2Title"),
              desc: t("home.step2Desc"),
            },
            {
              n: "3",
              title: t("home.step3Title"),
              desc: t("home.step3Desc"),
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
            eyebrow={t("home.liveVsRecordedEyebrow")}
            icon={Video}
            tone="amber"
            title={t("home.liveVsRecordedTitle")}
            description={t("home.liveVsRecordedDesc")}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <ComparisonPanel
              highlighted
              title={t("home.liveWithSheegow")}
              items={[
                t("home.liveItem1"),
                t("home.liveItem2"),
                t("home.liveItem3"),
                t("home.liveItem4"),
              ]}
            />
            <ComparisonPanel
              title={t("home.selfPacedTitle")}
              items={[
                t("home.recordedItem1"),
                t("home.recordedItem2"),
                t("home.recordedItem3"),
                t("home.recordedItem4"),
              ]}
            />
          </div>
        </div>
      </section>

      {/* ─── PATHWAYS ─────────────────────────────── */}
      <section className={`mx-auto max-w-7xl py-16 lg:py-24 ${padClass}`}>
        <SectionHeading
          eyebrow={t("home.pathwaysEyebrow")}
          icon={Sparkles}
          tone="sky"
          title={t("home.pathwaysTitle")}
          description={t("home.pathwaysDesc")}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {([
            {
              icon: GraduationCap,
              tone: "indigo",
              title: t("home.pathwayLearners"),
              desc: t("home.pathwayLearnersDesc"),
              cta: t("home.pathwayLearnersCta"),
              href: "/courses",
              event: "pathway_courses",
            },
            {
              icon: Baby,
              tone: "rose",
              title: t("home.pathwayParents"),
              desc: t("home.pathwayParentsDesc"),
              cta: t("home.pathwayParentsCta"),
              href: "/courses/english-for-kids-ages-7-12",
              event: "pathway_kids",
            },
            {
              icon: BriefcaseBusiness,
              tone: "amber",
              title: t("home.pathwayProfessionals"),
              desc: t("home.pathwayProfessionalsDesc"),
              cta: t("home.pathwayProfessionalsCta"),
              href: "/courses/business-english-professional",
              event: "pathway_business",
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
          {t("home.trialText")}{" "}
          <Link
            href="/contact"
            onClick={() => trackConversion("trial_enquiry")}
            className="font-semibold text-indigo-600 underline"
          >
            {t("home.askFreeTrial")}
          </Link>
          .
        </p>
      </section>

      {/* ─── CTA ─────────────────────────────────── */}
      <CtaPanel
        className={padClass}
        title={t("cta.ready")}
        description={t("cta.join")}
      >
        {user ? (
          <Button
            asChild
            size="lg"
            className="w-full gap-2 bg-white text-indigo-700 shadow-lg hover:bg-indigo-50 sm:w-auto"
          >
            <Link href="/courses">
              {t("cta.browseCourses")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={() => openAuthModal("register")}
            className="w-full gap-2 bg-white text-indigo-700 shadow-lg hover:bg-indigo-50 sm:w-auto"
          >
            {t("cta.createAccount")}
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
            {t("home.aboutSheegow")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CtaPanel>
    </div>
  );
}
