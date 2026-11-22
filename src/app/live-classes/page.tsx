import type { Metadata } from "next";
import Link from "next/link";
import {
  Video,
  MessageSquare,
  Users,
  AudioLines,
  Headphones,
  ArrowRight,
} from "lucide-react";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { ContentSection, PageHero } from "@/components/sheegow/design/page-hero";
import { StepList } from "@/components/sheegow/design/step-list";
import { FeatureTile } from "@/components/sheegow/design/feature-tile";
import { CtaPanel } from "@/components/sheegow/design/cta-panel";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Live Classes | SHEEGOW ACADEMY",
  description:
    "Every SHEEGOW ACADEMY lesson is a live, real-time video class with a real teacher: speaking practice, instant correction, and small groups. See how live classes work.",
  path: "/live-classes",
});

const CLASS_STEPS = [
  {
    title: "Warm-up speaking",
    desc: "You talk about your week using last lesson's words.",
    tone: "rose" as const,
  },
  {
    title: "New material",
    desc: "The teacher introduces grammar and vocabulary with clear examples.",
    tone: "indigo" as const,
  },
  {
    title: "Guided practice",
    desc: "Everyone speaks — pair work, questions and role plays.",
    tone: "emerald" as const,
  },
  {
    title: "Correction and feedback",
    desc: "Mistakes are fixed in the moment, kindly and clearly.",
    tone: "amber" as const,
  },
  {
    title: "Spoken homework",
    desc: "A short daily task keeps you practising until the next class.",
    tone: "sky" as const,
  },
];

export default function LiveClassesPage() {
  return (
    <SeoShell>
      <PageHero
        eyebrow="Live classes"
        icon={Video}
        tone="rose"
        title="Live classes — how it works"
        lead="Nothing at SHEEGOW ACADEMY is pre-recorded. When you join a lesson, you enter a real-time video class where the teacher sees you, hears you, and works with you directly. That is the whole method: speak early, speak often, get corrected immediately, and build confidence lesson by lesson."
      />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <ContentSection id="in-a-class" title="What happens in a live class">
          <StepList steps={CLASS_STEPS} />
        </ContentSection>

        <ContentSection id="what-you-need" title="What you need">
          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureTile
              icon={Headphones}
              title="A device and headphones"
              desc="A phone, tablet or laptop with internet is enough to join."
              tone="indigo"
            />
            <FeatureTile
              icon={AudioLines}
              title="A link, no software"
              desc="Open the video room from your browser — nothing to install."
              tone="emerald"
            />
            <FeatureTile
              icon={Users}
              title="Small groups"
              desc="You are heard, seen and corrected instead of lost in a crowd."
              tone="amber"
            />
          </div>
          <p>
            If your connection drops, the teacher makes sure you catch up. Ask
            on WhatsApp before the first class if you want a quick connection
            check.
          </p>
        </ContentSection>

        <ContentSection id="choose-a-class" title="Choose your class">
          <p>
            Live classes follow our course tracks: beginner conversation,
            intermediate mastery, IELTS band 7, business English, advanced
            academic writing, and English for kids aged 7–12. Not sure which
            level you are? Send a WhatsApp message to{" "}
            <a
              className="font-medium text-indigo-600 underline"
              href="https://wa.me/252634085151"
              rel="noopener noreferrer"
              target="_blank"
            >
              +252 63 4085151
            </a>{" "}
            and we will place you in the right class.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700"
          >
            Find your course
            <ArrowRight className="h-4 w-4" />
          </Link>
        </ContentSection>
      </div>
      <CtaPanel
        title="Ready to speak in your first class?"
        description="Pick a live course, or message us on WhatsApp and we will help you choose the right level."
      >
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 shadow-lg hover:bg-indigo-50"
        >
          Browse live courses
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10"
        >
          <MessageSquare className="h-4 w-4" /> Ask us a question
        </Link>
      </CtaPanel>
    </SeoShell>
  );
}
