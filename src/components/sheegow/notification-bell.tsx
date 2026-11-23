"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Notification, NotificationType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Megaphone,
  MessageSquareReply,
  Mail,
  Video,
  Info,
  CheckCheck,
  Loader2,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { cn, timeAgo } from "@/lib/ui";

/** Polling interval — 30 seconds while the popover is CLOSED. */
const POLL_INTERVAL_MS = 30_000;

/** Per-type icon + tint used by both the bell dropdown and the page. */
export const NOTIFICATION_META: Record<
  NotificationType,
  { icon: typeof Bell; tint: string; bg: string }
> = {
  announcement: {
    icon: Megaphone,
    tint: "text-indigo-600",
    bg: "bg-indigo-100 dark:bg-indigo-500/15",
  },
  reply: {
    icon: MessageSquareReply,
    tint: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-500/15",
  },
  message: {
    icon: Mail,
    tint: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-500/15",
  },
  class: {
    icon: Video,
    tint: "text-fuchsia-600",
    bg: "bg-fuchsia-100 dark:bg-fuchsia-500/15",
  },
  system: {
    icon: Info,
    tint: "text-muted-foreground",
    bg: "bg-muted",
  },
};

/** Graceful fallback if the API ever returns an unknown type. */
function metaFor(type: string) {
  return NOTIFICATION_META[type as NotificationType] ?? NOTIFICATION_META.system;
}

/**
 * Bell icon for the SHEEGOW ACADEMY navbar.
 *
 * - Shows a red badge with the unread count.
 * - Polls /api/notifications every 30 seconds while the dropdown is closed.
 * - Mark-all-read + View-all buttons inside the dropdown.
 * - Only rendered for logged-in users (the navbar guards that).
 */
export function NotificationBell() {
  const { user, authLoading } = useStore();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const r = await api.notifications();
      setNotifications(r.notifications);
      setUnreadCount(r.unreadCount);
    } catch (e) {
      // Silent failures keep the bell from spamming toasts on flaky networks.
      if (!opts?.silent) {
        toast.error(
          e instanceof ApiError ? e.message : "Could not load notifications"
        );
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  // Initial load + polling. Only poll while the dropdown is closed — once
  // open, the user can see updates themselves and an extra round-trip is
  // wasted.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    void load();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (!open) void load({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user, authLoading, open, load]);

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
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not mark notifications"
      );
    } finally {
      setMarkingAll(false);
    }
  }, []);

  const markOneRead = useCallback(
    async (id: string): Promise<boolean> => {
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
        return true;
      } catch (e) {
        toast.error(
          e instanceof ApiError ? e.message : "Could not mark notification"
        );
        return false;
      }
    },
    []
  );

  const handleNotificationClick = useCallback(
    (n: Notification) => {
      // Mark-as-read first (fire and forget) then navigate.
      if (!n.readAt) void markOneRead(n.id);
      setOpen(false);
      if (n.link) router.push(n.link);
    },
    [markOneRead, router]
  );

  if (authLoading || !user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${
            unreadCount > 0 ? ` (${unreadCount} unread)` : ""
          }`}
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-background"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[min(92vw,22rem)] p-0"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-[10px] hover:bg-red-500">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            disabled={markingAll || unreadCount === 0}
            onClick={() => void markAllRead()}
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Mark all read
          </Button>
        </div>

        <div className="max-h-[22rem] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y">
              {notifications.slice(0, 8).map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onClick={() => handleNotificationClick(n)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center gap-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-500/10"
            onClick={() => {
              setOpen(false);
              router.push("/notifications");
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">You&apos;re all caught up</p>
      <p className="max-w-[16rem] text-xs text-muted-foreground">
        New announcements, replies and messages will show up here.
      </p>
    </div>
  );
}

function NotificationRow({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const meta = metaFor(notification.type);
  const Icon = meta.icon;
  const unread = !notification.readAt;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
          unread ? "bg-indigo-50/60 hover:bg-indigo-50 dark:bg-indigo-500/5 dark:hover:bg-indigo-500/10" : "hover:bg-accent"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            meta.bg,
            meta.tint
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p
              className={cn(
                "truncate text-sm",
                unread ? "font-semibold text-foreground" : "font-medium text-foreground"
              )}
            >
              {notification.title}
            </p>
            {unread && (
              <span
                aria-hidden
                className="ml-auto h-2 w-2 shrink-0 rounded-full bg-indigo-600"
              />
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {notification.body}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/80">
            {timeAgo(notification.createdAt)}
          </p>
        </div>
      </button>
    </li>
  );
}
