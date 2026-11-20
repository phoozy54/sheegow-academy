"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Course, User } from "@/lib/types";
import {
  cn,
  formatPrice,
  levelBadgeClass,
} from "@/lib/ui";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  BookOpen,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

const LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "IELTS",
  "Kids",
] as const;

interface CourseFormValues {
  title: string;
  description: string;
  level: string;
  price: number;
  duration: number;
  image: string;
  teacherId: string;
  whatYouLearn: string;
}

const EMPTY_FORM: CourseFormValues = {
  title: "",
  description: "",
  level: "Beginner",
  price: 29,
  duration: 4,
  image: "",
  teacherId: "",
  whatYouLearn: "",
};

export function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchCourses() {
    setLoading(true);
    try {
      const r = await api.courses({ limit: 50 });
      setCourses(r.items);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to load courses";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTeachers() {
    try {
      const r = await api.users({ role: "teacher" });
      setTeachers(r.users);
    } catch {
      // silent — teachers list is best-effort
    }
  }

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [courses, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(c: Course) {
    setEditing(c);
    setForm({
      title: c.title,
      description: c.description,
      level: c.level,
      price: c.price,
      duration: c.duration,
      image: c.image ?? "",
      teacherId: c.teacherId ?? "",
      whatYouLearn: c.whatYouLearn ?? "",
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Course title is required");
      return;
    }
    setSaving(true);
    try {
      const body: Partial<Course> = {
        title: form.title.trim(),
        description: form.description.trim(),
        level: form.level,
        price: Number(form.price) || 0,
        duration: Number(form.duration) || 1,
        image: form.image.trim() || null,
        teacherId: form.teacherId || null,
        whatYouLearn: form.whatYouLearn.trim() || null,
      };
      if (editing) {
        const { course } = await api.updateCourse(editing.id, body);
        toast.success(`Course "${course.title}" updated`);
      } else {
        const { course } = await api.createCourse(body);
        toast.success(`Course "${course.title}" created`);
      }
      setFormOpen(false);
      await fetchCourses();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to save course";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteCourse(deleteId);
      toast.success("Course deleted");
      setDeleteId(null);
      await fetchCourses();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to delete course";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses by title..."
            className="pl-9"
          />
        </div>
        <Button
          onClick={openCreate}
          className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Create Course
        </Button>
      </div>

      {/* Table */}
      <Card className="p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {search ? "No courses match your search" : "No courses yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {search
                ? "Try a different search term."
                : "Click \"Create Course\" to add your first course."}
            </p>
          </div>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] pl-4">Course</TableHead>
                  <TableHead className="min-w-[100px]">Level</TableHead>
                  <TableHead className="min-w-[90px]">Price</TableHead>
                  <TableHead className="hidden min-w-[80px] md:table-cell">Duration</TableHead>
                  <TableHead className="hidden min-w-[140px] lg:table-cell">Teacher</TableHead>
                  <TableHead className="hidden min-w-[90px] md:table-cell">Status</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                          {c.image ? (
                            <img loading="lazy" decoding="async"
                              src={c.image}
                              alt={c.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Play className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {c.title}
                          </p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {c.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("border", levelBadgeClass(c.level))}
                      >
                        {c.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatPrice(c.price).replace("$", "")}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{c.duration}w</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {c.teacher ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={c.teacher.profilePicture || undefined}
                            />
                            <AvatarFallback className="bg-indigo-100 text-[10px] font-bold text-indigo-700">
                              {c.teacher.fullName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-xs">
                            {c.teacher.fullName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={
                          c.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-muted bg-muted text-muted-foreground"
                        }
                      >
                        {c.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open course actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(c);
                              setForm({
                                title: c.title,
                                description: c.description,
                                level: c.level,
                                price: c.price,
                                duration: c.duration,
                                image: c.image ?? "",
                                teacherId: c.teacherId ?? "",
                                whatYouLearn: c.whatYouLearn ?? "",
                              });
                              setFormOpen(true);
                            }}
                          >
                            <DollarSign className="h-4 w-4" />
                            {"Change Price"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Create / Edit dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && !saving) setFormOpen(false);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Course" : "Create New Course"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the course details below."
                : "Fill in the course details to publish a new course."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. English Conversation for Beginners"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What is this course about?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="level">Level</Label>
                <Select
                  value={form.level}
                  onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}
                >
                  <SelectTrigger id="level" className="w-full">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (weeks)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  max={52}
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

            {/* ─── Pricing section — admin/teacher sets the price ─── */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <DollarSign className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Course Pricing
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Set the price students pay to enroll
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Price (USD)</Label>
                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      min={1}
                      step="0.01"
                      value={form.price}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          price: Math.max(1, Number(e.target.value)),
                        }))
                      }
                      className="pl-9 text-lg font-bold"
                    />
                  </div>
                </div>
                {/* Quick price presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "$19", value: 19 },
                    { label: "$29", value: 29 },
                    { label: "$39", value: 39 },
                    { label: "$49", value: 49 },
                    { label: "$59", value: 59 },
                    { label: "$79", value: 79 },
                    { label: "$99", value: 99 },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, price: preset.value }))
                      }
                      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                        form.price === preset.value
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-border bg-background text-muted-foreground hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Students pay this amount via Card, Zaad Service, or Edahab.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="teacher">Assigned Teacher</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="image">Image URL (optional)</Label>
              <Input
                id="image"
                type="url"
                value={form.image}
                onChange={(e) =>
                  setForm((f) => ({ ...f, image: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatYouLearn">What You&apos;ll Learn</Label>
              <Textarea
                id="whatYouLearn"
                value={form.whatYouLearn}
                onChange={(e) =>
                  setForm((f) => ({ ...f, whatYouLearn: e.target.value }))
                }
                placeholder={"One bullet per line\nBuild conversational confidence\nMaster everyday vocabulary"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                One bullet point per line.
              </p>
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
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save Changes"
                    : "Create Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The course and all related
              enrollments will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
