import type { Metadata } from "next";
import {
  SeoShell,
} from "@/components/sheegow/seo/seo-shell";
import { CoursesView } from "@/components/sheegow/views/courses-view";
import {
  absoluteUrl,
  coursePath,
  getPublicCourses,
  organizationJsonLd,
  pageMeta,
} from "@/lib/seo";

// Courses live in the database — render on request so names/descriptions are
// present in the server HTML without requiring a database during `next build`.
export const dynamic = "force-dynamic";

const PATH = "/courses";

export const metadata: Metadata = pageMeta({
  title: "Live English Courses for Everyone | SHEEGOW ACADEMY",
  description:
    "Explore live online English courses for learners everywhere: beginners, IELTS, business, kids and advanced. Learn with a real teacher, wherever you are.",
  path: PATH,
});

export default async function CoursesPage() {
  const courses = await getPublicCourses();

  const listJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Live English courses",
    url: absoluteUrl(PATH),
    numberOfItems: courses.length,
    itemListElement: courses.map((course, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: course.title,
      url: absoluteUrl(coursePath(course, courses)),
    })),
  };

  return (
    <SeoShell jsonLd={[organizationJsonLd(), listJsonLd]}>
      <CoursesView />
    </SeoShell>
  );
}
