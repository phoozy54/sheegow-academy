import type { Metadata } from "next";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Live Classes | SHEEGOW ACADEMY",
  description:
    "Every SHEEGOW ACADEMY lesson is a live, real-time video class with a real teacher: speaking practice, instant correction, and small groups. See how live classes work.",
  path: "/live-classes",
});

export default function LiveClassesPage() {
  return (
    <SeoShell>
      <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        Live classes — how it works
      </h1>
      <p className="mt-6 text-muted-foreground">
        Nothing at SHEEGOW ACADEMY is pre-recorded. When you join a lesson, you
        enter a real-time video class where the teacher sees you, hears you,
        and works with you directly. That is the whole method: speak early,
        speak often, get corrected immediately, and build confidence lesson by
        lesson.
      </p>
      <h2 className="mt-8 text-xl font-semibold">What happens in a live class</h2>
      <ul className="mt-3 space-y-2 text-muted-foreground">
        <li>Warm-up speaking: you talk about your week using last lesson&apos;s words.</li>
        <li>New material: the teacher introduces grammar and vocabulary with examples.</li>
        <li>Guided practice: everyone speaks — pair work, questions, role plays.</li>
        <li>Correction and feedback: mistakes are fixed in the moment, kindly.</li>
        <li>Spoken homework: a short daily task keeps you practising until the next class.</li>
      </ul>
      <h2 className="mt-8 text-xl font-semibold">What you need</h2>
      <p className="mt-3 text-muted-foreground">
        A phone, tablet or laptop with internet and headphones. Classes run in
        a video room you open from a link — no special software. If your
        connection drops, the teacher makes sure you catch up.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Choose your class</h2>
      <p className="mt-3 text-muted-foreground">
        Live classes follow our{" "}
        <a className="underline" href="/courses">
          six course tracks
        </a>
        : beginner conversation, intermediate mastery, IELTS band 7, business
        English, advanced academic writing, and English for kids aged 7-12.
        Not sure which level you are? Send a WhatsApp message to{" "}
        <a className="underline" href="https://wa.me/252634085151">
          +252 63 4085151
        </a>{" "}
        and we will place you in the right class.
      </p>
      <p className="mt-8">
        <a
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
          href="/courses"
        >
          Find your course
        </a>
      </p>
      </div>
    </SeoShell>
  );
}
