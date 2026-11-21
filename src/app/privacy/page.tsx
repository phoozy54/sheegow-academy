import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | SHEEGOW ACADEMY",
  description:
    "How SHEEGOW ACADEMY collects, uses and protects your information when you use our website, contact us, or join live English classes.",
  alternates: { canonical: "https://www.sheegowacademy.com/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-muted-foreground">
        SHEEGOW ACADEMY (&quot;we&quot;) respects your privacy. This policy
        explains what we collect, why, and the choices you have. Questions?
        Email{" "}
        <a className="underline" href="mailto:info@sheegowacademy.com">
          info@sheegowacademy.com
        </a>
        . Last updated: 21 November 2026.
      </p>

      <h2 className="mt-8 text-xl font-semibold">1. What we collect</h2>
      <ul className="mt-3 space-y-2 text-muted-foreground">
        <li>
          <strong>Contact details you give us:</strong> name, email address,
          phone/WhatsApp number when you contact us or enrol in a class.
        </li>
        <li>
          <strong>Class information:</strong> your level, course, schedule and
          teacher feedback while you study with us.
        </li>
        <li>
          <strong>Basic technical data:</strong> our hosting provider (Vercel)
          processes standard request logs such as IP address and browser type
          for security and performance.
        </li>
        <li>
          <strong>Cookies:</strong> this site sets no advertising or tracking
          cookies. If a cookie-consent choice is stored on your device, it is
          stored locally in your browser only.
        </li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">2. How we use it</h2>
      <p className="mt-3 text-muted-foreground">
        We use your details to answer your questions, arrange your classes,
        send you schedule information, and improve our teaching. We do not
        sell your data, and we do not share it with advertisers.
      </p>

      <h2 className="mt-8 text-xl font-semibold">3. Services we rely on</h2>
      <p className="mt-3 text-muted-foreground">
        The website is hosted on Vercel. Course images are served via
        Cloudinary. Our on-site chat assistant is powered by a separate chat
        service; do not share payment details or sensitive documents in that
        chat — use WhatsApp or email for anything private. These providers
        process data only as needed to run the service.
      </p>

      <h2 className="mt-8 text-xl font-semibold">4. Live classes</h2>
      <p className="mt-3 text-muted-foreground">
        Live classes take place in video meetings. By joining a class you
        consent to the teacher and other students in that class seeing and
        hearing you. Recordings, if any, are used only for teaching quality
        and are never published without your permission.
      </p>

      <h2 className="mt-8 text-xl font-semibold">5. Your rights</h2>
      <p className="mt-3 text-muted-foreground">
        You can ask us at any time to confirm what we hold about you, correct
        it, or delete it. Email{" "}
        <a className="underline" href="mailto:info@sheegowacademy.com">
          info@sheegowacademy.com
        </a>{" "}
        and we will respond promptly.
      </p>

      <h2 className="mt-8 text-xl font-semibold">6. Children</h2>
      <p className="mt-3 text-muted-foreground">
        Classes for kids (ages 7-12) are enrolled by a parent or guardian. We
        ask for the minimum information needed and only use it to run the
        class.
      </p>

      <h2 className="mt-8 text-xl font-semibold">7. Changes</h2>
      <p className="mt-3 text-muted-foreground">
        If this policy changes materially, we will update this page and the
        date above.
      </p>
    </main>
  );
}
