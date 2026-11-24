"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type {
  DiscussionReply,
  DiscussionThreadSummary,
  Lesson,
} from "@/lib/types";
import { useStore } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  MessageSquare,
  Send,
  Trash2,
  Loader2,
  ChevronDown,
  LockKeyhole,
  Plus,
  CheckCircle2,
  HelpCircle,
  CornerDownRight,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDateTime, timeAgo } from "@/lib/ui";
import { useT } from "@/lib/i18n";

interface DiscussionPanelProps {
  courseId: string;
  /** True for teachers/admins — controls "manage" affordances only. */
  canManage?: boolean;
  /** Compact layout (used inside the course player). */
  compact?: boolean;
  /** Optional flat list of lessons used for the "lesson select" dropdown. */
  lessons?: Lesson[];
  /** Optional filter: when set, only threads tied to this lesson show. */
  filterLessonId?: string;
  /** Default collapse state on the course detail page. */
  defaultOpen?: boolean;
}

type FilterTab = "all" | "unresolved" | "resolved";

/**
 * Shared discussion widget. Used in two places:
 *  - The course detail page (collapsible, starts closed)
 *  - The course player view (open by default, used as a section)
 *
 * The component owns its own data lifecycle and reloads when `courseId`
 * changes. Both views mounting the same component never duplicates state.
 */
export function DiscussionPanel({
  courseId,
  canManage = false,
  compact = false,
  lessons = [],
  filterLessonId,
  defaultOpen = true,
}: DiscussionPanelProps) {
  const t = useT();
  const { user, authLoading, openAuthModal } = useStore();
  const [open, setOpen] = useState(defaultOpen);
  const [filter, setFilter] = useState<FilterTab>("all");

  const [threads, setThreads] = useState<DiscussionThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New-thread form state.
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);

  // Expanded thread + replies state. Only one thread is expanded at a time.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<
    | { replies: DiscussionReply[]; isResolved: boolean; loading: boolean }
    | null
  >(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replying, setReplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.threads(courseId);
      setThreads(res.threads);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not load discussions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [load, authLoading]);

  // Refresh expanded thread detail when expandedId changes.
  useEffect(() => {
    if (!expandedId) {
      setExpandedDetail(null);
      return;
    }
    let cancelled = false;
    setExpandedDetail({ replies: [], isResolved: false, loading: true });
    api
      .thread(courseId, expandedId)
      .then((r) => {
        if (cancelled) return;
        setExpandedDetail({
          replies: r.thread.replies,
          isResolved: r.thread.isResolved,
          loading: false,
        });
        setReplyDraft("");
      })
      .catch((e) => {
        if (cancelled) return;
        const msg =
          e instanceof ApiError ? e.message : "Could not load this thread";
        toast.error(msg);
        setExpandedDetail({ replies: [], isResolved: false, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, expandedId]);

  const visibleThreads = useMemo(() => {
    let list = threads;
    if (filter === "unresolved") list = list.filter((t) => !t.isResolved);
    if (filter === "resolved") list = list.filter((t) => t.isResolved);
    if (filterLessonId) {
      list = list.filter((t) => t.lessonId === filterLessonId);
    }
    return list;
  }, [threads, filter, filterLessonId]);

  const submit = async () => {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      toast.error("Add a title and a body for your question.");
      return;
    }
    setSubmitting(true);
    try {
      const lessonId = selectedLessonId !== "none" ? selectedLessonId : undefined;
      const res = await api.createThread(courseId, {
        title: t,
        body: b,
        lessonId,
      });
      // Re-fetch to keep sort/order consistent with the API.
      await load();
      setExpandedId(res.thread.id);
      setTitle("");
      setBody("");
      setSelectedLessonId("none");
      setShowForm(false);
      setOpen(true);
      toast.success("Question posted.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not post your question");
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!expandedId) return;
    const text = replyDraft.trim();
    if (!text) {
      toast.error("Type a reply first.");
      return;
    }
    setReplying(true);
    try {
      const res = await api.replyToThread(courseId, expandedId, { body: text });
      setExpandedDetail((prev) =>
        prev
          ? {
              ...prev,
              replies: [...prev.replies, res.reply],
              loading: false,
            }
          : prev
      );
      setReplyDraft("");
      // Bump reply count + last activity in the summary list.
      setThreads((prev) =>
        prev.map((t) =>
          t.id === expandedId
            ? {
                ...t,
                replyCount: t.replyCount + 1,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not post your reply");
    } finally {
      setReplying(false);
    }
  };

  const toggleResolved = async (threadId: string, next: boolean) => {
    try {
      const res = await api.updateThread(courseId, threadId, { isResolved: next });
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, isResolved: res.thread.isResolved } : t))
      );
      if (expandedId === threadId) {
        setExpandedDetail((prev) =>
          prev ? { ...prev, isResolved: res.thread.isResolved } : prev
        );
      }
      toast.success(next ? "Marked as resolved." : "Reopened for discussion.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not change status");
    }
  };

  const remove = async (threadId: string) => {
    if (!confirm("Delete this thread and all its replies?")) return;
    try {
      await api.deleteThread(courseId, threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (expandedId === threadId) setExpandedId(null);
      toast.success("Thread deleted.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete thread");
    }
  };

  const header = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            "bg-amber-100 text-amber-600"
          )}
        >
          <MessageSquare className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-base font-bold text-foreground">{t("discussion.title")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("discussion.desc")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? (
              <span className="hidden sm:inline">{t("discussion.cancel")}</span>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> {t("discussion.ask")}
              </>
            )}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="gap-1 text-muted-foreground hover:text-foreground"
          aria-label={open ? t("discussion.collapseDisc") : t("discussion.expandDisc")}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              open ? "rotate-180" : "rotate-0"
            )}
          />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className={cn("p-5", compact ? "p-4" : "p-5")}>
      {header}

      {user && showForm && (
        <div className="mt-4 space-y-3 rounded-lg border border-amber-100 bg-amber-50/40 p-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What is your question?"
            maxLength={300}
            className="bg-background"
            aria-label="Question title"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add more detail — what you tried, what you expected, where you got stuck."
            rows={4}
            maxLength={20_000}
            className="bg-background"
            aria-label="Question body"
          />
          {lessons.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t("discussion.relatedLesson")}
              </label>
              <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="No specific lesson" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("discussion.noSpecificLesson")}</SelectItem>
                  {lessons.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
              {t("discussion.postQuestion")}
            </Button>
          </div>
        </div>
      )}

      {!user && !authLoading && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("discussion.signInToJoin")}</p>
            <p className="mt-1 text-xs text-amber-700">
              {t("discussion.enrollToDiscuss")}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => openAuthModal("login")}
          >
            <LogIn className="h-3.5 w-3.5" /> {t("auth.logIn")}
          </Button>
        </div>
      )}

      {open && (
        <div className="mt-4 space-y-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
            <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-3">
              <TabsTrigger value="all">{t("discussion.all")}</TabsTrigger>
              <TabsTrigger value="unresolved">{t("discussion.open")}</TabsTrigger>
              <TabsTrigger value="resolved">{t("discussion.resolved")}</TabsTrigger>
            </TabsList>
          </Tabs>

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
                  {t("discussion.enrollToSee")}
                </p>
              </div>
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
              <HelpCircle className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {filter === "resolved" ? t("discussion.noResolved") : filter === "unresolved" ? t("discussion.noOpen") : t("discussion.noQuestions")}
              </p>
              <p className="text-xs text-muted-foreground">
                {user ? t("discussion.beFirst") : t("discussion.signInToAsk")}
              </p>
            </div>
          ) : (
            visibleThreads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                expanded={expandedId === thread.id}
                onToggle={() =>
                  setExpandedId((cur) => (cur === thread.id ? null : thread.id))
                }
                detail={expandedId === thread.id ? expandedDetail : null}
                replyDraft={replyDraft}
                onReplyDraftChange={setReplyDraft}
                onSendReply={() => void sendReply()}
                replying={replying}
                onToggleResolved={(next) => void toggleResolved(thread.id, next)}
                onDelete={() => void remove(thread.id)}
                currentUserId={user?.id}
                canManage={canManage}
              />
            ))
          )}
        </div>
      )}
    </Card>
  );
}

/* ─── Thread card ────────────────────────────────────────── */

interface ThreadCardProps {
  thread: DiscussionThreadSummary;
  expanded: boolean;
  onToggle: () => void;
  detail: {
    replies: DiscussionReply[];
    isResolved: boolean;
    loading: boolean;
  } | null;
  replyDraft: string;
  onReplyDraftChange: (v: string) => void;
  onSendReply: () => void;
  replying: boolean;
  onToggleResolved: (next: boolean) => void;
  onDelete: () => void;
  currentUserId?: string;
  canManage: boolean;
}

function ThreadCard({
  thread,
  expanded,
  onToggle,
  detail,
  replyDraft,
  onReplyDraftChange,
  onSendReply,
  replying,
  onToggleResolved,
  onDelete,
  currentUserId,
  canManage,
}: ThreadCardProps) {
  const t = useT();
  const isAuthor = currentUserId === thread.studentId;
  const canModify = isAuthor || canManage;

  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 p-0",
        thread.isResolved
          ? "border-l-emerald-400"
          : "border-l-amber-400"
      )}
    >
      <CardContent className="p-4">
        <button
          onClick={onToggle}
          className="flex w-full items-start justify-between gap-3 text-left"
          aria-expanded={expanded}
        >
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold leading-tight text-foreground">
                {thread.title}
              </h4>
              {thread.isResolved ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  <CheckCircle2 className="h-3 w-3" /> Resolved
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-amber-700"
                >
                  Open
                </Badge>
              )}
              {thread.lessonTitle && (
                <Badge variant="secondary" className="text-[10px]">
                  {thread.lessonTitle}
                </Badge>
              )}
            </div>
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {thread.body}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <CornerDownRight className="h-3 w-3" /> {thread.replyCount}
            </Badge>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded ? "rotate-180" : "rotate-0"
              )}
            />
          </div>
        </button>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          {thread.author && (
            <>
              <Avatar className="h-6 w-6">
                <AvatarImage src={thread.author.profilePicture || undefined} />
                <AvatarFallback className="bg-indigo-100 text-[9px] font-bold text-indigo-700">
                  {thread.author.fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">
                {thread.author.fullName}
              </span>
              <span>·</span>
            </>
          )}
          <span title={formatDateTime(thread.updatedAt)}>
            {timeAgo(thread.updatedAt)}
          </span>
          {canModify && (
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => onToggleResolved(!thread.isResolved)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {thread.isResolved ? t("discussion.reopen") : t("discussion.resolve")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                onClick={onDelete}
                aria-label={t("common.delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 border-t pt-3">
            {detail?.loading ? (
              <Skeleton className="h-16 w-full rounded-lg" />
            ) : detail && detail.replies.length > 0 ? (
              detail.replies.map((r) => <ReplyRow key={r.id} reply={r} />)
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                {t("discussion.noReplies")}
              </div>
            )}

            {currentUserId && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <Textarea
                  value={replyDraft}
                  onChange={(e) => onReplyDraftChange(e.target.value)}
                  placeholder="Write a helpful reply…"
                  rows={3}
                  maxLength={5_000}
                  className="bg-background text-sm"
                  aria-label="Reply text"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={onSendReply}
                    disabled={replying || !replyDraft.trim()}
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {replying ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Reply row ─────────────────────────────────────────── */

function ReplyRow({ reply }: { reply: DiscussionReply }) {
  const t = useT();
  const role = reply.author?.role;
  const isStaff = role === "teacher" || role === "admin" || role === "super_admin";
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-background p-3">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={reply.author?.profilePicture || undefined} />
        <AvatarFallback
          className={cn(
            "text-[10px] font-bold",
            isStaff
              ? "bg-amber-100 text-amber-700"
              : "bg-indigo-100 text-indigo-700"
          )}
        >
          {(reply.author?.fullName || "?").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">
            {reply.author?.fullName || "Unknown"}
          </span>
          {isStaff && (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 px-1.5 py-0 text-[9px] uppercase tracking-wide text-amber-700"
            >
              {role === "teacher" ? "Teacher" : "Admin"}
            </Badge>
          )}
          <span className="text-muted-foreground">
            {timeAgo(reply.createdAt)}
          </span>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
          {reply.body}
        </p>
      </div>
    </div>
  );
}
