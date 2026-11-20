import Link from "next/link";
import { CheckCircle2, MessageCircle, Phone, Mail, MapPin } from "lucide-react";
import { Navbar } from "@/components/sheegow/navbar";
import { Footer } from "@/components/sheegow/footer";
import { CookieConsent } from "@/components/sheegow/cookie-consent";
import { NAP, jsonLdScript } from "@/lib/seo";

export function SeoShell({
  children,
  jsonLd,
}: {
  children: React.ReactNode;
  jsonLd?: unknown[];
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {jsonLd?.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(jsonLd)}
        />
      ) : null}
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
    </div>
  );
}

export function SeoHero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <section className="border-b bg-gradient-to-b from-indigo-50/70 to-background">
      <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
          {eyebrow}
        </p>
        <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          {lead}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/courses"
            className="inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-colors hover:bg-indigo-700"
          >
            Browse live courses
          </Link>
          <a
            href={NAP.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300 bg-background px-6 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          >
            <MessageCircle className="h-4 w-4" />
            Ask on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

export function SeoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <h2 className="mb-5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function BulkList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm leading-relaxed text-muted-foreground"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function FaqSection({
  items,
}: {
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <section className="border-t bg-muted/30">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Su’aalaha caadiga ah / Common questions
        </h2>
        <div className="space-y-4">
          {items.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border bg-card p-4 sm:p-5"
            >
              <summary className="cursor-pointer list-none text-base font-semibold text-foreground marker:hidden">
                {faq.question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SeoContact() {
  return (
    <section className="border-t">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="mb-5 text-2xl font-bold tracking-tight text-foreground">
          Contact SHEEGOW ACADEMY
        </h2>
        <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <li className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-indigo-500" />
            <a href={`mailto:${NAP.email}`} className="hover:text-indigo-600">
              {NAP.email}
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-indigo-500" />
            <a href={NAP.phoneHref} className="hover:text-indigo-600">
              {NAP.phone}
            </a>
          </li>
          <li className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 shrink-0 text-emerald-500" />
            <a href={NAP.whatsapp} className="hover:text-emerald-600">
              WhatsApp
            </a>
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-indigo-500" />
            <span>{NAP.address}</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
