"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import { getSocket, disconnectSocket } from "@/lib/socket";
import type { LiveClass } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Hand,
  PhoneOff,
  Users,
  Send,
  Radio,
  Loader2,
  Lock,
  MessageSquare,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/ui";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────────── */

// A single chat message — either from the API or pushed via socket
interface ChatMsg {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  text: string;
  timestamp: string;
}

// A "system" message — joined / left / raised hand, rendered centered
interface SystemMsg {
  id: string;
  kind: "join" | "leave" | "system";
  text: string;
  timestamp: string;
}

type AnyMsg = ChatMsg | SystemMsg;

function isSystem(m: AnyMsg): m is SystemMsg {
  return (m as SystemMsg).kind !== undefined;
}

// Mock participant bubbles for the video area (purely decorative)
const PARTICIPANT_COLORS = [
  "from-rose-400 to-rose-600",
  "from-amber-400 to-amber-600",
  "from-emerald-400 to-emerald-600",
  "from-violet-400 to-violet-600",
  "from-sky-400 to-sky-600",
  "from-pink-400 to-pink-600",
];
const PARTICIPANT_NAMES = ["Hodan", "Mahamed", "Fadumo", "Abdi", "Leyla", "Yusuf"];

/* ─── Main view ──────────────────────────────────────────── */

export function LiveRoomView() {
  const classId = useStore((s) => s.selectedClassId);
  const navigate = useStore((s) => s.navigate);
  const user = useStore((s) => s.user);
  const openAuthModal = useStore((s) => s.openAuthModal);

  const [liveClass, setLiveClass] = useState<LiveClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<AnyMsg[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);

  // Video controls
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [handRaised, setHandRaised] = useState(false);

  // Socket instance — created on mount, destroyed on unmount
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  /* ─── Load live class + initial messages ─────────────── */
  const loadClass = useCallback(async () => {
    if (!classId) {
      setError("No live class selected");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await api.liveClass(classId);
      setLiveClass(r.liveClass);

      // Seed the chat with existing messages from the API
      try {
        const m = await api.messages(classId);
        const seeded: ChatMsg[] = (m.messages || []).map((msg) => ({
          id: msg.id,
          userId: msg.senderId,
          userName: msg.sender?.fullName || "Student",
          userAvatar: msg.sender?.profilePicture || null,
          text: msg.text,
          timestamp: msg.createdAt,
        }));
        setMessages(seeded);
      } catch {
        // Messages are optional — fail silently
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load live class";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadClass();
  }, [loadClass]);

  /* ─── Socket connection ─────────────────────────────── */
  useEffect(() => {
    if (!classId) return;

    const socket = getSocket();
    socketRef.current = socket;

    const addSystem = (text: string, kind: SystemMsg["kind"] = "system") => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind,
          text,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    /* Listeners ───────────────────────────────────────── */
    const onNewMessage = (m: ChatMsg) => {
      setMessages((prev) => [...prev, m]);
    };

    const onUserJoined = (payload: {
      userId: string;
      userName: string;
      onlineCount?: number;
    }) => {
      addSystem(`${payload.userName} joined the class`, "join");
      if (typeof payload.onlineCount === "number") {
        setOnlineCount(payload.onlineCount);
      }
    };

    const onUserLeft = (payload: {
      userId: string;
      userName: string;
      onlineCount?: number;
    }) => {
      addSystem(`${payload.userName} left the class`, "leave");
      if (typeof payload.onlineCount === "number") {
        setOnlineCount(payload.onlineCount);
      }
    };

    const onOnlineCount = (payload: { classId: string; onlineCount?: number; count?: number }) => {
      const n = payload.onlineCount ?? payload.count;
      if (typeof n === "number") setOnlineCount(n);
    };

    const onHandRaised = (payload: { userId: string; userName: string }) => {
      // Don't toast the current user — they already know
      if (user && payload.userId === user.id) return;
      toast(`✋ ${payload.userName} raised their hand`);
      addSystem(`${payload.userName} raised their hand`);
    };

    const onClassStatus = (payload: { classId: string; status: string }) => {
      if (payload.status === "ended") {
        toast("The teacher ended this class");
        addSystem("The teacher ended this class");
      } else if (payload.status === "live") {
        addSystem("The class is now LIVE");
      }
    };

    socket.on("new-message", onNewMessage);
    socket.on("user-joined", onUserJoined);
    socket.on("user-left", onUserLeft);
    socket.on("online-count", onOnlineCount);
    socket.on("hand-raised", onHandRaised);
    socket.on("class-status", onClassStatus);

    // Join the class — only if user is logged in. Guests still listen.
    if (user && socket.connected) {
      socket.emit("join-class", {
        classId,
        userId: user.id,
        userName: user.fullName,
        userAvatar: user.profilePicture,
      });
    }
    // If the socket isn't connected yet, wait for connect then join
    const onConnect = () => {
      if (user) {
        socket.emit("join-class", {
          classId,
          userId: user.id,
          userName: user.fullName,
          userAvatar: user.profilePicture,
        });
      }
    };
    socket.on("connect", onConnect);

    /* Cleanup ─────────────────────────────────────────── */
    return () => {
      socket.off("new-message", onNewMessage);
      socket.off("user-joined", onUserJoined);
      socket.off("user-left", onUserLeft);
      socket.off("online-count", onOnlineCount);
      socket.off("hand-raised", onHandRaised);
      socket.off("class-status", onClassStatus);
      socket.off("connect", onConnect);
      disconnectSocket();
    };
  }, [classId, user]);

  /* ─── Send a chat message ───────────────────────────── */
  const handleSend = async () => {
    const text = chatInput.trim();
    if (!text || !classId || !user) return;
    setSending(true);
    try {
      const socket = socketRef.current;
      if (socket && socket.connected) {
        socket.emit("send-message", {
          classId,
          userId: user.id,
          userName: user.fullName,
          userAvatar: user.profilePicture,
          text,
        });
      }
      // Optimistic UI: socket emits back to sender too — so we just clear.
      setChatInput("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  /* ─── Raise hand ─────────────────────────────────────── */
  const handleRaiseHand = () => {
    if (!classId || !user) {
      openAuthModal("login");
      return;
    }
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit("raise-hand", {
        classId,
        userId: user.id,
        userName: user.fullName,
      });
      setHandRaised(true);
      toast.success("You raised your hand — the teacher will see it");
      setTimeout(() => setHandRaised(false), 4000);
    }
  };

  /* ─── Loading ───────────────────────────────────────── */
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="aspect-video animate-pulse rounded-2xl bg-muted lg:col-span-2" />
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  /* ─── Error ─────────────────────────────────────────── */
  if (error || !liveClass) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <Radio className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Class unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error || "This live class could not be loaded."}
        </p>
        <Button
          onClick={() => navigate("live")}
          variant="outline"
          className="mt-6 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Live Classes
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background">
      {/* ─── Top bar ─────────────────────────────────────── */}
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("live")}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Leave
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-2 w-2">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="truncate text-sm font-bold text-foreground">
              {liveClass.title}
            </span>
          </div>
          <Badge variant="outline" className="hidden border-red-200 bg-red-50 text-red-700 sm:inline-flex">
            <Radio className="mr-1 h-3 w-3" /> LIVE
          </Badge>
        </div>
      </div>

      {/* ─── Main grid ──────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* ─── Video area ───────────────────────────── */}
          <div className="lg:col-span-2">
            <VideoArea
              liveClass={liveClass}
              onlineCount={onlineCount}
              micOn={micOn}
              camOn={camOn}
              handRaised={handRaised}
              onToggleMic={() => setMicOn((v) => !v)}
              onToggleCam={() => setCamOn((v) => !v)}
              onRaiseHand={handleRaiseHand}
              onLeave={() => navigate("live")}
              isLoggedIn={!!user}
              onLoginPrompt={() => openAuthModal("login")}
            />
          </div>

          {/* ─── Chat sidebar ─────────────────────────── */}
          <div className="lg:col-span-1">
            <ChatSidebar
              messages={messages}
              onlineCount={onlineCount}
              chatInput={chatInput}
              setChatInput={setChatInput}
              onSend={handleSend}
              sending={sending}
              isLoggedIn={!!user}
              currentUserId={user?.id}
              onLoginPrompt={() => openAuthModal("login")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Mock video area ───────────────────────────────────── */

function VideoArea({
  liveClass,
  onlineCount,
  micOn,
  camOn,
  handRaised,
  onToggleMic,
  onToggleCam,
  onRaiseHand,
  onLeave,
  isLoggedIn,
  onLoginPrompt,
}: {
  liveClass: LiveClass;
  onlineCount: number;
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onRaiseHand: () => void;
  onLeave: () => void;
  isLoggedIn: boolean;
  onLoginPrompt: () => void;
}) {
  const teacherName = liveClass.teacher?.fullName || "Teacher";
  const teacherAvatar = liveClass.teacher?.profilePicture || null;

  return (
    <Card className="overflow-hidden p-0">
      {/* Video surface (mock) */}
      <div className="relative aspect-video w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(99,102,241,0.4) 0, transparent 35%), radial-gradient(circle at 75% 75%, rgba(245,158,11,0.3) 0, transparent 35%)",
        }} />

        {/* Top bar: title + online count */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur">
            <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-white" />
            LIVE
          </span>
          <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            <Users className="h-3.5 w-3.5" />
            <span>Students online: {onlineCount}</span>
          </div>
        </div>

        {/* Center: teacher avatar + class info */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="relative">
            <div className="absolute -inset-3 animate-pulse rounded-full bg-red-500/20 blur-xl" />
            <Avatar className="relative h-24 w-24 border-4 border-white/30 shadow-2xl sm:h-32 sm:w-32">
              <AvatarImage src={teacherAvatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-indigo-600 text-2xl font-bold text-white">
                {teacherName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 ring-4 ring-slate-900">
              <Radio className="h-3 w-3 text-white" />
            </span>
          </div>
          <h3 className="mt-4 text-lg font-bold text-white sm:text-xl">{liveClass.title}</h3>
          <p className="mt-1 text-sm text-indigo-200">
            with <span className="font-semibold">{teacherName}</span>
          </p>
          <p className="mt-3 max-w-md text-xs text-slate-300">
            {liveClass.description || "Live interactive English class in session."}
          </p>
        </div>

        {/* Participant bubbles — bottom left */}
        <div className="absolute bottom-20 left-4 flex flex-wrap gap-2 sm:bottom-20 sm:left-4">
          {PARTICIPANT_NAMES.slice(0, 5).map((name, i) => (
            <div
              key={name}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-lg ring-2 ring-white/20",
                PARTICIPANT_COLORS[i]
              )}
              title={`${name} (joined)`}
            >
              {name.slice(0, 2).toUpperCase()}
            </div>
          ))}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-xs font-bold text-white ring-2 ring-white/20">
            +{Math.max(0, onlineCount - 5)}
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center gap-2 border-t bg-card p-3 sm:gap-3">
        {/* Mic */}
        <ControlButton
          active={micOn}
          onClick={onToggleMic}
          activeIcon={Mic}
          inactiveIcon={MicOff}
          activeLabel="Mute microphone"
          inactiveLabel="Unmute microphone"
        />
        {/* Camera */}
        <ControlButton
          active={camOn}
          onClick={onToggleCam}
          activeIcon={Video}
          inactiveIcon={VideoOff}
          activeLabel="Turn off camera"
          inactiveLabel="Turn on camera"
        />
        {/* Screen share — disabled */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <button
                disabled
                className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground opacity-60"
                aria-label="Screen share (coming soon)"
              >
                <ScreenShare className="h-5 w-5" />
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
        {/* Raise hand */}
        <button
          onClick={() => {
            if (!isLoggedIn) {
              onLoginPrompt();
              return;
            }
            onRaiseHand();
          }}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
            handRaised
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/40"
              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
          )}
          aria-label="Raise hand"
        >
          <Hand className="h-5 w-5" />
        </button>
        <Separator orientation="vertical" className="h-8" />
        {/* Leave */}
        <button
          onClick={onLeave}
          className="flex h-11 items-center gap-1.5 rounded-full bg-red-500 px-4 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-colors hover:bg-red-600"
          aria-label="Leave class"
        >
          <PhoneOff className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </Card>
  );
}

/* ─── Control button ────────────────────────────────────── */

function ControlButton({
  active,
  onClick,
  activeIcon: ActiveIcon,
  inactiveIcon: InactiveIcon,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  onClick: () => void;
  activeIcon: React.ComponentType<{ className?: string }>;
  inactiveIcon: React.ComponentType<{ className?: string }>;
  activeLabel: string;
  inactiveLabel: string;
}) {
  const Icon = active ? ActiveIcon : InactiveIcon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
            active
              ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
              : "bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600"
          )}
          aria-label={active ? activeLabel : inactiveLabel}
        >
          <Icon className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{active ? activeLabel : inactiveLabel}</TooltipContent>
    </Tooltip>
  );
}

/* ─── Chat sidebar ──────────────────────────────────────── */

function ChatSidebar({
  messages,
  onlineCount,
  chatInput,
  setChatInput,
  onSend,
  sending,
  isLoggedIn,
  currentUserId,
  onLoginPrompt,
}: {
  messages: AnyMsg[];
  onlineCount: number;
  chatInput: string;
  setChatInput: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  isLoggedIn: boolean;
  currentUserId?: string;
  onLoginPrompt: () => void;
}) {
  // Auto-scroll to the latest message whenever messages change
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card className="flex h-[600px] flex-col overflow-hidden p-0 lg:h-[calc(100vh-12rem)] lg:max-h-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-indigo-50 to-background px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-bold text-foreground">Live Chat</span>
        </div>
        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
          <Users className="mr-1 h-3 w-3" />
          {onlineCount} online
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="custom-scroll flex-1">
        <div className="space-y-3 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">No messages yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Be the first to say hello.
              </p>
            </div>
          ) : (
            messages.map((m) =>
              isSystem(m) ? (
                <SystemMessageRow key={m.id} msg={m} />
              ) : (
                <ChatMessageRow
                  key={m.id}
                  msg={m}
                  isMe={currentUserId === m.userId}
                />
              )
            )
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card p-3">
        {isLoggedIn ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
              className="flex-1"
              aria-label="Chat message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !chatInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-center">
            <Lock className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Log in to join the chat
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={onLoginPrompt}
              className="mt-2 gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" /> Log in to chat
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── Message rows ──────────────────────────────────────── */

function ChatMessageRow({ msg, isMe }: { msg: ChatMsg; isMe: boolean }) {
  return (
    <div className={cn("flex gap-2", isMe && "flex-row-reverse")}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={msg.userAvatar || undefined} />
        <AvatarFallback className="bg-indigo-100 text-[10px] font-bold text-indigo-700">
          {msg.userName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className={cn("max-w-[75%]", isMe && "text-right")}>
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-xs font-bold", isMe ? "text-indigo-600" : "text-foreground")}>
            {isMe ? "You" : msg.userName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {timeAgoShort(msg.timestamp)}
          </span>
        </div>
        <div
          className={cn(
            "mt-1 inline-block rounded-2xl px-3 py-2 text-sm",
            isMe
              ? "rounded-br-sm bg-indigo-600 text-white"
              : "rounded-bl-sm bg-muted text-foreground"
          )}
        >
          {msg.text}
        </div>
      </div>
    </div>
  );
}

function SystemMessageRow({ msg }: { msg: SystemMsg }) {
  return (
    <div className="flex justify-center">
      <span className="rounded-full bg-muted/60 px-3 py-1 text-center text-[11px] italic text-muted-foreground">
        {msg.text}
      </span>
    </div>
  );
}

/* ─── Time helpers ─────────────────────────────────────── */

// Compact relative time for chat timestamps
function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return formatDateTime(iso);
}
