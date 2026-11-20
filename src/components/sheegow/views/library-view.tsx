"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Library,
  Loader2,
  LogIn,
} from "lucide-react";

type LibraryData = Awaited<ReturnType<typeof api.library>>;

export function LibraryView() {
  const { user, authLoading, openAuthModal, openPlayer, navigate } = useStore();
  const [data, setData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api.library()
      .then((r) => { if (active) setData(r); })
      .catch(() => { if (active) setData({ courses: [] }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  if (authLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <LogIn className="mx-auto mb-3 h-8 w-8 text-indigo-500" />
        <h1 className="text-xl font-bold">Log in to open your library</h1>
        <Button className="mt-4" onClick={() => openAuthModal("login")}>Log in</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate("dashboard")}>
          ← Dashboard
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          <Library className="h-7 w-7 text-indigo-500" /> My Library
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every lesson, book and PDF you are entitled to — revisit any time while your access is active.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !data?.courses.length ? (
        <Card className="p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-indigo-400" />
          <h2 className="font-bold">Your library is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">Enroll in a course to start collecting materials.</p>
          <Button className="mt-4" onClick={() => navigate("courses")}>Browse courses</Button>
        </Card>
      ) : (
        <div className="space-y-5">
          {data.courses.map((course) => {
            const lessons = course.modules.flatMap((m) => m.lessons);
            const materials = lessons.flatMap((l) => l.materials || []);
            return (
              <Card key={course.courseId} className="overflow-hidden">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      {course.image ? (
                        <img src={course.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                          <BookOpen className="h-5 w-5 text-indigo-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-bold">{course.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {lessons.length} lessons · {materials.length} files · {course.percent}% complete
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary"><CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />{course.percent}%</Badge>
                      <span className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
                    </div>
                  </summary>
                  <div className="border-t p-5">
                    <Button size="sm" className="mb-4 gap-2 bg-indigo-600" onClick={() => openPlayer(course.courseId)}>
                      <BookOpen className="h-4 w-4" /> Continue course
                    </Button>
                    <div className="space-y-5">
                      {course.modules.map((module) => (
                        <div key={module.id}>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-500">{module.title}</p>
                          <div className="space-y-2">
                            {module.lessons.map((lesson) => (
                              <div key={lesson.id} className="rounded-lg border p-3">
                                <button
                                  className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium hover:text-indigo-700"
                                  onClick={() => openPlayer(course.courseId)}
                                >
                                  <span>{lesson.title}</span>
                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    {lesson.progress?.[0]?.status === "completed" ? "✓ done" : lesson.type}
                                  </span>
                                </button>
                                {lesson.materials && lesson.materials.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {lesson.materials.map((m) => (
                                      <a
                                        key={m.id}
                                        href={m.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium hover:bg-indigo-50 hover:text-indigo-700"
                                      >
                                        <FileText className="h-3.5 w-3.5" /> {m.name} <Download className="h-3 w-3" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
