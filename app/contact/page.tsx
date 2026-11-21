import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact SHEEGOW ACADEMY | WhatsApp, Phone & Email",
  description:
    "Talk to a real person at SHEEGOW ACADEMY: WhatsApp +252 63 4085151, phone, or email info@sheegowacademy.com. We answer questions about classes, levels and schedules.",
  alternates: { canonical: "https://www.sheegowacademy.com/contact" },
  openGraph: {
    title: "Contact SHEEGOW ACADEMY",
    description:
      "WhatsApp, phone or email — a real person answers your questions about live English classes.",
    url: "https://www.sheegowacademy.com/contact",
    siteName: "SHEEGOW ACADEMY",
    locale: "en_US",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Contact us</h1>
      <p className="mt-6 text-muted-foreground">
        Do you have a question about which class fits your level, when lessons
        run, or how payment works? Contact us directly — you will talk to a
        real person, not a bot.
      </p>
      <div className="mt-8 space-y-6">
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">WhatsApp (fastest)</h2>
          <p className="mt-2 text-muted-foreground">
            Message us any time:{" "}
            <a
              className="underline"
              href="https://wa.me/252634085151"
              rel="noopener noreferrer"
              target="_blank"
            >
              +252 63 4085151 on WhatsApp
            </a>
            . Tell us your current level and your goal, and we will recommend a
            class.
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Email</h2>
          <p className="mt-2 text-muted-foreground">
            <a className="underline" href="mailto:info@sheegowacademy.com">
              info@sheegowacademy.com
            </a>{" "}
            — for enrolment, invoices, school and company enquiries.
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Phone</h2>
          <p className="mt-2 text-muted-foreground">
            <a className="underline" href="tel:+252634085151">
              +252 63 4085151
            </a>{" "}
            — during class hours; WhatsApp is more reliable outside them.
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Location</h2>
          <p className="mt-2 text-muted-foreground">
            Hargeisa, Somaliland (Somalia). Classes themselves run online —
            join from anywhere.
          </p>
        </div>
      </div>
      <p className="mt-8 text-muted-foreground">
        Ready to start? Browse the{" "}
        <a className="underline" href="/courses">
          live English courses
        </a>{" "}
        and pick your level, or ask us on WhatsApp and we will pick it for you.
      </p>
    </main>
  );
}
