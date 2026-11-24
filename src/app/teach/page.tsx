import type { Metadata } from "next";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { TeachView } from "@/components/sheegow/views/teach-view";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title:
    "Become a Teacher at SHEEGOW ACADEMY | Teach English to Somali Learners",
  description:
    "Apply to become a teacher at SHEEGOW ACADEMY. Teach live English classes to thousands of Somali learners worldwide, set your own hours and earn money.",
  path: "/teach",
});

export default function TeachPage() {
  return (
    <SeoShell>
      <TeachView />
    </SeoShell>
  );
}
