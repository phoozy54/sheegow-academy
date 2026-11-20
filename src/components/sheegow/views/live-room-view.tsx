"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { LiveStreamManager } from "@/lib/webrtc";
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
  Volume2,
  RadioTower,
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
  const [socketConnected, setSocketConnected] = useState(false);

  // Video controls
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [handRaised, setHandRaised] = useState(false);

  // Real WebRTC stream state
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hostPresent, setHostPresent] = useState(false);
  const [needsPlay, setNeedsPlay] = useState(false);
  const streamManagerRef = useRef<LiveStreamManager | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

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

  /* ─── Access errors (e.g. payment required) ─────────── */
  useEffect(() => {
    const onAccessError = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message;
      if (message) toast.error(message);
    };
    window.addEventListener("sheegow:socket-auth-error", onAccessError);
    return () =>
      window.removeEventListener("sheegow:socket-auth-error", onAccessError);
  }, []);

  /* ─── Socket connection ─────────────────────────────── */
  useEffect(() => {
    if (!classId) return;

    const socket = getSocket(classId);
    socketRef.current = socket;
    setSocketConnected(socket.connected);

    const onSocketConnect = () => setSocketConnected(true);
    const onSocketDisconnect = () => setSocketConnected(false);
    socket.on("connect", onSocketConnect);
    socket.on("disconnect", onSocketDisconnect);

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
      socket.off("connect", onSocketConnect);
      socket.off("disconnect", onSocketDisconnect);
      disconnectSocket();
    };
  }, [classId, user]);

  /* ─── Real audio/video (WebRTC over the signaling socket) ── */
  const userId = user?.id;
  const userName = user?.fullName;
  const canBroadcast =
    !!user &&
    !!liveClass &&
    (user.id === liveClass.teacherId ||
      user.role === "admin" ||
      user.role === "super_admin");

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !classId || !userId || !userName || !liveClass) return;

    const manager = new LiveStreamManager({
      socket,
      classId,
      userId,
      userName,
      mode: canBroadcast ? "host" : "viewer",
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        setHostPresent(true);
      },
      onBroadcastStarted: () => setHostPresent(true),
      onBroadcastStopped: () => {
        setRemoteStream(null);
        setHostPresent(false);
      },
      onError: (message) => toast.error(message),
    });
    streamManagerRef.current = manager;

    return () => {
      manager.destroy();
      streamManagerRef.current = null;
      setRemoteStream(null);
      setHostPresent(false);
      setIsBroadcasting(false);
    };
  }, [classId, userId, userName, liveClass, canBroadcast]);

  // Attach the teacher's local preview once the stream is live.
  useEffect(() => {
    const video = localVideoRef.current;
    const stream = streamManagerRef.current?.getLocalStream();
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => undefined);
    }
  }, [isBroadcasting]);

  // Attach the incoming teacher stream to the student's video element.
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video || !remoteStream) return;
    video.srcObject = remoteStream;
    video
      .play()
      .then(() => setNeedsPlay(false))
      .catch(() => setNeedsPlay(true));
  }, [remoteStream]);

  async function handleToggleBroadcast() {
    const manager = streamManagerRef.current;
    if (!manager) return;
    if (manager.isBroadcasting) {
      manager.stopBroadcast();
      setIsBroadcasting(false);
      toast.success("Camera and microphone turned off");
      return;
    }
    const result = await manager.startBroadcast();
    if (result.ok) {
      setIsBroadcasting(true);
      toast.success("Your camera and microphone are live");
    } else {
      toast.error(result.error || "Could not start the stream");
    }
  }

  function handleToggleMic() {
    const next = !micOn;
    setMicOn(next);
    streamManagerRef.current?.toggleMic(next);
  }

  function handleToggleCam() {
    const next = !camOn;
    setCamOn(next);
    streamManagerRef.current?.toggleCam(next);
  }

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
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="aspect-video animate-pulse rounded-2xl bg-muted" />
            <div className="mt-4 h-16 animate-pulse rounded-2xl bg-muted" />
          </div>
          <div className="h-[460px] animate-pulse rounded-2xl bg-muted sm:h-[520px] lg:h-[calc(100vh-12rem)] lg:max-h-[800px]" />
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
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Leave</span>
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="truncate text-sm font-bold text-foreground">
              {liveClass.title}
            </span>
          </div>
          <span
            className={cn(
              "hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold sm:inline-flex",
              socketConnected
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            )}
            title="Live video & chat signaling connection"
          >
            {socketConnected ? "Connected" : "Connecting…"}
          </span>
          <Badge variant="outline" className="hidden shrink-0 border-red-200 bg-red-50 text-red-700 sm:inline-flex">
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
              isHost={canBroadcast}
              isBroadcasting={isBroadcasting}
              remoteStream={remoteStream}
              hostPresent={hostPresent}
              needsPlay={needsPlay}
              localVideoRef={localVideoRef}
              remoteVideoRef={remoteVideoRef}
              onToggleMic={handleToggleMic}
              onToggleCam={handleToggleCam}
              onToggleBroadcast={handleToggleBroadcast}
              onEnablePlay={() => {
                remoteVideoRef.current
                  ?.play()
                  .then(() => setNeedsPlay(false))
                  .catch(() => undefined);
              }}
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
  isHost,
  isBroadcasting,
  remoteStream,
  hostPresent,
  needsPlay,
  localVideoRef,
  remoteVideoRef,
  onToggleMic,
  onToggleCam,
  onToggleBroadcast,
  onEnablePlay,
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
  isHost: boolean;
  isBroadcasting: boolean;
  remoteStream: MediaStream | null;
  hostPresent: boolean;
  needsPlay: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleBroadcast: () => void;
  onEnablePlay: () => void;
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
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(99,102,241,0.4) 0, transparent 35%), radial-gradient(circle at 75% 75%, rgba(245,158,11,0.3) 0, transparent 35%)",
          }}
        />

        {/* Top bar: title + online count */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3 sm:p-4">
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            LIVE
          </span>
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur sm:gap-2 sm:px-3">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Students online:</span>
            <span className="font-semibold">{onlineCount}</span>
          </div>
        </div>

        {/* Center: real video, local preview, or waiting state */}
        {remoteStream ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 h-full w-full bg-black object-contain"
            />
            {needsPlay && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-4 text-center">
                <Volume2 className="h-8 w-8 text-white" />
                <p className="text-sm font-semibold text-white">Tap to enable sound</p>
                <Button size="sm" onClick={onEnablePlay}>
                  Enable audio
                </Button>
              </div>
            )}
            <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {teacherName} · live
            </div>
          </>
        ) : isHost && isBroadcasting ? (
          <>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full scale-x-[-1] bg-black object-cover"
            />
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-sm font-medium text-white">
                Camera is off
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <Radio className="h-3 w-3 text-red-400" /> You are live · {onlineCount} watching
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center sm:px-6">
            <div className="relative">
              <div className="absolute -inset-3 animate-pulse rounded-full bg-red-500/20 blur-xl" />
              <Avatar className="relative h-20 w-20 border-4 border-white/30 shadow-2xl sm:h-28 sm:w-28 lg:h-32 lg:w-32">
                <AvatarImage src={teacherAvatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-indigo-600 text-xl font-bold text-white sm:text-2xl">
                  {teacherName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 ring-4 ring-slate-900">
                <Radio className="h-3 w-3 text-white" />
              </span>
            </div>
            <h3 className="mt-4 line-clamp-2 text-base font-bold text-white sm:text-lg lg:text-xl">{liveClass.title}</h3>
            <p className="mt-1 text-xs text-indigo-200 sm:text-sm">
              with <span className="font-semibold">{teacherName}</span>
            </p>
            <p className="mt-3 line-clamp-3 max-w-md text-xs text-slate-300">
              {liveClass.description || "Live interactive English class in session."}
            </p>
            <p className="mt-4 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-indigo-100 backdrop-blur">
              {isHost
                ? 'Press "Start Camera & Mic" to begin teaching'
                : hostPresent
                  ? "Connecting to the teacher's video…"
                  : "Waiting for the teacher to start the camera…"}
            </p>
          </div>
        )}

        {/* Participant bubbles — bottom left, hidden on very small screens */}
        <div className="absolute bottom-16 left-3 hidden sm:flex lg:bottom-20 lg:left-4">
          <div className="flex flex-wrap gap-2">
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
      </div>

      {/* Control bar */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto border-t bg-card p-3 sm:gap-3 lg:overflow-visible">
        {/* Teacher controls — mic/cam toggle the real MediaStream tracks */}
        {isHost && (
          <>
            <ControlButton
              active={micOn}
              onClick={onToggleMic}
              activeIcon={Mic}
              inactiveIcon={MicOff}
              activeLabel="Mute microphone"
              inactiveLabel="Unmute microphone"
            />
            <ControlButton
              active={camOn}
              onClick={onToggleCam}
              activeIcon={Video}
              inactiveIcon={VideoOff}
              activeLabel="Turn off camera"
              inactiveLabel="Turn on camera"
            />
            <Button
              size="sm"
              onClick={onToggleBroadcast}
              className={cn(
                "h-11 shrink-0 gap-1.5 rounded-full px-3 text-xs font-semibold sm:px-4",
                isBroadcasting
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              )}
            >
              <RadioTower className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isBroadcasting ? "Stop Camera" : "Start Camera & Mic"}
              </span>
              <span className="sm:hidden">{isBroadcasting ? "Stop" : "Go Live"}</span>
            </Button>
          </>
        )}
        {/* Students only receive — they listen and chat */}
        {!isHost && (
          <div className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 text-xs font-semibold text-emerald-700">
            <Volume2 className="h-4 w-4" />
            <span className="hidden sm:inline">Listening</span>
          </div>
        )}
        {/* Screen share — disabled */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0">
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
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors",
            handRaised
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/40"
              : "bg-amber-100 text-amber-700 hover:bg-amber-200"
          )}
          aria-label="Raise hand"
        >
          <Hand className="h-5 w-5" />
        </button>
        <Separator orientation="vertical" className="hidden h-8 shrink-0 sm:block" />
        {/* Leave */}
        <button
          onClick={onLeave}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-red-500 px-4 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-colors hover:bg-red-600"
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
        <span className="shrink-0">
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
        </span>
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
    <Card className="flex h-[460px] flex-col overflow-hidden p-0 sm:h-[520px] lg:h-[calc(100vh-12rem)] lg:max-h-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-indigo-50 to-background px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquare className="h-4 w-4 shrink-0 text-indigo-600" />
          <span className="truncate text-sm font-bold text-foreground">Live Chat</span>
        </div>
        <Badge variant="outline" className="shrink-0 border-indigo-200 bg-indigo-50 text-indigo-700">
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
              autoComplete="off"
              className="flex-1 text-base"
              aria-label="Chat message"
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || !chatInput.trim()}
              className="h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-700"
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
