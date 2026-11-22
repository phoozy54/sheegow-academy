import Link from "next/link";
import { ArrowRight, Clock3, Sparkles, UserRound } from "lucide-react";
import { coursePath, readable, type SeoCourse } from "@/lib/seo";

export function CourseSeoGrid({
  courses,
  all,
}: {
  courses: SeoCourse[];
  all: SeoCourse[];
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => {
        const path = coursePath(course, all);
        return (
          <article
            key={course.id}
            className="card-lift group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm"
          >
            <Link href={path} className="relative block aspect-[16/10] overflow-hidden bg-muted">
              {course.image ? (
                <img
                  src={course.image}
                  alt={readable(course.title)}
                  width={640}
                  height={400}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-amber-100">
                  <Sparkles className="h-10 w-10 text-indigo-400" />
                </div>
              )}
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                <span className="rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm backdrop-blur">
                  {readable(course.level)}
                </span>
                <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  Live course
                </span>
              </div>
            </Link>
            <div className="flex flex-1 flex-col p-5">
              <p className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {course.duration} weeks</span>
                <span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> {readable(course.teacher?.fullName) || "Expert teacher"}</span>
              </p>
              <h3 className="mt-3 text-lg font-bold leading-snug text-foreground">
                <Link href={path} className="hover:text-indigo-600 hover:underline">
                  {readable(course.title)}
                </Link>
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {readable(course.description)}
              </p>
              <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                <div className="text-sm">
                  {typeof course.price === "number" && course.price > 0 ? (
                    <span className="font-bold text-foreground">${course.price} <span className="text-xs font-normal text-muted-foreground">USD</span></span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Price at checkout</span>
                  )}
                </div>
                <Link
                  href={path}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  View course <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
