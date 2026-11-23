import { notFound, redirect } from "next/navigation";
import { coursePath, getPublicCourses } from "@/lib/seo";

// Render at request time so newly created courses resolve without a rebuild.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/**
 * Internal redirect route used by in-app navigation that only knows the
 * course ID (e.g. dashboard lists). Resolves the SEO slug and 302-redirects
 * to the canonical /courses/[slug] URL so there is a single addressable page
 * per course.
 */
export default async function CourseByIdPage({ params }: Props) {
  const { id } = await params;
  const all = await getPublicCourses();
  const course = all.find((c) => c.id === id);
  if (!course) notFound();
  redirect(coursePath(course, all));
}
