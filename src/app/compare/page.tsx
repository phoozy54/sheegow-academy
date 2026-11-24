import type { Metadata } from "next";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { CompareView } from "@/components/sheegow/views/compare-view";
import { pageMeta } from "@/lib/seo";

const PATH = "/compare";

export const metadata: Metadata = pageMeta({
  title: "Compare Courses | SHEEGOW ACADEMY",
  description:
    "Compare live English courses side-by-side — price, duration, level, teacher, rating, what you'll learn and more. Choose the right course for you.",
  path: PATH,
});

// The compare page reads course ids from localStorage on the client, so it
// cannot be statically rendered. Force dynamic so we always serve a shell.
export const dynamic = "force-dynamic";

export default function ComparePage() {
  return (
    <SeoShell>
      <CompareView />
    </SeoShell>
  );
}
