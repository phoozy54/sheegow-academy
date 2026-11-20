import type { Metadata } from "next";
import Link from "next/link";
import {
  CourseSeoGrid,
} from "@/components/sheegow/seo/course-seo-grid";
import { SeoContact, SeoHero, SeoSection, SeoShell } from "@/components/sheegow/seo/seo-shell";
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
  title: "Live English Courses for Somalis | SHEEGOW ACADEMY",
  description:
    "Explore live online English courses for Somali learners: beginners, IELTS, business, kids and advanced. Learn with a real teacher from Hargeisa.",
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
      <SeoHero
        eyebrow="English classes for Somalis"
        title="Live English courses built for Somali learners"
        lead="Beginner conversation, IELTS, business English and more — every course is a real-time interactive video class with a teacher, not a recording. Join from Hargeisa or anywhere in the world."
      />
      <SeoSection title="Choose your course">
        {courses.length > 0 ? (
          <CourseSeoGrid courses={courses} all={courses} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Courses are being prepared. Contact us on WhatsApp for the current
            schedule.
          </p>
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          Want the full interactive experience?{" "}
          <Link href="/?view=courses" className="font-semibold text-indigo-600 hover:underline">
            Open the course catalog in the app →
          </Link>
        </p>
      </SeoSection>
      <SeoContact />
    </SeoShell>
  );
}
