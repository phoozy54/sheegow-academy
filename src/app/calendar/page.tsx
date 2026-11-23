import type { Metadata } from "next";
import { SeoShell } from "@/components/sheegow/seo/seo-shell";
import { CalendarView } from "@/components/sheegow/views/calendar-view";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Class Calendar | SHEEGOW ACADEMY",
  description:
    "See every upcoming live English class on one monthly calendar. Live now, scheduled and recently ended sessions — never miss a class.",
  path: "/calendar",
});

export default function CalendarPage() {
  return (
    <SeoShell>
      <CalendarView />
    </SeoShell>
  );
}
