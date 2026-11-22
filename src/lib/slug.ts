/** Client-safe URL helpers. Keep in sync with server-side course URLs. */
export function slugify(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      // Course titles imported from the DB can contain mojibake for em dashes.
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "course"
  );
}

type SlugCourse = { id: string; title: string };

/** Stable URL segment per course, de-duplicated against the active catalog. */
export function courseSlug(course: SlugCourse, all: SlugCourse[]): string {
  const base = slugify(course.title);
  const taken = new Set(all.map((c) => slugify(c.title)));
  const duplicates = all.filter((c) => slugify(c.title) === base);
  if (duplicates.length <= 1 && !taken.has(`${base}-2`)) return base;
  const index = duplicates.findIndex((c) => c.id === course.id);
  return index > 0 ? `${base}-${index + 1}` : base;
}

export function coursePath(course: SlugCourse, all: SlugCourse[]): string {
  return `/courses/${courseSlug(course, all)}`;
}
