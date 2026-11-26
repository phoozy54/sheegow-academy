"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type {
  ConversationSummary,
  DirectMessageItem,
  User,
} from "@/lib/types";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/sheegow/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Send,
  Loader2,
  LogIn,
  MessageSquare,
  Search,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { cn, timeAgo } from "@/lib/ui";

const POLL_INTERVAL_MS = 5_000;

export default function MessagesPage() {
  return (
    <AppShell showFooter={false}>
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
          </div>
        }
      >
        <MessagesInner />
      </Suspense>
    </AppShell>
  );
}

function MessagesInner() {
  const { user, authLoading, openAuthModal } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  // Track whether we've already processed the ?u=<userId> deep link so we
  // don't fire startConversation more than once.
  const startedRef = useRef(false);

  const loadList = useCallback(async () => {
    try {
      const r = await api.conversations();
      setConversations(r.conversations);
      const targetUserId = searchParams.get("u");
      if (targetUserId) {
        const existing = r.conversations.find(
          (c) => c.otherUser.id === targetUserId
        );
        if (existing) {
          setActiveId(existing.id);
          setMobileShowChat(true);
          startedRef.current = true;
        }
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not load conversations";
      toast.error(msg);
    } finally {
      setLoadingList(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    void loadList();
  }, [user, authLoading, loadList]);

  // One-shot startConversation from query param ?u=<userId>.
  useEffect(() => {
    if (!user) return;
    if (startedRef.current) return;
    const target = searchParams.get("u");
    if (!target) return;
    startedRef.current = true;
    (async () => {
      try {
        const res = await api.startConversation(target);
        setConversations((prev) => {
          const filtered = prev.filter((c) => c.id !== res.conversation.id);
          return [res.conversation, ...filtered];
        });
        setActiveId(res.conversation.id);
        setMobileShowChat(true);
      } catch (e) {
        toast.error(
          e instanceof ApiError ? e.message : "Could not start conversation"
        );
      }
    })();
  }, [user, searchParams]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );

  const handleConversationStarted = useCallback(
    (conv: ConversationSummary) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== conv.id);
        return [conv, ...filtered];
      });
      setActiveId(conv.id);
      setMobileShowChat(true);
    },
    []
  );

  const handleConversationUpdated = useCallback(
    (conv: ConversationSummary) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== conv.id);
        return [conv, ...filtered];
      });
    },
    []
  );

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 lg:px-8">
      {authLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
        </div>
      ) : !user ? (
        <div className="mx-auto max-w-md py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <LogIn className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold">Log in to read your messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Direct messaging works between students, teachers and admins.
          </p>
          <Button
            className="mt-4 gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600"
            onClick={() => openAuthModal("login")}
          >
            <LogIn className="h-4 w-4" /> Log in
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
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
                Messages
              </h1>
              <p className="text-xs text-muted-foreground">
                Private conversations with your teachers and the academy
              </p>
            </div>
          </div>

          <Card className="grid h-[calc(100vh-12rem)] grid-cols-1 overflow-hidden p-0 md:grid-cols-[320px_1fr]">
            <ConversationListColumn
              conversations={conversations}
              loading={loadingList}
              activeId={activeId}
              onSelect={(id) => {
                setActiveId(id);
                setMobileShowChat(true);
              }}
              onConversationStarted={handleConversationStarted}
              className={cn(mobileShowChat && "hidden md:flex")}
              currentUser={user}
            />
            <div
              className={cn(
                "flex flex-col border-l bg-background",
                !mobileShowChat && "hidden md:flex"
              )}
            >
              {active ? (
                <ConversationPane
                  conversation={active}
                  currentUserId={user.id}
                  onBack={() => setMobileShowChat(false)}
                  onConversationUpdated={handleConversationUpdated}
                />
              ) : (
                <EmptyConversation />
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ─── Conversation list ─────────────────────────────────── */

function ConversationListColumn({
  conversations,
  loading,
  activeId,
  onSelect,
  onConversationStarted,
  className,
  currentUser,
}: {
  conversations: ConversationSummary[];
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
  onConversationStarted: (conv: ConversationSummary) => void;
  className?: string;
  currentUser: User;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const r = await api.users({ search: query.trim() });
        setSearchResults(
          r.users.filter((u) => u.id !== currentUser.id && u.isActive)
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query, currentUser.id]);

  const startWith = async (userId: string) => {
    try {
      const res = await api.startConversation(userId);
      onConversationStarted(res.conversation);
      setQuery("");
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not start conversation"
      );
    }
  };

  return (
    <div className={cn("flex flex-col bg-card", className)}>
      <div className="border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a teacher or admin…"
            className="h-9 pl-9"
          />
        </div>
        {query.trim() && (
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {searching ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                Searching…
              </p>
            ) : searchResults.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                No users found. Try a name or email.
              </p>
            ) : (
              searchResults.slice(0, 8).map((u) => (
                <button
                  key={u.id}
                  onClick={() => void startWith(u.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={u.profilePicture || undefined} />
                    <AvatarFallback className="bg-emerald-100 text-[10px] font-bold text-emerald-700">
                      {u.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {u.fullName}
                    </p>
                    <p className="truncate text-[10px] capitalize text-muted-foreground">
                      {u.role}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Inbox className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              No conversations yet
            </p>
            <p className="text-xs text-muted-foreground">
              Search above to start a chat with your teacher or an admin.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                    activeId === c.id
                      ? "bg-emerald-50"
                      : "hover:bg-accent"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={c.otherUser.profilePicture || undefined} />
                      <AvatarFallback
                        className={cn(
                          "text-xs font-bold",
                          c.otherUser.role === "teacher"
                            ? "bg-amber-100 text-amber-700"
                            : c.otherUser.role === "admin" ||
                              c.otherUser.role === "super_admin"
                            ? "bg-fuchsia-100 text-fuchsia-700"
                            : "bg-emerald-100 text-emerald-700"
                        )}
                      >
                        {c.otherUser.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {c.unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white">
                        {c.unreadCount > 9 ? "9+" : c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {c.otherUser.fullName}
                      </p>
                      {c.lastMessage && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {timeAgo(c.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {c.lastMessage
                        ? `${c.lastMessage.senderId === currentUser.id ? "You: " : ""}${c.lastMessage.body}`
                        : "No messages yet — say hello!"}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

/* ─── Empty placeholder ─────────────────────────────────── */

function EmptyConversation() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
        <MessageSquare className="h-7 w-7 text-emerald-500" />
      </div>
      <p className="text-sm font-semibold text-foreground">
        Select a conversation
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Choose a chat from the list, or search for a teacher to start a new
        conversation.
      </p>
    </div>
  );
}

/* ─── Active conversation pane ──────────────────────────── */

function ConversationPane({
  conversation,
  currentUserId,
  onBack,
  onConversationUpdated,
}: {
  conversation: ConversationSummary;
  currentUserId: string;
  onBack: () => void;
  onConversationUpdated: (conv: ConversationSummary) => void;
}) {
  const [messages, setMessages] = useState<DirectMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastLengthRef = useRef(0);
  const conversationIdRef = useRef(conversation.id);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(
    async (id: string, opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const r = await api.conversationMessages(id);
        if (conversationIdRef.current !== id) return;
        setMessages(r.messages);
      } catch (e) {
        if (!opts?.silent) {
          toast.error(
            e instanceof ApiError ? e.message : "Could not load messages"
          );
        }
      } finally {
        if (opts?.silent) setRefreshing(false);
        else setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    conversationIdRef.current = conversation.id;
    lastLengthRef.current = 0;
    void loadMessages(conversation.id);
  }, [conversation.id, loadMessages]);

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      void loadMessages(conversation.id, { silent: true });
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [conversation.id, loadMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (messages.length !== lastLengthRef.current) {
      lastLengthRef.current = messages.length;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // When messages load, the server marks them read — update the summary.
  useEffect(() => {
    if (loading) return;
    if (conversation.unreadCount === 0) return;
    onConversationUpdated({
      ...conversation,
      unreadCount: 0,
    });
  }, [loading, conversation, onConversationUpdated]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await api.sendDirectMessage(conversation.id, { body: text });
      setMessages((prev) => [...prev, res.message]);
      setDraft("");
      onConversationUpdated({
        ...conversation,
        lastMessage: {
          id: res.message.id,
          body: res.message.body,
          createdAt: res.message.createdAt,
          senderId: res.message.senderId,
        },
        unreadCount: 0,
        updatedAt: res.message.createdAt,
      });
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not send message"
      );
    } finally {
      setSending(false);
    }
  };

  const other = conversation.otherUser;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b bg-card px-3 py-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 md:hidden"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={other.profilePicture || undefined} />
          <AvatarFallback
            className={cn(
              "text-xs font-bold",
              other.role === "teacher"
                ? "bg-amber-100 text-amber-700"
                : other.role === "admin" || other.role === "super_admin"
                ? "bg-fuchsia-100 text-fuchsia-700"
                : "bg-emerald-100 text-emerald-700"
            )}
          >
            {other.fullName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">
            {other.fullName}
          </p>
          <p className="truncate text-[11px] capitalize text-muted-foreground">
            {other.role.replace("_", " ")}
          </p>
        </div>
        {refreshing && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-3 sm:p-4"
        style={{ scrollbarWidth: "thin" }}
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn(
                  "h-12 rounded-2xl",
                  i % 2 === 0 ? "max-w-[70%]" : "ml-auto max-w-[70%]"
                )}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <MessageSquare className="h-7 w-7" />
            <p>No messages yet — send the first one below.</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col gap-1",
                  mine ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%]",
                    mine
                      ? "rounded-br-sm bg-emerald-600 text-white"
                      : "rounded-bl-sm bg-card text-foreground"
                  )}
                >
                  {m.body}
                </div>
                <span
                  className={cn(
                    "px-1 text-[10px] text-muted-foreground",
                    mine ? "text-right" : "text-left"
                  )}
                >
                  {timeAgo(m.createdAt)}
                  {mine && m.readAt && " · read"}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t bg-card p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Type a message…"
            maxLength={5_000}
            className="h-10 flex-1"
            aria-label="Message text"
          />
          <Button
            onClick={() => void send()}
            disabled={sending || !draft.trim()}
            className="h-10 shrink-0 gap-2 bg-emerald-600 hover:bg-emerald-700"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
        <p className="mt-1.5 hidden text-[10px] text-muted-foreground sm:block">
          Press Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
