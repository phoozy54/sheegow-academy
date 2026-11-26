"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Course, User } from "@/lib/types";
import { cn, levelBadgeClass } from "@/lib/ui";
import { normalizeSomaliPhone } from "@/lib/phone";
import { PhoneInput } from "../../phone-input";
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
  Mail,
  Phone,
  Pencil,
  BookOpen,
  GraduationCap,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "IELTS", "Kids"];

interface TeacherForm {
  fullName: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  bio: string;
  level: string;
}

const EMPTY_FORM: TeacherForm = {
  fullName: "",
  email: "",
  username: "",
  phone: "",
  password: "",
  bio: "",
  level: "Intermediate",
};

export function AdminTeachers() {
  const t = useT();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<TeacherForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Add teacher dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<TeacherForm>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);

  // View profile dialog
  const [viewing, setViewing] = useState<User | null>(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [teacherRes, courseRes] = await Promise.all([
        api.users(),
        api.courses({ limit: 50 }).catch(() => ({ items: [] as Course[] })),
      ]);
      // The founder/super admin also teaches every course. Show all teaching
      // roles so the teacher directory never looks empty.
      setTeachers(
        teacherRes.users.filter((u) =>
          ["teacher", "admin", "super_admin"].includes(u.role)
        )
      );
      setCourses(courseRes.items);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("admin.teachers.loadFailed");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const courseCountByTeacher = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of courses) {
      if (c.teacherId) {
        map[c.teacherId] = (map[c.teacherId] ?? 0) + 1;
      }
    }
    return map;
  }, [courses]);

  function openEdit(t: User) {
    setEditing(t);
    setForm({
      fullName: t.fullName,
      email: t.email,
      username: t.username ?? "",
      phone: normalizeSomaliPhone(t.phone ?? ""),
      password: "",
      bio: t.bio ?? "",
      level: t.level,
    });
    setEditOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error(t("admin.teachers.nameEmailRequired"));
      return;
    }
    setSaving(true);
    try {
      await api.updateUser(editing.id, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        username: form.username.trim() || undefined,
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        level: form.level,
      });
      toast.success(t("admin.teachers.teacherUpdatedToast"));
      setEditOpen(false);
      await fetchAll();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("admin.teachers.updateFailed");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    setAddForm(EMPTY_FORM);
    setAddOpen(true);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.fullName.trim() || !addForm.email.trim()) {
      toast.error(t("admin.teachers.nameEmailRequired"));
      return;
    }
    if (addForm.password.length < 6) {
      toast.error(t("admin.teachers.passwordMin"));
      return;
    }
    setAdding(true);
    try {
      await api.createUser({
        fullName: addForm.fullName.trim(),
        email: addForm.email.trim(),
        username: addForm.username.trim() || undefined,
        phone: addForm.phone.trim() || undefined,
        password: addForm.password,
        role: "teacher",
        level: addForm.level,
        bio: addForm.bio.trim() || undefined,
      });
      toast.success(t("admin.teachers.teacherCreatedToast"));
      setAddOpen(false);
      await fetchAll();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("admin.teachers.createFailed");
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t("admin.teachers.intro")}
        </p>
        <Button
          onClick={openAdd}
          className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/30 hover:from-indigo-600 hover:to-indigo-700 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          {t("admin.teachers.addTeacher")}
        </Button>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <GraduationCap className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {t("admin.teachers.noTeachers")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("admin.teachers.noTeachersDesc")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => {
            const courseCount = courseCountByTeacher[teacher.id] ?? 0;
            return (
              <Card key={teacher.id} className="card-lift flex flex-col p-5">
                <div className="mb-3 flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={teacher.profilePicture || undefined} />
                    <AvatarFallback className="bg-indigo-100 text-sm font-bold text-indigo-700">
                      {teacher.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-foreground">
                      {teacher.fullName}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn("border", levelBadgeClass(teacher.level))}
                    >
                      {teacher.level}
                    </Badge>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      teacher.isActive
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-muted bg-muted text-muted-foreground"
                    }
                  >
                    {teacher.isActive ? t("admin.teachers.active") : t("admin.teachers.inactive")}
                  </Badge>
                </div>

                <div className="mb-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{teacher.email}</span>
                  </div>
                  {teacher.username && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserCircle className="h-3.5 w-3.5" />
                      <span className="truncate">@{teacher.username}</span>
                    </div>
                  )}
                  {teacher.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{teacher.phone}</span>
                    </div>
                  )}
                </div>

                <p className="mb-4 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {teacher.bio || t("admin.teachers.noBio")}
                </p>

                <div className="mb-4 flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                      <BookOpen className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {courseCount}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {courseCount === 1 ? t("admin.teachers.courseSingular") : t("admin.teachers.coursePlural")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewing(teacher)}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                  >
                    <UserCircle className="h-3.5 w-3.5" />
                    {t("admin.teachers.viewProfile")}
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => openEdit(teacher)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("admin.teachers.editTeacher")}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open && !saving) setEditOpen(false);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.teachers.editTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.teachers.editDesc", { name: editing?.fullName ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">{t("admin.teachers.fullName")}</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">{t("admin.teachers.loginUsername")}</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
                placeholder="ahmed.hassan"
                minLength={3}
                maxLength={30}
              />
              <p className="text-[11px] text-muted-foreground">
                {t("admin.teachers.usernameHint")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("admin.teachers.emailAddress")}</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t("admin.teachers.phone")}</Label>
                <PhoneInput
                  id="phone"
                  value={form.phone}
                  onChange={(phone) =>
                    setForm((f) => ({ ...f, phone }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="level">{t("admin.teachers.level")}</Label>
                <Select
                  value={form.level}
                  onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}
                >
                  <SelectTrigger id="level" className="w-full">
                    <SelectValue placeholder={t("admin.teachers.selectLevel")} />
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">{t("admin.teachers.bio")}</Label>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: e.target.value }))
                }
                placeholder={t("admin.teachers.bioPlaceholder")}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                {t("admin.teachers.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
              >
                {saving ? t("admin.teachers.saving") : t("admin.teachers.saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add teacher dialog (demo) */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!open && !adding) setAddOpen(false);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.teachers.addTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.teachers.addDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">
            {t("admin.teachers.addInfoNote")}
          </div>
          <form onSubmit={handleAddSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-fullName">{t("admin.teachers.addFullName")}</Label>
              <Input
                id="add-fullName"
                value={addForm.fullName}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, fullName: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-username">{t("admin.teachers.addUsername")}</Label>
              <Input
                id="add-username"
                value={addForm.username}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, username: e.target.value }))
                }
                placeholder="ahmed.hassan"
                minLength={3}
                maxLength={30}
              />
              <p className="text-[11px] text-muted-foreground">
                {t("admin.teachers.addUsernameHint")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-email">{t("admin.teachers.addEmail")}</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-password">{t("admin.teachers.addPassword")}</Label>
              <Input
                id="add-password"
                type="password"
                autoComplete="new-password"
                value={addForm.password}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder={t("admin.teachers.passwordPlaceholder")}
                minLength={6}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-phone">{t("admin.teachers.addPhone")}</Label>
                <PhoneInput
                  id="add-phone"
                  value={addForm.phone}
                  onChange={(phone) =>
                    setAddForm((f) => ({ ...f, phone }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-level">{t("admin.teachers.addLevel")}</Label>
                <Select
                  value={addForm.level}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, level: v }))}
                >
                  <SelectTrigger id="add-level" className="w-full">
                    <SelectValue placeholder={t("admin.teachers.selectLevel")} />
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-bio">{t("admin.teachers.addBio")}</Label>
              <Textarea
                id="add-bio"
                value={addForm.bio}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, bio: e.target.value }))
                }
                placeholder={t("admin.teachers.addBioPlaceholder")}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={adding}
              >
                {t("admin.teachers.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={adding}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
              >
                {adding ? t("admin.teachers.creating") : t("admin.teachers.createTeacher")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View profile dialog */}
      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.teachers.profileTitle")}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={viewing.profilePicture || undefined} />
                  <AvatarFallback className="bg-indigo-100 text-lg font-bold text-indigo-700">
                    {viewing.fullName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-foreground">
                    {viewing.fullName}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn("border", levelBadgeClass(viewing.level))}
                  >
                    {viewing.level}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{viewing.email}</span>
                </div>
                {viewing.username && (
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    <span>@{viewing.username}</span>
                  </div>
                )}
                {viewing.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{viewing.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {t("admin.teachers.assignedCourses", { count: courseCountByTeacher[viewing.id] ?? 0 })}
                  </span>
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">
                  {t("admin.teachers.bioLabel")}
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  {viewing.bio || t("admin.teachers.noBio")}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewing(null)}
              className="w-full"
            >
              {t("admin.teachers.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
