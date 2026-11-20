import type { Metadata } from "next";
import { KeywordLanding } from "@/components/sheegow/seo/keyword-landing";
import { LANDING_PAGES } from "@/lib/landing-copy";
import { getPublicCourses, pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

const config = LANDING_PAGES["english-classes-for-somalis"];
export const metadata: Metadata = pageMeta({
  title: config.metaTitle,
  description: config.metaDescription,
  path: config.path,
});

export default async function Page() {
  return <KeywordLanding config={config} courses={await getPublicCourses()} />;
}
