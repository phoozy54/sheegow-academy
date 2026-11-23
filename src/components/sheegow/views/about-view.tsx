"use client";

import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Eye,
  Video,
  Users,
  GraduationCap,
  Award,
  Globe2,
  Heart,
  Sparkles,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  MessageSquare,
  Rocket,
  HandHeart,
  Sun,
} from "lucide-react";

/* ─── Static data ───────────────────────────────────────── */

const VALUES = [
  {
    icon: Video,
    title: "Live-first learning",
    desc: "We believe English is meant to be spoken, not watched. Every class is a real-time video session with a teacher.",
    color: "from-rose-500 to-pink-600",
  },
  {
    icon: Globe2,
    title: "Accessible to all",
    desc: "Quality English education should reach every learner, in every country — no matter where you start.",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    icon: GraduationCap,
    title: "Quality teaching",
    desc: "Our teachers are TESOL-certified and specialize in teaching English to students from every background.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Users,
    title: "Community",
    desc: "Learning is social. We build small, supportive cohorts where students practice together and grow together.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: HandHeart,
    title: "Cultural respect",
    desc: "We respect every culture and background. Our lessons help you open new doors without leaving your identity behind.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Rocket,
    title: "Continuous improvement",
    desc: "We listen to student feedback every week and refine our courses to serve you better.",
    color: "from-sky-500 to-blue-600",
  },
];

const TEACHER = {
  name: "Ciise Mohamed Sheeq (SHEEGOW)",
  bio: "English language expert with a university degree, multiple language certifications and 15 years of teaching experience. He personally leads every live course at SHEEGOW ACADEMY.",
  specialty: "English Language Expert · 15+ Years",
};

/* ─── Main view ──────────────────────────────────────────── */

export function AboutView() {
  const { navigate, openAuthModal, user } = useStore();

  return (
    <div className="bg-background">
      {/* ─── HERO ───────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b">
        <div className="hero-mesh absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="outline"
              className="mb-5 inline-flex items-center gap-1.5 border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
            >
              <Sparkles className="h-3 w-3" /> Our Story
            </Badge>
            <h1 className="mb-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              About <span className="gradient-text">SHEEGOW ACADEMY</span>
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              We exist to bring quality, live English education to students
              everywhere. No recorded videos. No lonely self-study. Just real
              teachers, real conversations, real progress.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() => navigate("courses")}
                className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700 sm:w-auto"
              >
                Explore Courses
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("contact")}
                className="w-full gap-2 sm:w-auto"
              >
                Get in Touch
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MISSION & VISION ──────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="card-lift relative overflow-hidden p-8">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30">
              <Target className="h-6 w-6" />
            </div>
            <h2 className="mb-3 text-xl font-bold text-foreground">Our Mission</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              To make high-quality, interactive English education accessible to
              every learner — through live classes taught by caring expert
              teachers. We exist to break the barrier of recorded, passive
              learning and replace it with conversation, practice, and
              confidence.
            </p>
          </Card>

          <Card className="card-lift relative overflow-hidden p-8">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30">
              <Eye className="h-6 w-6" />
            </div>
            <h2 className="mb-3 text-xl font-bold text-foreground">Our Vision</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A world where every student — from primary school to working
              professional — can speak English confidently. Where live classes
              replace lonely videos, where teachers know their students by name,
              and where a better future is just a live class away.
            </p>
          </Card>
        </div>
      </section>

      {/* ─── STORY ─────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-indigo-50/40 to-background py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Badge
            variant="outline"
            className="mb-3 inline-flex items-center gap-1.5 border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
          >
            <BookOpen className="h-3 w-3" /> The Story
          </Badge>
          <h2 className="mb-6 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Built for learners, by learners
          </h2>

          <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
            <p>
              SHEEGOW ACADEMY started with a simple frustration: too many English
              courses were just recordings. You watched a video, took a quiz, and
              forgot everything. There was no speaking, no practice, no real
              conversation — the very things that make a language stick.
            </p>
            <p>
              Our founder and general manager,{" "}
              <span className="font-semibold text-foreground">
                Ciise Mohamed Sheeq (SHEEGOW)
              </span>
              , decided to fix this. An English language expert with a university
              degree, he holds multiple language certifications and brings 15
              years of hands-on teaching experience. We built a platform
              where every single class is{" "}
              <span className="font-semibold text-foreground">LIVE</span>. Where you
              see your teacher, hear your classmates, raise your hand, and speak
              English out loud from day one.
            </p>
            <p>
              Today, students learn with us — from absolute beginners taking
              their first class to IELTS candidates preparing for university
              abroad. We learn on phones and laptops. We come from different
              countries, but we share one goal: to speak English with confidence.
            </p>
            <p>
              That&apos;s the SHEEGOW difference. <span className="font-semibold text-foreground">Live classes, not recorded videos.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ─── VALUES ────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-3 inline-flex items-center gap-1.5 border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
          >
            <Heart className="h-3 w-3" /> Our Values
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            What we believe in
          </h2>
          <p className="mt-3 text-muted-foreground">
            Six principles that shape every class, every course, every decision
            we make.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v) => (
            <Card key={v.title} className="card-lift group p-6">
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${v.color} text-white shadow-lg`}
              >
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">{v.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {v.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── FOUNDER / GENERAL MANAGER ──────────────────── */}
      <section className="bg-gradient-to-b from-indigo-50/40 to-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge
              variant="outline"
              className="mb-3 inline-flex items-center gap-1.5 border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
            >
              <Award className="h-3 w-3" /> Leadership
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Meet the founder &amp; general manager
            </h2>
            <p className="mt-3 text-muted-foreground">
              The English language expert behind SHEEGOW ACADEMY.
            </p>
          </div>

          <Card className="card-lift overflow-hidden border-indigo-100 bg-gradient-to-br from-white via-indigo-50/40 to-amber-50/50 p-0">
            <div className="grid gap-0 lg:grid-cols-[auto,1fr]">
              <div className="flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 p-10 lg:p-14">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/30 text-3xl font-extrabold text-white sm:h-36 sm:w-36 sm:text-4xl">
                  CS
                </div>
              </div>
              <div className="p-6 sm:p-10">
                <Badge className="mb-3 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                  Founder &amp; General Manager
                </Badge>
                <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                  Ciise Mohamed Sheeq (SHEEGOW)
                </h3>
                <p className="mt-1 text-sm font-semibold text-indigo-600">
                  English Language Expert · 15+ Years of Experience
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Ciise holds a university degree in English and multiple
                  language certifications. With 15 years of teaching experience,
                  he leads SHEEGOW ACADEMY with one goal: helping
                  learners everywhere speak English with confidence through
                  live, interactive classes.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      icon: GraduationCap,
                      label: "University degree",
                    },
                    {
                      icon: Award,
                      label: "Multiple language certificates",
                    },
                    {
                      icon: BookOpen,
                      label: "15 years of teaching experience",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-white/80 px-3 py-2.5 text-xs font-semibold text-foreground"
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-indigo-600" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ─── TEACHERS ───────────────────────────────────── */}
      <section className="bg-gradient-to-b from-background to-indigo-50/40 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge
              variant="outline"
              className="mb-3 inline-flex items-center gap-1.5 border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
            >
              <GraduationCap className="h-3 w-3" /> Meet Your Teacher
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              One expert. Every class live.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              All courses are taught by founder Ciise Mohamed Sheeq (SHEEGOW),
              an English language expert with 15 years of experience — live and
              interactive, never recorded.
            </p>
          </div>

          <div className="mx-auto max-w-2xl">
            <Card className="card-lift flex flex-col overflow-hidden p-0 sm:flex-row">
              <div className="flex min-h-40 items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 sm:w-56">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/30 text-2xl font-extrabold text-white">
                  CS
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <Badge
                  variant="outline"
                  className="mb-3 w-fit border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700"
                >
                  Founder &amp; Teacher
                </Badge>
                <h3 className="text-lg font-bold text-foreground">{TEACHER.name}</h3>
                <p className="mt-1 text-xs font-semibold text-indigo-600">
                  {TEACHER.specialty}
                </p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {TEACHER.bio}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("courses")}
                  className="mt-4 gap-1.5 self-start"
                >
                  <BookOpen className="h-3.5 w-3.5" /> View Courses
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────── */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-8 text-center shadow-2xl shadow-indigo-500/30 sm:p-12 lg:p-16">
          <div className="hero-mesh absolute inset-0 opacity-40" />
          <div className="relative">
            <Badge
              variant="outline"
              className="mb-4 inline-flex items-center gap-1.5 border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur"
            >
              <Sun className="h-3 w-3" /> Start today
            </Badge>
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to start your English journey?
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
                onClick={() => navigate("contact")}
                className="w-full border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white sm:w-auto"
              >
                <MessageSquare className="h-4 w-4" /> Ask a Question
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRIVACY POLICY ──────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge
            variant="outline"
            className="mb-3 inline-flex items-center gap-1.5 border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
          >
            <ShieldCheck className="h-3 w-3" /> Your Privacy
          </Badge>
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Privacy Policy
          </h2>
          <p className="text-muted-foreground">
            How we handle your data at SHEEGOW ACADEMY.
          </p>
        </div>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="mb-2 text-base font-bold text-foreground">
              1. Information We Collect
            </h3>
            <p>
              When you create an account, we collect your full name, email
              address, and phone number. When you enroll in a course or make a
              payment, we record the transaction details. We do not store
              credit card numbers — payments are processed by our payment
              providers.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-bold text-foreground">
              2. How We Use Your Data
            </h3>
            <p>
              We use your information to provide access to your courses,
              authenticate your login sessions, send you class reminders,
              process payments, and improve our platform. We never sell your
              data to third parties.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-bold text-foreground">
              3. Cookies
            </h3>
            <p>
              We use essential cookies to keep you logged in (httpOnly JWT
              tokens) and remember your preferences. These cookies are required
              for the platform to function and cannot be disabled. You can
              manage your cookie preferences using the banner shown on first
              visit.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-bold text-foreground">
              4. Data Security
            </h3>
            <p>
              Passwords are hashed using bcrypt before storage. Authentication
              tokens are stored in httpOnly cookies to prevent cross-site
              scripting (XSS) attacks. All database connections use SSL/TLS
              encryption. Our database is hosted on Neon Postgres with
              encrypted storage.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-bold text-foreground">
              5. Your Rights
            </h3>
            <p>
              You can request access to, correction of, or deletion of your
              personal data at any time by contacting us at{" "}
              <a
                href="mailto:info@sheegowacademy.com"
                className="font-medium text-indigo-600 hover:underline"
              >
                info@sheegowacademy.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
