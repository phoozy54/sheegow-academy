"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Course, LiveClass, User } from "@/lib/types";
import { useStore } from "@/lib/store";
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
} from "lucide-react";
import { toast } from "sonner";

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

export function AdminLive() {
  const openClass = useStore((s) => s.openClass);

  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<LiveFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [liveRes, courseRes, teacherRes] = await Promise.all([
        api.liveClasses().catch(() => ({ classes: [] as LiveClass[] })),
        api.courses({ limit: 50 }).catch(() => ({ items: [] as Course[] })),
        api.users({ role: "teacher" }).catch(() => ({ users: [] as User[] })),
      ]);
      setClasses(liveRes.classes);
      setCourses(courseRes.items);
      setTeachers(teacherRes.users);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to load live classes";
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
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Class title is required");
      return;
    }
    if (!form.scheduledAt) {
      toast.error("Scheduled date and time are required");
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
      const { liveClass } = await api.createLiveClass(body);
      toast.success(`Live class "${liveClass.title}" scheduled`);
      setFormOpen(false);
      await fetchAll();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to schedule class";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleStart(id: string) {
    setActioningId(id);
    try {
      await api.startLiveClass(id);
      toast.success("Live class started");
      await fetchAll();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to start class";
      toast.error(msg);
    } finally {
      setActioningId(null);
    }
  }

  async function handleEnd(id: string) {
    setActioningId(id);
    try {
      await api.endLiveClass(id);
      toast.success("Live class ended");
      await fetchAll();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to end class";
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
          Manage upcoming, live, and past classes.
        </p>
        <Button
          onClick={openCreate}
          className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Schedule Live Class
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
            No live classes yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click &quot;Schedule Live Class&quot; to create your first session.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sorted.map((c) => (
            <LiveClassCard
              key={c.id}
              liveClass={c}
              actioning={actioningId === c.id}
              onStart={handleStart}
              onEnd={handleEnd}
              onViewRoom={() => openClass(c.id)}
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
            <DialogTitle>Schedule Live Class</DialogTitle>
            <DialogDescription>
              Set up a new live class. Students will see it on the live page.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Class Title</Label>
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
              <Label htmlFor="description">Description (optional)</Label>
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
                <Label htmlFor="course">Linked Course</Label>
                <Select
                  value={form.courseId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, courseId: v }))
                  }
                >
                  <SelectTrigger id="course" className="w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No courses available
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
                <Label htmlFor="teacher">Teacher</Label>
                <Select
                  value={form.teacherId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, teacherId: v }))
                  }
                >
                  <SelectTrigger id="teacher" className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No teachers available
                      </div>
                    ) : (
                      teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.fullName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="scheduledAt">Scheduled At</Label>
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
                <Label htmlFor="duration">Duration (minutes)</Label>
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
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
              >
                {saving ? "Scheduling..." : "Schedule Class"}
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
  onViewRoom,
}: {
  liveClass: LiveClass;
  actioning: boolean;
  onStart: (id: string) => void;
  onEnd: (id: string) => void;
  onViewRoom: () => void;
}) {
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
          <Calendar className="h-3.5 w-3.5 text-indigo-500" />
          <div>
            <p className="font-medium text-foreground">
              {formatDateTime(c.scheduledAt)}
            </p>
            <p className="text-muted-foreground">Scheduled</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          <div>
            <p className="font-medium text-foreground">{c.duration} min</p>
            <p className="text-muted-foreground">Duration</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between border-t pt-3">
        {c.teacher ? (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={c.teacher.profilePicture || undefined} />
              <AvatarFallback className="bg-indigo-100 text-[10px] font-bold text-indigo-700">
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
            Unassigned
          </div>
        )}
        <Badge variant="outline" className="border-muted bg-muted/50">
          <UserCircle className="h-3 w-3" />
          {c.attendeeCount} attending
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
            View Room
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
            {actioning ? "Starting..." : "Start Now"}
          </Button>
        )}
        {isLive && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEnd(c.id)}
            disabled={actioning}
            className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
          >
            <Square className="h-3.5 w-3.5" />
            {actioning ? "Ending..." : "End Class"}
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
            View Recording
          </Button>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
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
        LIVE
      </Badge>
    );
  }
  if (status === "ended") {
    return (
      <Badge variant="outline" className="border-muted bg-muted text-muted-foreground">
        Ended
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-indigo-200 bg-indigo-50 text-indigo-700"
    >
      <Radio className="h-3 w-3" />
      Scheduled
    </Badge>
  );
}
