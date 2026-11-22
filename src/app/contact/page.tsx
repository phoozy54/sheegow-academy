import type { Metadata } from "next";
import Link from "next/link";
import {
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { ContentSection, PageHero } from "@/components/sheegow/design/page-hero";
import { ContactCard } from "@/components/sheegow/design/contact-card";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Contact SHEEGOW ACADEMY | WhatsApp, Phone & Email",
  description:
    "Talk to a real person at SHEEGOW ACADEMY: WhatsApp +252 63 4085151, phone, or email info@sheegowacademy.com. We answer questions about classes, levels and schedules.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <SeoShell>
      <PageHero
        eyebrow="Contact us"
        icon={MessageSquare}
        tone="sky"
        title="Talk to a real person"
        lead="Do you have a question about which class fits your level, when lessons run, or how payment works? Contact us directly — you will talk to a real person, not a bot."
      />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactCard icon={MessageSquare} title="WhatsApp (fastest)" tone="emerald">
            <p>
              Message us any time:{" "}
              <a
                className="font-medium text-indigo-600 underline"
                href="https://wa.me/252634085151"
                rel="noopener noreferrer"
                target="_blank"
              >
                +252 63 4085151 on WhatsApp
              </a>
              . Tell us your current level and your goal, and we will recommend a
              class.
            </p>
          </ContactCard>

          <ContactCard icon={Mail} title="Email" tone="indigo">
            <p>
              <a
                className="font-medium text-indigo-600 underline"
                href="mailto:info@sheegowacademy.com"
              >
                info@sheegowacademy.com
              </a>{" "}
              — for enrolment, invoices, school and company enquiries.
            </p>
          </ContactCard>

          <ContactCard icon={Phone} title="Phone" tone="amber">
            <p>
              <a
                className="font-medium text-indigo-600 underline"
                href="tel:+252634085151"
              >
                +252 63 4085151
              </a>{" "}
              — during class hours; WhatsApp is more reliable outside them.
            </p>
          </ContactCard>

          <ContactCard icon={MapPin} title="Location" tone="sky">
            <p>
              Hargeisa, Somaliland (Somalia). Classes themselves run online —
              join from anywhere.
            </p>
          </ContactCard>
        </div>

        <ContentSection id="next-step" title="Ready to start?">
          <p>
            Browse the{" "}
            <Link className="font-medium text-indigo-600 underline" href="/courses">
              live English courses
            </Link>{" "}
            and pick your level, or ask us on WhatsApp and we will pick it for
            you.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700"
          >
            See live courses
            <ArrowRight className="h-4 w-4" />
          </Link>
        </ContentSection>
      </div>
    </SeoShell>
  );
}
