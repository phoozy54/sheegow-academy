import type { Metadata } from "next";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { LeaderboardView } from "@/components/sheegow/views/leaderboard-view";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Student Leaderboard | SHEEGOW ACADEMY",
  description:
    "The top 10 students at SHEEGOW ACADEMY ranked by points. Earn points by completing lessons, passing quizzes and attending live classes.",
  path: "/leaderboard",
});

export default function Page() {
  return (
    <SeoShell>
      <LeaderboardView />
    </SeoShell>
  );
}
