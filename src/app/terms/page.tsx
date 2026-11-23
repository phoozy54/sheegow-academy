import type { Metadata } from "next";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Terms of Service | SHEEGOW ACADEMY",
  description:
    "The terms that apply when you use the SHEEGOW ACADEMY website, contact us, or enrol in live English classes.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <SeoShell>
      <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-4 text-muted-foreground">
        These terms apply when you use sheegowacademy.com or enrol in
        SHEEGOW ACADEMY classes. By contacting us or joining a class you agree
        to them. Questions?{" "}
        <a className="underline" href="mailto:info@sheegowacademy.com">
          info@sheegowacademy.com
        </a>
        . Last updated: 21 November 2026.
      </p>

      <h2 className="mt-8 text-xl font-semibold">1. Our service</h2>
      <p className="mt-3 text-muted-foreground">
        SHEEGOW ACADEMY provides live, teacher-led English classes delivered
        online in real time. We describe each course, its level and its format
        on the{" "}
        <a className="underline" href="/courses">
          courses page
        </a>
        . We may adjust schedules, teachers and course content when needed —
        if a change affects your class, we will tell you in advance.
      </p>

      <h2 className="mt-8 text-xl font-semibold">2. Enrolment and payment</h2>
      <p className="mt-3 text-muted-foreground">
        Enrolment happens through direct contact (WhatsApp, phone or email).
        Fees, payment methods and any refund window are agreed in writing at
        enrolment. A place in a class is confirmed after payment.
      </p>

      <h2 className="mt-8 text-xl font-semibold">3. Your responsibilities</h2>
      <ul className="mt-3 space-y-2 text-muted-foreground">
        <li>Join classes on time and with a working connection.</li>
        <li>Treat teachers and fellow students with respect; disruptive behaviour can end your enrolment.</li>
        <li>Do not record, share or redistribute class sessions or materials without written permission.</li>
        <li>Do not use our classes or site for any unlawful purpose.</li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">4. Intellectual property</h2>
      <p className="mt-3 text-muted-foreground">
        All course materials, the SHEEGOW ACADEMY name and this website&apos;s
        content belong to SHEEGOW ACADEMY. You may use materials for your own
        learning. You may not resell, republish or teach from them.
      </p>

      <h2 className="mt-8 text-xl font-semibold">5. Availability</h2>
      <p className="mt-3 text-muted-foreground">
        We work hard to keep classes and this website available, but we cannot
        guarantee uninterrupted service (internet outages happen on everyone&apos;s
        side). When a class is cancelled by us, it is rescheduled or refunded.
      </p>

      <h2 className="mt-8 text-xl font-semibold">6. Liability</h2>
      <p className="mt-3 text-muted-foreground">
        Our liability for any claim connected to the classes or this website
        is limited to the fees you paid for the affected class period. We are
        not liable for indirect losses such as missed exams or job outcomes —
        learning results depend on practice as much as teaching.
      </p>

      <h2 className="mt-8 text-xl font-semibold">7. Governing law</h2>
      <p className="mt-3 text-muted-foreground">
        These terms are governed by the laws applicable in Somaliland
        (Somalia), without affecting consumer rights that local law grants
        you.
      </p>
      </div>
    </SeoShell>
  );
}
