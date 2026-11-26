"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Course, LiveClass, User } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Video,
  Play,
  Square,
  ExternalLink,
  Calendar,
  Clock,
  UserCircle,
  Radio,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

interface LiveFormValues {
  title: string;
  description: string;
  courseId: string;
  teacherId: string;
  scheduledAt: string;
  duration: number;
}

function defaultScheduleDate(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000); // now + 1h
  d.setMinutes(0, 0, 0);
  // toISOString gives "YYYY-MM-DDTHH:mm:ss.sssZ"; we want "YYYY-MM-DDTHH:mm"
  return d.toISOString().slice(0, 16);
}

const EMPTY_FORM: LiveFormValues = {
  title: "",
  description: "",
  courseId: "",
  teacherId: "",
  scheduledAt: defaultScheduleDate(),
  duration: 60,
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminLive() {
  const t = useT();
  const router = useRouter();

  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LiveFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [liveRes, courseRes, teacherRes] = await Promise.all([
        api.liveClasses().catch(() => ({ classes: [] as LiveClass[] })),
        api.courses({ limit: 50 }).catch(() => ({ items: [] as Course[] })),
        api.users().catch(() => ({ users: [] as User[] })),
      ]);
      setClasses(liveRes.classes);
      setCourses(courseRes.items);
      // Include teaching admins so classes can be assigned to the founder.
      setTeachers(
        teacherRes.users.filter((u) =>
          ["teacher", "admin", "super_admin"].includes(u.role)
        )
      );
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("admin.live.loadFailed");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const sorted = useMemo(() => {
    const order: Record<string, number> = {
      live: 0,
      scheduled: 1,
      ended: 2,
    };
    return [...classes].sort((a, b) => {
      const so = order[a.status] ?? 3;
      const eo = order[b.status] ?? 3;
      if (so !== eo) return so - eo;
      return (
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    });
  }, [classes]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(c: LiveClass) {
    setEditingId(c.id);
    setForm({
      title: c.title,
      description: c.description ?? "",
      courseId: c.courseId ?? "",
      teacherId: c.teacherId ?? "",
      scheduledAt: toLocalInput(c.scheduledAt),
      duration: c.duration,
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error(t("admin.live.titleRequired"));
      return;
    }
    if (!form.scheduledAt) {
      toast.error(t("admin.live.dateRequired"));
      return;
    }
    setSaving(true);
    try {
      const iso = new Date(form.scheduledAt).toISOString();
      const body: Partial<LiveClass> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        courseId: form.courseId || null,
        teacherId: form.teacherId || null,
        scheduledAt: iso,
        duration: Number(form.duration) || 60,
      };
      const { liveClass } = editingId
        ? await api.updateLiveClass(editingId, body)
        : await api.createLiveClass(body);
      toast.success(
        editingId
          ? t("admin.live.updatedToast", { title: liveClass.title })
          : t("admin.live.scheduledToast", { title: liveClass.title })
      );
      setFormOpen(false);
      await fetchAll();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("admin.live.scheduleFailed");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleStart(id: string) {
    setActioningId(id);
    try {
      await api.startLiveClass(id);
      toast.success(t("admin.live.startedToast"));
      await fetchAll();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("admin.live.startFailed");
      toast.error(msg);
    } finally {
      setActioningId(null);
    }
  }

  async function handleEnd(id: string) {
    setActioningId(id);
    try {
      await api.endLiveClass(id);
      toast.success(t("admin.live.endedToast"));
      await fetchAll();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("admin.live.endFailed");
      toast.error(msg);
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("admin.live.intro")}
        </p>
        <Button
          onClick={openCreate}
          className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          {t("admin.live.scheduleLiveClass")}
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {t("admin.live.noClasses")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("admin.live.noClassesDesc")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sorted.map((c) => (
            <LiveClassCard
              key={c.id}
              liveClass={c}
              actioning={actioningId === c.id}
              onStart={handleStart}
              onEnd={handleEnd}
              onEdit={() => openEdit(c)}
              onViewRoom={() => router.push(`/class/${c.id}`)}
            />
          ))}
        </div>
      )}

      {/* Schedule dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && !saving) setFormOpen(false);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("admin.live.editTitle") : t("admin.live.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? t("admin.live.editDesc")
                : t("admin.live.createDesc")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">{t("admin.live.labelTitle")}</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Conversation Practice: Daily Routines"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">{t("admin.live.labelDesc")}</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What will students learn in this session?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="course">{t("admin.live.labelCourse")}</Label>
                <Select
                  value={form.courseId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, courseId: v }))
                  }
                >
                  <SelectTrigger id="course" className="w-full">
                    <SelectValue placeholder={t("admin.live.noneOption")} />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        {t("admin.live.noCoursesAvailable")}
                      </div>
                    ) : (
                      courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teacher">{t("admin.live.labelTeacher")}</Label>
                <Select
                  value={form.teacherId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, teacherId: v }))
                  }
                >
                  <SelectTrigger id="teacher" className="w-full">
                    <SelectValue placeholder={t("admin.live.unassignedOption")} />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        {t("admin.live.noTeachersAvailable")}
                      </div>
                    ) : (
                      teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.fullName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="scheduledAt">{t("admin.live.labelScheduledAt")}</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scheduledAt: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">{t("admin.live.labelDuration")}</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  max={240}
                  step={15}
                  value={form.duration}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      duration: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                {t("admin.live.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                {saving
                  ? editingId
                    ? t("admin.live.saving")
                    : t("admin.live.scheduling")
                  : editingId
                    ? t("admin.live.saveChanges")
                    : t("admin.live.scheduleClass")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LiveClassCard({
  liveClass,
  actioning,
  onStart,
  onEnd,
  onEdit,
  onViewRoom,
}: {
  liveClass: LiveClass;
  actioning: boolean;
  onStart: (id: string) => void;
  onEnd: (id: string) => void;
  onEdit: () => void;
  onViewRoom: () => void;
}) {
  const t = useT();
  const c = liveClass;
  const isLive = c.status === "live";
  const isEnded = c.status === "ended";

  return (
    <Card
      className={cn(
        "card-lift relative overflow-hidden p-5",
        isLive && "border-red-200 ring-1 ring-red-200"
      )}
    >
      {isLive && (
        <span className="absolute right-0 top-0 h-20 w-20 -translate-y-10 translate-x-10 rounded-full bg-red-500/10" />
      )}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-foreground">
            {c.title}
          </h3>
          {c.course && (
            <p className="truncate text-xs text-muted-foreground">
              {c.course.title}
            </p>
          )}
        </div>
        <StatusBadge status={c.status} />
      </div>

      {c.description && (
        <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
          {c.description}
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-emerald-500" />
          <div>
            <p className="font-medium text-foreground">
              {formatDateTime(c.scheduledAt)}
            </p>
            <p className="text-muted-foreground">{t("admin.live.scheduled")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <div>
            <p className="font-medium text-foreground">{c.duration} min</p>
            <p className="text-muted-foreground">{t("admin.live.duration")}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between border-t pt-3">
        {c.teacher ? (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={c.teacher.profilePicture || undefined} />
              <AvatarFallback className="bg-emerald-100 text-[10px] font-bold text-emerald-700">
                {c.teacher.fullName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs font-medium">
              {c.teacher.fullName}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserCircle className="h-4 w-4" />
            {t("admin.live.unassigned")}
          </div>
        )}
        <Badge variant="outline" className="border-muted bg-muted/50">
          <UserCircle className="h-3 w-3" />
          {t("admin.live.attending", { count: c.attendeeCount })}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {isLive && (
          <Button
            size="sm"
            variant="default"
            onClick={onViewRoom}
            className="gap-1.5 bg-red-600 hover:bg-red-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("admin.live.viewRoom")}
          </Button>
        )}
        {!isEnded && !isLive && (
          <Button
            size="sm"
            onClick={() => onStart(c.id)}
            disabled={actioning}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            <Play className="h-3.5 w-3.5" />
            {actioning ? t("admin.live.starting") : t("admin.live.startNow")}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="gap-1.5"
        >
          <Pencil className="h-3.5 w-3.5" />
          {t("admin.live.edit")}
        </Button>
        {isLive && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEnd(c.id)}
            disabled={actioning}
            className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
          >
            <Square className="h-3.5 w-3.5" />
            {actioning ? t("admin.live.ending") : t("admin.live.endClass")}
          </Button>
        )}
        {isEnded && (
          <Button
            size="sm"
            variant="outline"
            onClick={onViewRoom}
            className="gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("admin.live.viewRecording")}
          </Button>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useT();
  if (status === "live") {
    return (
      <Badge
        variant="outline"
        className="border-red-200 bg-red-50 text-red-700"
      >
        <span className="relative mr-1 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        {t("admin.live.liveBadge")}
      </Badge>
    );
  }
  if (status === "ended") {
    return (
      <Badge variant="outline" className="border-muted bg-muted text-muted-foreground">
        {t("admin.live.endedBadge")}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-emerald-200 bg-emerald-50 text-emerald-700"
    >
      <Radio className="h-3 w-3" />
      {t("admin.live.scheduledBadge")}
    </Badge>
  );
}
