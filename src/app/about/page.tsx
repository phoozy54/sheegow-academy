import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Video, MessageSquare, Globe2 } from "lucide-react";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { ContentSection, PageHero } from "@/components/sheegow/design/page-hero";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "About SHEEGOW ACADEMY | Live English Classes",
  description:
    "SHEEGOW ACADEMY teaches English through live, interactive video classes with a real teacher — in Hargeisa and online, for learners everywhere.",
  path: "/about",
});

const PATHS = [
  {
    icon: Video,
    title: "Beginners",
    desc: "A patient, structured start with speaking from lesson one.",
    href: "/courses/english-conversation-for-beginners",
    cta: "Conversation for beginners",
  },
  {
    icon: GraduationCap,
    title: "IELTS preparation",
    desc: "Strategies and speaking practice targeting band 7.",
    href: "/courses/ielts-preparation-band-7",
    cta: "IELTS band 7 preparation",
  },
  {
    icon: MessageSquare,
    title: "Professionals",
    desc: "Meetings, email and presentations for real work.",
    href: "/courses/business-english-professional",
    cta: "Business English",
  },
  {
    icon: Globe2,
    title: "Academic writing",
    desc: "Essays, research writing and critical thinking.",
    href: "/courses/advanced-english-academic-writing",
    cta: "Advanced academic writing",
  },
  {
    icon: Video,
    title: "Kids aged 7–12",
    desc: "Playful live classes that build confidence early.",
    href: "/courses/english-for-kids-ages-7-12",
    cta: "English for kids",
  },
];

export default function AboutPage() {
  return (
    <SeoShell>
      <PageHero
        eyebrow="About us"
        icon={GraduationCap}
        tone="indigo"
        title="About SHEEGOW ACADEMY"
        lead="SHEEGOW ACADEMY is a live English school built around one simple idea: you learn to speak by speaking. Every lesson is a real-time, interactive video class with a real teacher — not a recorded video, not an app drill. Students join from Hargeisa and from anywhere in the world, practise every lesson out loud, and get direct feedback on their English."
      />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <ContentSection id="how-we-teach" title="How we teach">
          <p>
            Classes are small and conversational. You speak in the first minute
            of the first lesson, and in every lesson after that. The teacher
            corrects you gently, explains grammar when it helps, and pushes you
            to use new words immediately. Homework is short and spoken: you
            practise what you learned between lessons so the next class builds
            on it.
          </p>
        </ContentSection>

        <ContentSection id="who-we-teach" title="Who we teach">
          <div className="grid gap-3 sm:grid-cols-2">
            {PATHS.map((path) => {
              const Icon = path.icon;
              return (
                <Link
                  key={path.title}
                  href={path.href}
                  className="card-lift group flex flex-col rounded-2xl border bg-card p-5"
                >
                  <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-bold text-foreground">{path.title}</span>
                  <span className="mt-1 text-sm text-muted-foreground">
                    {path.desc}
                  </span>
                  <span className="mt-3 text-sm font-semibold text-indigo-600 group-hover:text-indigo-700">
                    {path.cta} →
                  </span>
                </Link>
              );
            })}
          </div>
        </ContentSection>

        <ContentSection id="where-we-teach" title="Where we teach">
          <p>
            Our live classes run online, so you can join from home, from work,
            or from school — all you need is a phone or laptop with internet.
            Students in Hargeisa, across Somaliland and Somalia, and in the
            wider diaspora study with us every week. If you prefer to talk
            before enrolling, message us on WhatsApp or email us and a real
            person will answer.
          </p>
        </ContentSection>

        <ContentSection id="contact" title="Contact">
          <p>
            Email:{" "}
            <a className="underline" href="mailto:info@sheegowacademy.com">
              info@sheegowacademy.com
            </a>
            <br />
            Phone / WhatsApp:{" "}
            <a className="underline" href="https://wa.me/252634085151">
              +252 63 4085151
            </a>
          </p>
        </ContentSection>

        <p className="mt-10">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700"
          >
            See our live courses
            <span aria-hidden="true">→</span>
          </Link>
        </p>
      </div>
    </SeoShell>
  );
}
