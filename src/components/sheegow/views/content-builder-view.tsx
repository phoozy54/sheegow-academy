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
  Lock,
  Plus,
  Upload,
  Video,
  FileText,
  ClipboardList,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { formatDateTime } from "@/lib/ui";

type Curriculum = Awaited<ReturnType<typeof api.curriculum>>;

export function ContentBuilderView() {
  const t = useT();
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
        <h2 className="text-lg font-bold">{t("contentBuilder.noCourses")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("contentBuilder.noCoursesDesc")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            {t("contentBuilder.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("contentBuilder.desc")}
          </p>
        </div>
        <div className="w-full sm:w-80">
          <Label className="mb-1 block text-xs">{t("contentBuilder.course")}</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger>
              <SelectValue placeholder={t("contentBuilder.selectCourse")} />
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
              {t("contentBuilder.noModules")}
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
  const t = useT();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Plus className="h-4 w-4 text-indigo-600" /> {t("contentBuilder.addModule")}
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
  const t = useT();
  const [open, setOpen] = useState(true);

  return (
    <Card className="overflow-hidden">
      <button
        className="flex w-full items-center justify-between gap-3 border-b p-4 text-left hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="text-xs font-bold uppercase text-indigo-500">{t("contentBuilder.module")} {index + 1}</span>
          <span className="font-semibold">{module.title}</span>
          <Badge variant={module.isPublished ? "secondary" : "outline"}>
            {module.isPublished ? t("contentBuilder.published") : t("contentBuilder.draft")}
          </Badge>
          <Badge variant="outline">{module.lessons.length} {t("contentBuilder.lessons")}</Badge>
        </div>
      </button>

      {open && (
        <div className="space-y-4 p-4">
          {module.lessons.length > 0 && (
            <div className="space-y-2">
              {module.lessons.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  courseId={courseId}
                  onRefresh={onRefresh}
                />
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

/** Format a Date as a `datetime-local`-compatible string (YYYY-MM-DDTHH:MM). */
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function LessonRow({
  lesson,
  courseId,
  onRefresh,
}: {
  lesson: Module["lessons"][number];
  courseId: string;
  onRefresh: () => void;
}) {
  const t = useT();
  const [editingUnlock, setEditingUnlock] = useState(false);
  const [unlockValue, setUnlockValue] = useState("");
  const [savingUnlock, setSavingUnlock] = useState(false);

  const unlockAt = lesson.unlockAt ? new Date(lesson.unlockAt) : null;
  const isLocked = !!unlockAt && unlockAt.getTime() > Date.now();

  const startEditUnlock = () => {
    setUnlockValue(unlockAt ? toDatetimeLocalValue(unlockAt) : "");
    setEditingUnlock(true);
  };

  const saveUnlock = async () => {
    setSavingUnlock(true);
    try {
      // Empty value clears the schedule (lesson becomes immediately available).
      const payload = unlockValue
        ? new Date(unlockValue).toISOString()
        : null;
      await api.updateLesson(lesson.id, { unlockAt: payload } as any);
      toast.success(t("contentBuilder.unlockSaved"));
      setEditingUnlock(false);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save unlock date");
    } finally {
      setSavingUnlock(false);
    }
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {lesson.type === "video" ? (
            <Video className="h-4 w-4 shrink-0 text-indigo-500" />
          ) : lesson.type === "pdf" ? (
            <FileText className="h-4 w-4 shrink-0 text-rose-500" />
          ) : lesson.type === "quiz" ? (
            <ClipboardList className="h-4 w-4 shrink-0 text-amber-600" />
          ) : (
            <BookOpen className="h-4 w-4 shrink-0 text-indigo-600" />
          )}
          <span className="truncate text-sm font-medium">{lesson.title}</span>
          <Badge variant="outline" className="capitalize text-[10px]">{lesson.type}</Badge>
          {lesson.isPreview && <Badge variant="secondary" className="text-[10px]">Preview</Badge>}
          {unlockAt && (
            <Badge
              variant="outline"
              className={`gap-1 text-[10px] ${
                isLocked
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : "border-indigo-300 bg-indigo-50 text-indigo-700"
              }`}
            >
              {isLocked ? <Lock className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
              {t("contentBuilder.lockedUntil", { date: formatDateTime(unlockAt.toISOString()) })}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={startEditUnlock}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {unlockAt ? t("contentBuilder.editUnlock") : t("contentBuilder.scheduleUnlock")}
          </Button>
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
            {lesson.isPublished ? t("contentBuilder.unpublish") : t("contentBuilder.publish")}
          </Button>
        </div>
      </div>

      {editingUnlock && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dashed bg-muted/30 p-3">
          <div className="min-w-[220px] flex-1">
            <Label className="mb-1 block text-xs">{t("contentBuilder.unlockDate")}</Label>
            <Input
              type="datetime-local"
              value={unlockValue}
              onChange={(e) => setUnlockValue(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("contentBuilder.unlockDateHint")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setUnlockValue("");
              }}
              disabled={savingUnlock}
            >
              {t("contentBuilder.clearUnlock")}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
              onClick={saveUnlock}
              disabled={savingUnlock}
            >
              {savingUnlock ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t("contentBuilder.saveUnlock")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingUnlock(false)}
              disabled={savingUnlock}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateLessonForm({ moduleId, onCreated }: { moduleId: string; onCreated: () => void }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [videoUrl, setVideoUrl] = useState("");
  const [body, setBody] = useState("");
  const [unlockAt, setUnlockAt] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-lg border border-dashed p-4">
      <p className="mb-3 text-sm font-semibold">{t("contentBuilder.addLesson")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs">{t("contentBuilder.lessonTitle")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
        </div>
        <div>
          <Label className="text-xs">{t("contentBuilder.type")}</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="video">{t("contentBuilder.video")}</SelectItem>
              <SelectItem value="pdf">{t("contentBuilder.pdfReading")}</SelectItem>
              <SelectItem value="text">{t("contentBuilder.textNotes")}</SelectItem>
              <SelectItem value="quiz">{t("contentBuilder.quiz")}</SelectItem>
              <SelectItem value="assignment">{t("contentBuilder.assignment")}</SelectItem>
              <SelectItem value="live">{t("contentBuilder.liveSession")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{t("contentBuilder.videoUrl")}</Label>
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">{t("contentBuilder.notesContent")}</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Lesson notes, summary, or reading text" />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">{t("contentBuilder.unlockDate")}</Label>
          <Input
            type="datetime-local"
            value={unlockAt}
            onChange={(e) => setUnlockAt(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("contentBuilder.unlockDateHint")}
          </p>
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
              // Send the unlock date as ISO string when set; omit otherwise.
              ...(unlockAt
                ? { unlockAt: new Date(unlockAt).toISOString() }
                : {}),
            } as any);
            setTitle("");
            setVideoUrl("");
            setBody("");
            setUnlockAt("");
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
        {t("contentBuilder.addLessonBtn")}
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
  const t = useT();
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
  const t = useT();
  const [title, setTitle] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [busy, setBusy] = useState(false);

  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer text-sm font-semibold">{t("contentBuilder.createQuiz")}</summary>
      <div className="mt-3 grid gap-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
        <Select value={lessonId || "none"} onValueChange={(v) => setLessonId(v === "none" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder={t("contentBuilder.attachToLesson")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("contentBuilder.noLesson")}</SelectItem>
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
  const t = useT();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer text-sm font-semibold">{t("contentBuilder.createHomework")}</summary>
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
