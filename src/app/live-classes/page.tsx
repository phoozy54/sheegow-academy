import type { Metadata } from "next";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { LiveClassesView } from "@/components/sheegow/views/live-classes-view";
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
      <LiveClassesView />
    </SeoShell>
  );
}
