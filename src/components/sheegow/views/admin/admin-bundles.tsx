"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { BundleWithCourses, Course } from "@/lib/types";
import {
  cn,
  formatPrice,
  formatDate,
  levelBadgeClass,
} from "@/lib/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Package,
  PackageCheck,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface BundleFormValues {
  title: string;
  description: string;
  price: number;
  image: string;
  courseIds: string[];
  isActive: boolean;
}

const EMPTY_FORM: BundleFormValues = {
  title: "",
  description: "",
  price: 99,
  image: "",
  courseIds: [],
  isActive: true,
};

/** Admin bundles view — list, create, edit, delete course bundles.
 *  Mirrors the layout of AdminCourses (toolbar + table + dialog form). */
export function AdminBundles() {
  const [bundles, setBundles] = useState<BundleWithCourses[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BundleWithCourses | null>(null);
  const [form, setForm] = useState<BundleFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchBundles() {
    setLoading(true);
    try {
      const r = await api.bundles();
      setBundles(r.bundles ?? []);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to load bundles";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCourses() {
    try {
      // Admin sees all courses for selection in the form.
      const r = await api.courses({ limit: 100 });
      setCourses(r.items);
    } catch {
      // Best-effort: silent failure, form will just have no courses to pick.
    }
  }

  useEffect(() => {
    fetchBundles();
    fetchCourses();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bundles;
    return bundles.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }, [bundles, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(b: BundleWithCourses) {
    setEditing(b);
    setForm({
      title: b.title,
      description: b.description,
      price: b.price,
      image: b.image ?? "",
      courseIds: b.courses.map((c) => c.id),
      isActive: b.isActive,
    });
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Bundle title is required");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Bundle description is required");
      return;
    }
    if (!(form.price >= 1)) {
      toast.error("Price must be at least $1");
      return;
    }
    if (form.courseIds.length === 0) {
      toast.error("Select at least one course for the bundle");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price) || 0,
        image: form.image.trim() || undefined,
        courseIds: form.courseIds,
        isActive: form.isActive,
      };
      if (editing) {
        const { bundle } = await api.updateBundle(editing.id, body);
        toast.success(`Bundle "${bundle.title}" updated`);
      } else {
        const { bundle } = await api.createBundle(body);
        toast.success(`Bundle "${bundle.title}" created`);
      }
      setFormOpen(false);
      await fetchBundles();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to save bundle";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteBundle(deleteId);
      toast.success("Bundle deleted");
      setDeleteId(null);
      await fetchBundles();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to delete bundle";
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
            placeholder="Search bundles by title..."
            className="pl-9"
            aria-label="Search bundles"
          />
        </div>
        <Button
          onClick={openCreate}
          className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 shadow-md shadow-amber-500/30 hover:from-amber-600 hover:to-amber-700 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Create Bundle
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="p-3 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 sm:h-10 sm:w-10">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-foreground sm:text-2xl">
                {bundles.length}
              </p>
              <p className="text-xs text-muted-foreground">Total bundles</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:h-10 sm:w-10">
              <PackageCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-foreground sm:text-2xl">
                {bundles.filter((b) => b.isActive).length}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:h-10 sm:w-10">
              <Check className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-foreground sm:text-2xl">
                {bundles.reduce((sum, b) => sum + b.courses.length, 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total bundle enrollments offered
              </p>
            </div>
          </div>
        </Card>
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
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {search ? "No bundles match your search" : "No bundles yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {search
                ? "Try a different search term."
                : 'Click "Create Bundle" to add your first course package.'}
            </p>
          </div>
        ) : (
          <div className="-mx-3 overflow-x-auto sm:mx-0">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] pl-4">Bundle</TableHead>
                  <TableHead className="min-w-[90px]">Courses</TableHead>
                  <TableHead className="min-w-[100px]">Price</TableHead>
                  <TableHead className="hidden min-w-[100px] md:table-cell">
                    Original total
                  </TableHead>
                  <TableHead className="hidden min-w-[100px] md:table-cell">
                    Savings
                  </TableHead>
                  <TableHead className="hidden min-w-[120px] lg:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="min-w-[90px]">Status</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => {
                  const hasDiscount = b.savings > 0;
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                            {b.image ? (
                              <img
                                loading="lazy"
                                decoding="async"
                                src={b.image}
                                alt={b.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-indigo-200">
                                <Package className="h-4 w-4 text-amber-500" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {b.title}
                            </p>
                            <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">
                              {b.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-amber-700"
                        >
                          {b.courses.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {formatPrice(b.price)}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {formatPrice(b.originalTotal)}
                      </TableCell>
                      <TableCell className="hidden text-xs md:table-cell">
                        {hasDiscount ? (
                          <span className="font-semibold text-emerald-700">
                            -{formatPrice(b.savings)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {formatDate(b.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            b.isActive
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-muted-foreground/30 bg-muted text-muted-foreground"
                          }
                        >
                          {b.isActive ? "Active" : "Hidden"}
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
                              <span className="sr-only">
                                Open bundle actions
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(b)}>
                              <Pencil className="h-4 w-4" />
                              Edit bundle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(
                                  `/checkout/bundle/${b.id}`,
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                            >
                              <Package className="h-4 w-4" />
                              Preview checkout
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-700"
                              onClick={() => setDeleteId(b.id)}
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

      {/* Create / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              {editing ? "Edit bundle" : "Create new bundle"}
            </DialogTitle>
            <DialogDescription>
              Group multiple courses into a discounted package. Students buy the
              bundle once and get enrolled in every included course.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="bundle-title">Bundle title</Label>
              <Input
                id="bundle-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="IELTS Preparation Bundle"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="bundle-desc">Description</Label>
              <Textarea
                id="bundle-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="A complete IELTS preparation pathway: reading, writing, speaking and listening."
                rows={3}
                required
              />
            </div>

            {/* Price + image */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bundle-price">
                  Bundle price (USD)
                  {form.courseIds.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      Original total:{" "}
                      <span className="font-semibold">
                        {formatPrice(
                          form.courseIds
                            .map((id) => courses.find((c) => c.id === id))
                            .filter((c): c is Course => !!c)
                            .reduce((sum, c) => sum + c.price, 0)
                        )}
                      </span>
                    </span>
                  )}
                </Label>
                <Input
                  id="bundle-price"
                  type="number"
                  min={1}
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price: Number(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bundle-image">Image URL (optional)</Label>
                <Input
                  id="bundle-image"
                  value={form.image}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, image: e.target.value }))
                  }
                  placeholder="https://res.cloudinary.com/.../bundle.jpg"
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Active (visible to students)
                </p>
                <p className="text-xs text-muted-foreground">
                  Hidden bundles are invisible on the public courses page.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, isActive: v }))
                }
                aria-label="Toggle bundle visibility"
              />
            </div>

            {/* Course selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Included courses</Label>
                <span className="text-xs text-muted-foreground">
                  {form.courseIds.length} selected
                </span>
              </div>
              {courses.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-muted/30 p-4 text-xs text-muted-foreground">
                  No courses found. Create courses first.
                </p>
              ) : (
                <ScrollArea className="h-64 rounded-lg border">
                  <ul className="divide-y">
                    {courses.map((c) => {
                      const selected = form.courseIds.includes(c.id);
                      return (
                        <li key={c.id}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-accent/50",
                              selected && "bg-amber-50/60"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => {
                                setForm((f) => ({
                                  ...f,
                                  courseIds: e.target.checked
                                    ? [...f.courseIds, c.id]
                                    : f.courseIds.filter((id) => id !== c.id),
                                }));
                              }}
                              className="sr-only"
                            />
                            <span
                              className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                                selected
                                  ? "border-amber-600 bg-amber-600 text-white"
                                  : "border-muted-foreground/30"
                              )}
                            >
                              {selected && <Check className="h-3 w-3" />}
                            </span>
                            <div className="h-9 w-12 shrink-0 overflow-hidden rounded bg-muted">
                              {c.image ? (
                                <img
                                  loading="lazy"
                                  decoding="async"
                                  src={c.image}
                                  alt={c.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                {c.title}
                              </p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`border ${levelBadgeClass(c.level)}`}
                                >
                                  {c.level}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {c.duration} weeks
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-foreground">
                              {formatPrice(c.price)}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              )}
            </div>

            {/* Live savings preview */}
            {form.courseIds.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Original total (sum of course prices)
                  </span>
                  <span className="font-medium">
                    {formatPrice(
                      form.courseIds
                        .map((id) => courses.find((c) => c.id === id))
                        .filter((c): c is Course => !!c)
                        .reduce((sum, c) => sum + c.price, 0)
                    )}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Bundle price</span>
                  <span className="font-medium">{formatPrice(form.price)}</span>
                </div>
                <div className="mt-1 flex justify-between text-emerald-700">
                  <span className="inline-flex items-center gap-1">
                    <PackageCheck className="h-3.5 w-3.5" />
                    Student savings
                  </span>
                  <span className="font-semibold">
                    {formatPrice(
                      Math.max(
                        0,
                        form.courseIds
                          .map((id) => courses.find((c) => c.id === id))
                          .filter((c): c is Course => !!c)
                          .reduce((sum, c) => sum + c.price, 0) - form.price
                      )
                    )}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackageCheck className="h-4 w-4" />
                )}
                {editing ? "Save changes" : "Create bundle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              The bundle will be permanently removed. Students who already
              purchased it keep their enrollments — only the bundle listing is
              deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2 bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete bundle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
