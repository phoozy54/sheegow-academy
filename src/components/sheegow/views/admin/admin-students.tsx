"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn, formatDate, levelBadgeClass } from "@/lib/ui";
import { normalizeSomaliPhone } from "@/lib/phone";
import { PhoneInput } from "../../phone-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Users,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "IELTS", "Kids"];

type RoleFilter = "all" | "student" | "teacher" | "admin" | "super_admin";

interface EditForm {
  fullName: string;
  email: string;
  phone: string;
  level: string;
}

export function AdminStudents() {
  const user = useStore((s) => s.user);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    fullName: "",
    email: "",
    phone: "",
    level: "Beginner",
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params =
        roleFilter === "all" ? {} : { role: roleFilter };
      const r = await api.users(params);
      setUsers(r.users);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to load users";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  function openEdit(u: User) {
    setEditing(u);
    setEditForm({
      fullName: u.fullName,
      email: u.email,
      phone: normalizeSomaliPhone(u.phone ?? ""),
      level: u.level,
    });
    setEditOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.fullName.trim() || !editForm.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const body: Partial<User> = {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        level: editForm.level,
      };
      await api.updateUser(editing.id, body);
      toast.success("User updated");
      setEditOpen(false);
      await fetchUsers();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to update user";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: User) {
    try {
      await api.updateUser(u.id, { isActive: !u.isActive });
      toast.success(`${u.fullName} ${u.isActive ? "deactivated" : "activated"}`);
      await fetchUsers();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to update status";
      toast.error(msg);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteUser(deleteId);
      toast.success("User deleted");
      setDeleteId(null);
      await fetchUsers();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to delete user";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  const counts = useMemo(() => {
    const map: Record<RoleFilter, number> = {
      all: users.length,
      student: 0,
      teacher: 0,
      admin: 0,
      super_admin: 0,
    };
    // Note: counts reflect the currently loaded list (filtered by role).
    // We still want to show a count next to the current tab.
    map[roleFilter] = users.length;
    return map;
  }, [users, roleFilter]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
        <Tabs
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as RoleFilter)}
        >
          <TabsList className="w-full justify-start overflow-x-auto whitespace-nowrap sm:w-auto">
            <TabsTrigger value="all" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              All
              <span className="ml-1 rounded bg-muted-foreground/10 px-1.5 text-[10px] font-bold">
                {counts.all}
              </span>
            </TabsTrigger>
            <TabsTrigger value="student" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              Students
            </TabsTrigger>
            <TabsTrigger value="teacher" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Teachers
            </TabsTrigger>
            <TabsTrigger value="admin">Admins</TabsTrigger>
            <TabsTrigger value="super_admin">Super Admins</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {search ? "No users match your search" : "No users found"}
            </p>
            <p className="text-xs text-muted-foreground">
              {search
                ? "Try a different search term."
                : "Users will appear here once they register."}
            </p>
          </div>
        ) : (
          <div className="-mx-3 overflow-x-auto sm:mx-0">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] pl-4">User</TableHead>
                  <TableHead className="hidden min-w-[120px] md:table-cell">Contact</TableHead>
                  <TableHead className="min-w-[90px]">Role</TableHead>
                  <TableHead className="hidden min-w-[110px] lg:table-cell">Level</TableHead>
                  <TableHead className="hidden min-w-[110px] md:table-cell">Joined</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {filtered.map((u) => {
                const isSelf = user?.id === u.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.profilePicture || undefined} />
                          <AvatarFallback
                            className={cn(
                              "text-xs font-bold",
                              u.role === "super_admin"
                                ? "bg-fuchsia-100 text-fuchsia-700"
                                : u.role === "admin"
                                  ? "bg-amber-100 text-amber-700"
                                  : u.role === "teacher"
                                    ? "bg-indigo-100 text-indigo-700"
                                    : "bg-emerald-100 text-emerald-700"
                            )}
                          >
                            {u.fullName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {u.fullName}
                            {isSelf && (
                              <span className="ml-2 text-xs font-medium text-indigo-600">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {u.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border",
                          u.role === "super_admin"
                            ? "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                            : u.role === "admin"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : u.role === "teacher"
                                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                : "border-muted bg-muted text-muted-foreground"
                        )}
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge
                        variant="outline"
                        className={cn("border", levelBadgeClass(u.level))}
                      >
                        {u.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          u.isActive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }
                      >
                        <span
                          className={cn(
                            "mr-1 h-1.5 w-1.5 rounded-full",
                            u.isActive ? "bg-emerald-500" : "bg-red-500"
                          )}
                        />
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open user actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleActive(u)}
                            disabled={isSelf}
                          >
                            {u.isActive ? (
                              <>
                                <UserX className="h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(u.id)}
                            disabled={isSelf}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </Card>

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open && !saving) setEditOpen(false);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update profile details for {editing?.fullName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={editForm.fullName}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, fullName: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <PhoneInput
                  id="phone"
                  value={editForm.phone}
                  onChange={(phone) =>
                    setEditForm((f) => ({ ...f, phone }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="level">Level</Label>
                <Select
                  value={editForm.level}
                  onValueChange={(v) =>
                    setEditForm((f) => ({ ...f, level: v }))
                  }
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
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
              >
                {saving ? "Saving..." : "Save Changes"}
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
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user account and all related
              data will be permanently removed.
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
