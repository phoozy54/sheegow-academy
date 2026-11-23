import type { Metadata } from "next";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { AboutView } from "@/components/sheegow/views/about-view";
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
      <AboutView />
    </SeoShell>
  );
}
