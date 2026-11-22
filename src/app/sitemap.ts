import type { MetadataRoute } from "next";
import { LANDING_PAGES } from "@/lib/landing-copy";
import { absoluteUrl, coursePath, getPublicCourses } from "@/lib/seo";

// Render at request time so newly created courses appear without a rebuild.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    "/",
    "/courses",
    "/about",
    "/contact",
    "/live-classes",
    "/investors",
    "/privacy",
    "/terms",
    ...Object.values(LANDING_PAGES).map((page) => page.path),
  ];

  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: absoluteUrl(path),
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));

  try {
    const courses = await getPublicCourses();
    for (const course of courses) {
      entries.push({
        url: absoluteUrl(coursePath(course, courses)),
        lastModified: course.updatedAt,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch {
    // If the database is temporarily unavailable, still serve the static map.
  }

  return entries;
}
