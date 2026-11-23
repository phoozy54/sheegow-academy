"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Announcement } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Megaphone,
  Send,
  Trash2,
  Loader2,
  ChevronDown,
  LockKeyhole,
  Plus,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateTime, timeAgo } from "@/lib/ui";

interface AnnouncementsPanelProps {
  courseId: string;
  /** True for teachers/admins — they can post and delete announcements. */
  canManage: boolean;
  /** Compact mode renders a tighter card stack (used inside the player). */
  compact?: boolean;
  /** When false, the panel is collapsed by default. */
  defaultOpen?: boolean;
}

/**
 * Shared announcements widget. Used in two places:
 *  - The course detail page (collapsible, starts closed)
 *  - The course player view (open by default, used as a section)
 *
 * Both views mount the component with the same `courseId`. The component
 * owns its own data lifecycle so mounting it twice does not duplicate state.
 */
export function AnnouncementsPanel({
  courseId,
  canManage,
  compact = false,
  defaultOpen = true,
}: AnnouncementsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New-announcement form state. Only shown to managers and only when the
  // "post" affordance is expanded.
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.announcements(courseId);
      setItems(res.announcements);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not load announcements";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      toast.error("Add a title and a body for your announcement.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.createAnnouncement(courseId, { title: t, body: b });
      setItems((prev) => [res.announcement, ...prev]);
      setTitle("");
      setBody("");
      setShowForm(false);
      setOpen(true);
      toast.success("Announcement posted.");
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not post announcement"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement? Students will no longer see it.")) return;
    try {
      await api.deleteAnnouncement(courseId, id);
      setItems((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement deleted.");
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not delete announcement"
      );
    }
  };

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            "bg-indigo-100 text-indigo-600"
          )}
        >
          <Megaphone className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-base font-bold text-foreground">Announcements</h3>
          <p className="text-xs text-muted-foreground">
            Updates from your teacher for this course
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canManage && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? (
              <>
                <span className="hidden sm:inline">Cancel</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Post
              </>
            )}
          </Button>
        )}
        <CollapsibleTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-muted-foreground hover:text-foreground"
            aria-label={open ? "Collapse announcements" : "Expand announcements"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                open ? "rotate-180" : "rotate-0"
              )}
            />
          </Button>
        </CollapsibleTrigger>
      </div>
    </div>
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <Card
        className={cn(
          "p-5",
          compact ? "p-4" : "p-5"
        )}
      >
        {header}

        {canManage && showForm && (
          <div className="mt-4 space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              maxLength={300}
              className="bg-background"
              aria-label="Announcement title"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share an update with your students — schedule changes, new materials, exam tips…"
              rows={4}
              maxLength={20_000}
              className="bg-background"
              aria-label="Announcement body"
            />
            <div className="flex justify-end">
              <Button
                onClick={() => void submit()}
                disabled={submitting || !title.trim() || !body.trim()}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Publish announcement
              </Button>
            </div>
          </div>
        )}

        <CollapsibleContent>
          <div className="mt-4 space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </>
            ) : error ? (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">{error}</p>
                  <p className="mt-1 text-xs text-amber-700">
                    Enroll in this course to see announcements from your teacher.
                  </p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
                <MessageCircle className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  No announcements yet
                </p>
                <p className="text-xs text-muted-foreground">
                  {canManage
                    ? "Post your first announcement to keep students informed."
                    : "Your teacher has not posted any announcements yet."}
                </p>
              </div>
            ) : (
              items.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  canDelete={canManage}
                  onDelete={() => void remove(a.id)}
                />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function AnnouncementCard({
  announcement,
  canDelete,
  onDelete,
}: {
  announcement: Announcement;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const author = announcement.author;
  return (
    <Card className="overflow-hidden border-l-4 border-l-indigo-300 p-0">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold leading-tight text-foreground">
              {announcement.title}
            </h4>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
              {announcement.body}
            </p>
          </div>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-600"
              onClick={onDelete}
              aria-label="Delete announcement"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          {author && (
            <>
              <Avatar className="h-6 w-6">
                <AvatarImage src={author.profilePicture || undefined} />
                <AvatarFallback className="bg-indigo-100 text-[9px] font-bold text-indigo-700">
                  {author.fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">
                {author.fullName}
              </span>
              <span>·</span>
            </>
          )}
          <span title={formatDateTime(announcement.createdAt)}>
            {timeAgo(announcement.createdAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
