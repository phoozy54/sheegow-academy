import type { Metadata } from "next";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { ContactView } from "@/components/sheegow/views/contact-view";
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
      <ContactView />
    </SeoShell>
  );
}
