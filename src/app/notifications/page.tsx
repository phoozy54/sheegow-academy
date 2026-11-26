"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Notification } from "@/lib/types";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/sheegow/app-shell";
import {
  NOTIFICATION_META,
} from "@/components/sheegow/notification-bell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Trash2,
  CheckCheck,
  Loader2,
  Bell,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { cn, timeAgo } from "@/lib/ui";

type Filter = "all" | "unread" | "read";

export default function NotificationsPage() {
  const { user, authLoading, openAuthModal } = useStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.notifications();
      setNotifications(r.notifications);
      setUnreadCount(r.unreadCount);
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not load notifications"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    void load();
  }, [user, authLoading, load]);

  const markAllRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) =>
          n.readAt ? n : { ...n, readAt: new Date().toISOString() }
        )
      );
      setUnreadCount(0);
      toast.success("Marked all notifications as read");
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not mark notifications"
      );
    } finally {
      setMarkingAll(false);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      const r = await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, readAt: r.notification.readAt ?? n.readAt }
            : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not mark notification"
      );
    } finally {
      setBusyId(null);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      await api.deleteNotification(id);
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.readAt) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      toast.success("Notification deleted");
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not delete notification"
      );
    } finally {
      setBusyId(null);
    }
  }, [notifications]);

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.readAt);
    if (filter === "read") return notifications.filter((n) => !!n.readAt);
    return notifications;
  }, [notifications, filter]);

  const handleClick = useCallback(
    (n: Notification) => {
      if (!n.readAt) void markRead(n.id);
      if (n.link) router.push(n.link);
    },
    [markRead, router]
  );

  if (authLoading) {
    return (
      <AppShell showFooter={false}>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell showFooter={false}>
        <div className="mx-auto max-w-md py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <LogIn className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold">Log in to see your notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Announcements, replies and direct messages live here once you sign
            in.
          </p>
          <Button
            className="mt-4 gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600"
            onClick={() => {
              openAuthModal("login");
              router.replace("/");
            }}
          >
            <LogIn className="h-4 w-4" /> Log in
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showFooter={false}>
      <div className="mx-auto max-w-3xl px-3 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-1 -ml-2 gap-1.5"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Button>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Notifications
            </h1>
            <p className="text-xs text-muted-foreground">
              Announcements, replies and messages from across the academy.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={markingAll || unreadCount === 0}
            onClick={() => void markAllRead()}
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Mark all read
          </Button>
        </div>

        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
          className="mb-4"
        >
          <TabsList>
            <TabsTrigger value="all">
              All
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {notifications.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {unreadCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="read">
              Read
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {notifications.length - unreadCount}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {filter === "unread"
                ? "No unread notifications"
                : filter === "read"
                ? "No read notifications yet"
                : "No notifications yet"}
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              New announcements, discussion replies and direct messages will
              appear here.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                busy={busyId === n.id}
                onClick={() => handleClick(n)}
                onMarkRead={() => void markRead(n.id)}
                onDelete={() => void remove(n.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function NotificationCard({
  notification,
  busy,
  onClick,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  busy: boolean;
  onClick: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const meta = NOTIFICATION_META[notification.type] ?? NOTIFICATION_META.system;
  const Icon = meta.icon;
  const unread = !notification.readAt;

  return (
    <li>
      <Card
        className={cn(
          "flex items-start gap-3 p-3 transition-colors sm:p-4",
          unread ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/5" : ""
        )}
      >
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          aria-label={`Open notification: ${notification.title}`}
        >
          <span
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              meta.bg,
              meta.tint
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  "truncate text-sm",
                  unread
                    ? "font-bold text-foreground"
                    : "font-semibold text-foreground"
                )}
              >
                {notification.title}
              </p>
              {unread && (
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full bg-emerald-600"
                />
              )}
            </div>
            <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">
              {notification.body}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground/80">
              {timeAgo(notification.createdAt)}
              {notification.link && (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                  · Open
                </span>
              )}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 flex-col gap-1">
          {unread && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Mark as read"
              disabled={busy}
              onClick={onMarkRead}
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            aria-label="Delete notification"
            disabled={busy}
            onClick={onDelete}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </Card>
    </li>
  );
}
