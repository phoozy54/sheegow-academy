import type { Metadata } from "next";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "About SHEEGOW ACADEMY | Live English Classes",
  description:
    "SHEEGOW ACADEMY teaches English through live, interactive video classes with a real teacher — in Hargeisa and online, for learners everywhere.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <SeoShell>
      <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        About SHEEGOW ACADEMY
      </h1>
      <p className="mt-6 text-muted-foreground">
        SHEEGOW ACADEMY is a live English school built around one simple idea:
        you learn to speak by speaking. Every lesson is a real-time,
        interactive video class with a real teacher — not a recorded video, not
        an app drill. Students join from Hargeisa and from anywhere in the
        world, practise every lesson out loud, and get direct feedback on their
        English.
      </p>
      <h2 className="mt-8 text-xl font-semibold">How we teach</h2>
      <p className="mt-3 text-muted-foreground">
        Classes are small and conversational. You speak in the first minute of
        the first lesson, and in every lesson after that. The teacher corrects
        you gently, explains grammar when it helps, and pushes you to use new
        words immediately. Homework is short and spoken: you practise what you
        learned between lessons so the next class builds on it.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Who we teach</h2>
      <ul className="mt-3 space-y-2 text-muted-foreground">
        <li>
          Beginners who want a patient, structured start (
          <a className="underline" href="/courses/english-conversation-for-beginners">
            conversation for beginners
          </a>
          )
        </li>
        <li>
          Learners preparing for IELTS (
          <a className="underline" href="/courses/ielts-preparation-band-7">
            IELTS band 7 preparation
          </a>
          )
        </li>
        <li>
          Professionals who need English at work (
          <a className="underline" href="/courses/business-english-professional">
            business English
          </a>
          )
        </li>
        <li>
          Students aiming at university-level writing (
          <a className="underline" href="/courses/advanced-english-academic-writing">
            advanced academic writing
          </a>
          )
        </li>
        <li>
          Kids aged 7-12 (
          <a className="underline" href="/courses/english-for-kids-ages-7-12">
            English for kids
          </a>
          )
        </li>
      </ul>
      <h2 className="mt-8 text-xl font-semibold">Where we teach</h2>
      <p className="mt-3 text-muted-foreground">
        Our live classes run online, so you can join from home, from work, or
        from school — all you need is a phone or laptop with internet. Students
        in Hargeisa, across Somaliland and Somalia, and in the wider diaspora
        study with us every week. If you prefer to talk before enrolling,
        message us on WhatsApp or email us and a real person will answer.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Contact</h2>
      <p className="mt-3 text-muted-foreground">
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
      <p className="mt-8">
        <a
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
          href="/courses"
        >
          See our courses
        </a>
      </p>
      </div>
    </SeoShell>
  );
}
