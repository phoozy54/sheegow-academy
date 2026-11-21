import Link from "next/link";
import { Clock3, UserRound } from "lucide-react";
import { coursePath, readable, type SeoCourse } from "@/lib/seo";

export function CourseSeoGrid({
  courses,
  all,
}: {
  courses: SeoCourse[];
  all: SeoCourse[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <article
          key={course.id}
          className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <span className="mb-3 w-fit rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            {readable(course.level)}
          </span>
          <h3 className="text-lg font-bold leading-snug text-foreground">
            <Link
              href={coursePath(course, all)}
              className="hover:text-indigo-600 hover:underline"
            >
              {readable(course.title)}
            </Link>
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
            {readable(course.description)}
          </p>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" /> {course.duration} weeks
            <span className="mx-1 text-border">•</span>
            <UserRound className="h-3.5 w-3.5" />
            {readable(course.teacher?.fullName) || "Ciise Mohamed Sheeq"}
          </p>
          <div className="mt-4 flex items-center justify-end gap-3 border-t pt-4">
            <Link
              href={coursePath(course, all)}
              className="inline-flex min-h-9 items-center rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              View course
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
