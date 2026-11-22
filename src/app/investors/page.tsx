import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { PageHero } from "@/components/sheegow/design/page-hero";
import { pageMeta, NAP } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Investors & Partners | SHEEGOW ACADEMY",
  description:
    "The SHEEGOW ACADEMY impact model: live English learning, our approach to measurable outcomes, governance, transparency and how to contact us about partnerships.",
  path: "/investors",
});

/**
 * Honest stakeholder page. No traction numbers, retention rates or revenue
 * figures are published here because none have been verified for public use.
 * Unverified fields are marked explicitly rather than filled with estimates.
 */
export default function InvestorsPage() {
  return (
    <SeoShell>
      <PageHero
        eyebrow="Investors & partners"
        icon={TrendingUp}
        tone="emerald"
        title="Building practical English skills through live teaching"
        lead="SHEEGOW ACADEMY is a live English school. Our product is simple and deliberate: a real teacher, a small group, and speaking practice in every lesson. We believe this is the most reliable way for a learner to move from understanding English to using it."
      />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <section className="mt-0">
          <h2 className="text-xl font-semibold">The problem we solve</h2>
          <p className="mt-3 text-muted-foreground">
            Many learners study English for years but still hesitate to speak.
            Self-paced apps and recorded videos can build knowledge, yet they
            cannot hear a learner, correct pronunciation in the moment, or
            create the accountability of a live class. We focus on that gap.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Our model</h2>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Live instruction:</strong>{" "}
              every class is taught in real time by a human teacher.
            </li>
            <li>
              <strong className="text-foreground">Speaking-first:</strong>{" "}
              learners talk from the first lesson, with feedback they can use.
            </li>
            <li>
              <strong className="text-foreground">Clear pathways:</strong>{" "}
              beginner, intermediate, advanced, IELTS, business, kids and
              professional English tracks.
            </li>
            <li>
              <strong className="text-foreground">Transparent payment:</strong>{" "}
              course prices are displayed publicly; the full total is shown
              before payment at checkout.
            </li>
          </ul>
          <p className="mt-4">
            <Link
              href="/courses"
              className="font-semibold text-indigo-600 underline"
            >
              See our live courses
            </Link>
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Impact framework</h2>
          <p className="mt-3 text-muted-foreground">
            We intend to report on the measures below once the data has been
            collected and verified. They are commitments to measure — not
            published results.
          </p>
          <div
            className="mt-4 overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Impact measures, status and why each measure matters"
          >
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4 font-semibold">Measure</th>
                  <th className="py-2 pr-4 font-semibold">Why it matters</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-3 pr-4">Active learners</td>
                  <td className="py-3 pr-4">Reach of the programme</td>
                  <td className="py-3">Pending verification</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4">Lesson attendance</td>
                  <td className="py-3 pr-4">Real participation, not sign-ups</td>
                  <td className="py-3">Pending verification</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4">Course completion</td>
                  <td className="py-3 pr-4">Whether learners finish what they start</td>
                  <td className="py-3">Pending verification</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Learner feedback</td>
                  <td className="py-3 pr-4">Confidence and usefulness of classes</td>
                  <td className="py-3">Pending verification</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Use of funds</h2>
          <p className="mt-3 text-muted-foreground">
            Investment is directed to teaching quality and access: teacher
            time and training, curriculum development for professional tracks,
            reliable live-class infrastructure, learner support, and careful
            measurement of outcomes. We do not publish allocation percentages
            until they are audited.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Governance & transparency</h2>
          <p className="mt-3 text-muted-foreground">
            The school is led by Ciise Mohamed Sheeq (SHEEGOW), an English
            teacher with 15 years of teaching experience. We keep public
            information accurate: prices are visible, trial terms are stated
            honestly, and claims on this site are limited to what we can
            support. Our{" "}
            <Link href="/privacy" className="underline">
              privacy policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="underline">
              terms of service
            </Link>{" "}
            are public.
          </p>
        </section>

        <section className="mt-10 rounded-2xl border bg-muted/30 p-6">
          <h2 className="text-xl font-semibold">Talk to us</h2>
          <p className="mt-3 text-muted-foreground">
            For partnerships, investor enquiries or questions about the
            programme, contact us directly. A real person will reply.
          </p>
          <p className="mt-4 text-sm">
            Email:{" "}
            <a className="underline" href={`mailto:${NAP.email}`}>
              {NAP.email}
            </a>
            <br />
            WhatsApp / phone:{" "}
            <a className="underline" href={NAP.whatsapp}>
              {NAP.phone}
            </a>
            <br />
            Based in {NAP.address}; classes run online worldwide.
          </p>
          <p className="mt-5">
            <Link
              href="/contact"
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
            >
              Contact the team
            </Link>
          </p>
        </section>
      </div>
    </SeoShell>
  );
}
