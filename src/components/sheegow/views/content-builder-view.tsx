"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import type { Course, Module } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  Hammer,
  Loader2,
  Plus,
  Upload,
  Video,
  FileText,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

type Curriculum = Awaited<ReturnType<typeof api.curriculum>>;

export function ContentBuilderView() {
  const { user } = useStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseId, setCourseId] = useState("");
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    let active = true;
    api
      .courses({ limit: 100 })
      .then((r) => {
        if (!active) return;
        const mine = isAdmin
          ? r.items
          : r.items.filter((c) => c.teacherId === user?.id);
        setCourses(mine);
        if (mine[0]) setCourseId(mine[0].id);
      })
      .catch(() => active && setCourses([]))
      .finally(() => active && setLoadingCourses(false));
    return () => {
      active = false;
    };
  }, [user?.id, isAdmin]);

  const loadCurriculum = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingCurriculum(true);
    try {
      const data = await api.curriculum(id);
      setCurriculum(data);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not load curriculum");
      setCurriculum(null);
    } finally {
      setLoadingCurriculum(false);
    }
  }, []);

  useEffect(() => {
    if (courseId) void loadCurriculum(courseId);
  }, [courseId, loadCurriculum]);

  const refresh = () => {
    if (courseId) void loadCurriculum(courseId);
  };

  if (loadingCourses) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Hammer className="mx-auto mb-3 h-10 w-10 text-indigo-400" />
        <h2 className="text-lg font-bold">No courses to build yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create or get assigned to a course first, then build its modules, lessons,
          quizzes and homework here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            Content Builder
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a real roadmap: modules, lessons, videos, PDFs, quizzes and homework.
          </p>
        </div>
        <div className="w-full sm:w-80">
          <Label className="mb-1 block text-xs">Course</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CreateModuleCard courseId={courseId} onCreated={refresh} />

      {loadingCurriculum ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : curriculum ? (
        <div className="space-y-4">
          {curriculum.roadmap.modules.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No modules yet. Create the first module above to start building the roadmap.
            </Card>
          ) : (
            curriculum.roadmap.modules.map((module, idx) => (
              <ModuleEditor
                key={module.id}
                module={module}
                index={idx}
                courseId={courseId}
                onRefresh={refresh}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function CreateModuleCard({ courseId, onCreated }: { courseId: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Plus className="h-4 w-4 text-indigo-600" /> Add module (unit)
      </h3>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Unit 1: Greetings & Introductions"
          className="sm:flex-1"
        />
        <Button
          disabled={busy || !title.trim() || !courseId}
          onClick={async () => {
            setBusy(true);
            try {
              await api.createModule(courseId, { title: title.trim(), isPublished: true });
              setTitle("");
              toast.success("Module created");
              onCreated();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not create module");
            } finally {
              setBusy(false);
            }
          }}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create module
        </Button>
      </div>
    </Card>
  );
}

function ModuleEditor({
  module,
  index,
  courseId,
  onRefresh,
}: {
  module: Module;
  index: number;
  courseId: string;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="overflow-hidden">
      <button
        className="flex w-full items-center justify-between gap-3 border-b p-4 text-left hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="text-xs font-bold uppercase text-indigo-500">Module {index + 1}</span>
          <span className="font-semibold">{module.title}</span>
          <Badge variant={module.isPublished ? "secondary" : "outline"}>
            {module.isPublished ? "Published" : "Draft"}
          </Badge>
          <Badge variant="outline">{module.lessons.length} lessons</Badge>
        </div>
      </button>

      {open && (
        <div className="space-y-4 p-4">
          {module.lessons.length > 0 && (
            <div className="space-y-2">
              {module.lessons.map((lesson) => (
                <div key={lesson.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {lesson.type === "video" ? (
                      <Video className="h-4 w-4 shrink-0 text-indigo-500" />
                    ) : lesson.type === "pdf" ? (
                      <FileText className="h-4 w-4 shrink-0 text-rose-500" />
                    ) : lesson.type === "quiz" ? (
                      <ClipboardList className="h-4 w-4 shrink-0 text-amber-600" />
                    ) : (
                      <BookOpen className="h-4 w-4 shrink-0 text-emerald-600" />
                    )}
                    <span className="truncate text-sm font-medium">{lesson.title}</span>
                    <Badge variant="outline" className="capitalize text-[10px]">{lesson.type}</Badge>
                    {lesson.isPreview && <Badge variant="secondary" className="text-[10px]">Preview</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <MaterialUploader lessonId={lesson.id} courseId={courseId} onDone={onRefresh} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await api.updateLesson(lesson.id, { isPublished: !lesson.isPublished });
                          toast.success(lesson.isPublished ? "Lesson hidden" : "Lesson published");
                          onRefresh();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Update failed");
                        }
                      }}
                    >
                      {lesson.isPublished ? "Unpublish" : "Publish"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <CreateLessonForm moduleId={module.id} onCreated={onRefresh} />
          <CreateQuizForm courseId={courseId} lessons={module.lessons} onCreated={onRefresh} />
          <CreateAssignmentForm courseId={courseId} lessons={module.lessons} onCreated={onRefresh} />
        </div>
      )}
    </Card>
  );
}

function CreateLessonForm({ moduleId, onCreated }: { moduleId: string; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [videoUrl, setVideoUrl] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-lg border border-dashed p-4">
      <p className="mb-3 text-sm font-semibold">Add lesson</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs">Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="pdf">PDF / Reading</SelectItem>
              <SelectItem value="text">Text / Notes</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
              <SelectItem value="assignment">Assignment</SelectItem>
              <SelectItem value="live">Live session</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Video URL (if video)</Label>
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Notes / content (markdown)</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Lesson notes, summary, or reading text" />
        </div>
      </div>
      <Button
        className="mt-3 gap-2"
        size="sm"
        disabled={busy || !title.trim()}
        onClick={async () => {
          setBusy(true);
          try {
            await api.createLesson(moduleId, {
              title: title.trim(),
              type: type as any,
              videoUrl: videoUrl.trim() || undefined,
              body: body.trim() || undefined,
              isPublished: true,
            });
            setTitle("");
            setVideoUrl("");
            setBody("");
            toast.success("Lesson created");
            onCreated();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not create lesson");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
        Add lesson
      </Button>
    </div>
  );
}

function MaterialUploader({
  lessonId,
  courseId,
  onDone,
}: {
  lessonId: string;
  courseId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <label className="inline-flex cursor-pointer items-center">
      <input
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,image/*,video/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            const sign = await api.signUpload({ courseId, lessonId, fileName: file.name });
            const form = new FormData();
            form.append("file", file);
            form.append("api_key", sign.apiKey);
            form.append("timestamp", String(sign.timestamp));
            form.append("signature", sign.signature);
            form.append("public_id", sign.publicId);
            form.append("folder", sign.folder);
            const upload = await fetch(sign.uploadUrl, { method: "POST", body: form });
            if (!upload.ok) throw new Error("Upload failed");
            const uploaded = (await upload.json()) as { secure_url?: string; bytes?: number };
            if (!uploaded.secure_url) throw new Error("Upload did not return a URL");
            await api.addMaterial(lessonId, {
              name: file.name,
              url: uploaded.secure_url,
              mimeType: file.type || "application/octet-stream",
              sizeBytes: uploaded.bytes ?? file.size,
            });
            toast.success("Material attached");
            onDone();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setBusy(false);
          }
        }}
      />
      <span className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium hover:bg-accent">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Attach file
      </span>
    </label>
  );
}

function CreateQuizForm({
  courseId,
  lessons,
  onCreated,
}: {
  courseId: string;
  lessons: Module["lessons"];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [busy, setBusy] = useState(false);

  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer text-sm font-semibold">Create quick quiz/test</summary>
      <div className="mt-3 grid gap-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
        <Select value={lessonId || "none"} onValueChange={(v) => setLessonId(v === "none" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Attach to lesson (optional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No lesson</SelectItem>
            {lessons.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question" rows={2} />
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct-opt" checked={correct === i} onChange={() => setCorrect(i)} />
              <Input
                value={opt}
                onChange={(e) => setOptions((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                placeholder={`Option ${i + 1}`}
              />
            </div>
          ))}
        </div>
        <Button
          size="sm"
          className="w-fit gap-2"
          disabled={busy || !title.trim() || !question.trim() || options.filter((o) => o.trim()).length < 2}
          onClick={async () => {
            setBusy(true);
            try {
              const choices = options
                .map((text, i) => ({ text: text.trim(), isCorrect: i === correct, order: i + 1 }))
                .filter((c) => c.text);
              await api.createQuiz(courseId, {
                title: title.trim(),
                lessonId: lessonId || undefined,
                isPublished: true,
                passScore: 70,
                maxAttempts: 3,
                questions: [{ type: "single", prompt: question.trim(), points: 1, order: 1, choices }],
              });
              setTitle("");
              setQuestion("");
              setOptions(["", "", "", ""]);
              toast.success("Quiz created");
              onCreated();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not create quiz");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
          Create quiz
        </Button>
      </div>
    </details>
  );
}

function CreateAssignmentForm({
  courseId,
  lessons,
  onCreated,
}: {
  courseId: string;
  lessons: Module["lessons"];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer text-sm font-semibold">Create homework / assignment</summary>
      <div className="mt-3 grid gap-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Homework title" />
        <Select value={lessonId || "none"} onValueChange={(v) => setLessonId(v === "none" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Attach to lesson (optional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No lesson</SelectItem>
            {lessons.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="Instructions for the student..."
        />
        <Button
          size="sm"
          className="w-fit gap-2"
          disabled={busy || !title.trim() || !instructions.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await api.createAssignment(courseId, {
                title: title.trim(),
                instructions: instructions.trim(),
                lessonId: lessonId || undefined,
                isPublished: true,
              });
              setTitle("");
              setInstructions("");
              toast.success("Homework created");
              onCreated();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not create homework");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
          Create homework
        </Button>
      </div>
    </details>
  );
}
