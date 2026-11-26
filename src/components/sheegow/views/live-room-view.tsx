"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useDevice } from "@/lib/device";
import { api, ApiError } from "@/lib/api";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { LiveStreamManager } from "@/lib/webrtc";
import type { LiveClass, Poll } from "@/lib/types";
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
  Sparkles,
  CheckCircle2,
  ClipboardList,
  BarChart3,
  Plus,
  X,
  Pencil,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/ui";
import { toast } from "sonner";
import { Whiteboard } from "@/components/sheegow/whiteboard";
import { useT } from "@/lib/i18n";

/* ─── Types ─────────────────────────────────────────────── */

// A single chat message — either from the API or pushed via socket
interface ChatMsg {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  text: string;
  timestamp: string;
  /** Used to ignore our own socket echo after persisting the message. */
  clientId?: string;
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


/* ─── Main view ──────────────────────────────────────────── */

export function LiveRoomView({ classId }: { classId: string }) {
  const t = useT();
  const user = useStore((s) => s.user);
  const openAuthModal = useStore((s) => s.openAuthModal);
  const router = useRouter();
  const { isMobile, isTablet } = useDevice();

  // On phones the video and chat panels are shown one at a time.
  const [mobileTab, setMobileTab] = useState<"video" | "chat">("video");

  const [liveClass, setLiveClass] = useState<LiveClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [requestingTrial, setRequestingTrial] = useState(false);
  const [trialRequested, setTrialRequested] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<AnyMsg[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [participants, setParticipants] = useState<
    { userId: string; userName: string; userAvatar?: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Video controls
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [hostSharingScreen, setHostSharingScreen] = useState(false);

  // Collaborative whiteboard — host draws, students watch in real time.
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);

  // Live polls
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [busyPoll, setBusyPoll] = useState("");

  // Real WebRTC stream state
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hostPresent, setHostPresent] = useState(false);
  const [needsPlay, setNeedsPlay] = useState(false);
  const streamManagerRef = useRef<LiveStreamManager | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Admin join-mode selector: "host" (broadcast) or "viewer" (observe as
  // student). Non-admins skip the selector entirely.
  const isEligibleForHost =
    !!user &&
    !!liveClass &&
    (user.id === liveClass.teacherId ||
      user.role === "admin" ||
      user.role === "super_admin");
  const [joinMode, setJoinMode] = useState<"host" | "viewer" | null>(null);

  // Socket instance — created on mount, destroyed on unmount
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  /* ─── Live polls ─────────────────────────────────────── */
  const loadPolls = useCallback(async (id: string) => {
    try {
      const r = await api.polls(id);
      setPolls(r.polls);
    } catch {
      // Polls are an extra interaction layer — never block the class.
    }
  }, []);

  useEffect(() => {
    if (!classId) return;
    void loadPolls(classId);
    const timer = setInterval(() => void loadPolls(classId), 15_000);
    return () => clearInterval(timer);
  }, [classId, loadPolls]);

  /* ─── Load live class + initial messages ─────────────── */
  const loadClass = useCallback(async () => {
    if (!classId) {
      setError("No live class selected");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setAccessBlocked(false);
    setTrialRequested(false);
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
          text: (msg as { text?: string; body?: string }).text || (msg as { body?: string }).body || "",
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
      const detail = (event as CustomEvent<{ message?: string; status?: number }>)
        .detail;
      if (detail?.message) toast.error(detail.message);
      // 402 = payment required, 403 = enrollment required. Show the dedicated
      // access screen with a trial CTA instead of a dead video room.
      if (detail?.status === 402 || detail?.status === 403) {
        setAccessBlocked(true);
      }
    };
    window.addEventListener("sheegow:socket-auth-error", onAccessError);
    return () =>
      window.removeEventListener("sheegow:socket-auth-error", onAccessError);
  }, []);

  const handleRequestTrial = async () => {
    if (!user) {
      openAuthModal("register");
      return;
    }
    if (!classId) return;
    setRequestingTrial(true);
    try {
      const res = await api.requestTrial(classId);
      setTrialRequested(true);
      if (res.alreadyExists) {
        toast.info("You already have a trial request for this class.");
      } else {
        toast.success("Trial request sent. An admin will review it shortly.");
      }
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Could not send the trial request"
      );
    } finally {
      setRequestingTrial(false);
    }
  };

  /* ─── Socket connection ─────────────────────────────── */
  // Only connect once the user has picked a join mode (admins) or
  // immediately for students/teachers who don't get a choice.
  useEffect(() => {
    if (!classId) return;
    // Students and non-host-eligible users join as viewers automatically.
    // Admins must pick "host" or "viewer" before the socket connects.
    const effectiveMode = isEligibleForHost
      ? joinMode
      : "viewer";
    if (!effectiveMode) return; // admin hasn't chosen yet — wait

    const socket = getSocket(classId, effectiveMode);
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
      // The socket echoes our own message back. We already rendered it
      // optimistically (and replaced it with the persisted DB row).
      if (m.clientId && user && m.userId === user.id) {
        setMessages((prev) => {
          if (prev.some((item) => !isSystem(item) && item.clientId === m.clientId)) {
            return prev;
          }
          return [...prev, m];
        });
        return;
      }
      setMessages((prev) => [...prev, m]);
    };

    const onUserJoined = (payload: {
      userId: string;
      userName: string;
      onlineCount?: number;
    }) => {
      addSystem(`${payload.userName} joined the class`, "join");
      setParticipants((prev) =>
        prev.some((p) => p.userId === payload.userId)
          ? prev
          : [...prev, { userId: payload.userId, userName: payload.userName }]
      );
      if (typeof payload.onlineCount === "number") {
        setOnlineCount(payload.onlineCount);
      }
    };

    const onUserLeft = (payload: {
      userId: string;
      userName: string;
      onlineCount?: number;
    }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== payload.userId));
      addSystem(`${payload.userName} left the class`, "leave");
      if (typeof payload.onlineCount === "number") {
        setOnlineCount(payload.onlineCount);
      }
    };

    const onOnlineCount = (payload: { classId: string; onlineCount?: number; count?: number }) => {
      const n = payload.onlineCount ?? payload.count;
      if (typeof n === "number") setOnlineCount(n);
    };

    const onUsersList = (payload: {
      users?: { userId: string; userName: string; userAvatar?: string }[];
    }) => {
      setParticipants(Array.isArray(payload?.users) ? payload.users : []);
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

    const onScreenShareStarted = () => {
      setHostSharingScreen(true);
      addSystem("The teacher is now sharing their screen", "system");
    };
    const onScreenShareStopped = () => {
      setHostSharingScreen(false);
      addSystem("Screen sharing ended", "system");
    };

    socket.on("new-message", onNewMessage);
    socket.on("user-joined", onUserJoined);
    socket.on("user-left", onUserLeft);
    socket.on("online-count", onOnlineCount);
    socket.on("users-list", onUsersList);
    socket.on("hand-raised", onHandRaised);
    socket.on("class-status", onClassStatus);
    socket.on("screen-share-started", onScreenShareStarted);
    socket.on("screen-share-stopped", onScreenShareStopped);

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
      socket.off("users-list", onUsersList);
      socket.off("hand-raised", onHandRaised);
      socket.off("class-status", onClassStatus);
      socket.off("screen-share-started", onScreenShareStarted);
      socket.off("screen-share-stopped", onScreenShareStopped);
      socket.off("connect", onConnect);
      socket.off("connect", onSocketConnect);
      socket.off("disconnect", onSocketDisconnect);
      disconnectSocket();
    };
  }, [classId, user, isEligibleForHost, joinMode]);

  /* ─── Attendance — real minutes for enrolled students ──── */
  useEffect(() => {
    if (!classId || !user || user.role !== "student" || !socketConnected) return;

    void api.attendance(classId, "join").catch(() => undefined);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void api.attendance(classId, "heartbeat").catch(() => undefined);
      }
    }, 60_000);

    const leave = () => {
      const url = `/api/live/${classId}/attendance`;
      const body = JSON.stringify({ action: "leave" });
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      } else {
        void api.attendance(classId, "leave").catch(() => undefined);
      }
    };
    const onPageHide = () => leave();
    window.addEventListener("pagehide", onPageHide);

    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", onPageHide);
      leave();
    };
  }, [classId, user, socketConnected]);

  /* ─── Real audio/video (WebRTC over the signaling socket) ── */
  const userId = user?.id;
  const userName = user?.fullName;
  // canBroadcast is true only when the user is eligible (admin/teacher)
  // AND has chosen "host" mode (not "viewer"). Students always get false.
  const canBroadcast = isEligibleForHost && joinMode === "host";

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
  // Re-attach when screen sharing starts/stops — the stream reference
  // changes (camera → screen → camera), so the video element must pick
  // up the new srcObject to avoid a frozen/flickering preview on mobile.
  useEffect(() => {
    const video = localVideoRef.current;
    const stream = streamManagerRef.current?.getLocalStream();
    if (video && stream) {
      // Only update if the srcObject actually changed — prevents
      // unnecessary reloads that cause flicker.
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        video.play().catch(() => undefined);
      }
    }
  }, [isBroadcasting, screenSharing]);

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

  async function handleToggleScreenShare() {
    const manager = streamManagerRef.current;
    if (!manager) return;
    if (manager.isScreenSharing) {
      manager.stopScreenShare();
      setScreenSharing(false);
      return;
    }
    const result = await manager.startScreenShare();
    if (result.ok) {
      setScreenSharing(true);
      toast.success("You are sharing your screen");
    } else {
      toast.error(result.error || "Could not share your screen");
    }
  }

  /* ─── Live polls ─────────────────────────────────────── */
  async function handleCreatePoll() {
    if (!classId || !pollQuestion.trim()) return;
    const options = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (options.length < 2) {
      toast.error("Add at least two options");
      return;
    }
    setBusyPoll("create");
    try {
      await api.createPoll(classId, { question: pollQuestion.trim(), options });
      setPollQuestion("");
      setPollOptions(["", ""]);
      toast.success("Poll started");
      await loadPolls(classId);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not start poll");
    } finally {
      setBusyPoll("");
    }
  }

  async function handleVotePoll(pollId: string, optionIndex: number) {
    setBusyPoll(pollId);
    try {
      await api.votePoll(pollId, optionIndex);
      await loadPolls(classId!);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not submit vote");
    } finally {
      setBusyPoll("");
    }
  }

  async function handleEndPoll(pollId: string) {
    setBusyPoll(pollId);
    try {
      await api.endPoll(pollId);
      await loadPolls(classId!);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not end poll");
    } finally {
      setBusyPoll("");
    }
  }

  /* ─── Send a chat message (persisted + delivered live) ─ */
  const handleSend = async () => {
    const text = chatInput.trim();
    if (!text || !classId || !user) return;
    setSending(true);

    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const optimistic: ChatMsg = {
      id: `client-${clientId}`,
      clientId,
      userId: user.id,
      userName: user.fullName,
      userAvatar: user.profilePicture,
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setChatInput("");

    try {
      // Persist first so the message survives a reload, then deliver live.
      const saved = await api.sendMessage(classId, text, clientId);
      setMessages((prev) =>
        prev.map((m) =>
          !isSystem(m) && m.clientId === clientId
            ? { ...m, id: saved.message.id, timestamp: saved.message.createdAt }
            : m
        )
      );
      const socket = socketRef.current;
      if (socket && socket.connected) {
        socket.emit("send-message", {
          classId,
          clientId,
          userId: user.id,
          userName: user.fullName,
          userAvatar: user.profilePicture,
          text,
        });
      }
    } catch (e) {
      setMessages((prev) =>
        prev.filter((m) => !(!isSystem(m) && m.clientId === clientId))
      );
      setChatInput(text);
      toast.error(e instanceof ApiError ? e.message : "Message could not be sent");
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

  /* ─── Error / access denied ─────────────────────────── */
  if (error || !liveClass || accessBlocked) {
    const message = accessBlocked
      ? t("liveRoom.accessMsg")
      : error || t("liveRoom.classUnavailable");
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <Radio className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          {accessBlocked ? t("liveRoom.accessRequired") : t("liveRoom.classUnavailable")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>

        {accessBlocked && user?.role === "student" && (
          <div className="mx-auto mt-6 max-w-sm rounded-xl border bg-card p-4 shadow-sm">
            {trialRequested ? (
              <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> {t("liveRoom.trialSent")}
              </div>
            ) : (
              <Button
                onClick={handleRequestTrial}
                disabled={requestingTrial}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {requestingTrial ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {t("liveRoom.requestFreeTrial")}
              </Button>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {t("liveRoom.adminReviews")}
            </p>
          </div>
        )}

        <Button
          onClick={() => router.push("/live-classes")}
          variant="outline"
          className="mt-6 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> {t("liveRoom.backToLive")}
        </Button>
      </div>
    );
  }

  /* ─── Pre-join mode selector for admins ────────────── */
  // Admins can choose to attend as a host (broadcast mic/cam) or as a
  // student (observe only). Students skip this screen entirely.
  if (isEligibleForHost && !joinMode) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <Video className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          {t("live.howJoin")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("liveRoom.youAreJoining")} <span className="font-semibold text-foreground">{liveClass.title}</span>. {t("liveRoom.chooseRole")}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {/* Host mode */}
          <button
            onClick={() => setJoinMode("host")}
            className="group rounded-xl border-2 border-emerald-200 bg-card p-5 text-left transition-all hover:border-emerald-500 hover:shadow-lg"
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Video className="h-5 w-5" />
            </div>
            <p className="font-bold text-foreground">Join as Host</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Broadcast your camera and mic, manage the class, and share your
              screen.
            </p>
          </button>

          {/* Viewer mode */}
          <button
            onClick={() => setJoinMode("viewer")}
            className="group rounded-xl border-2 border-border bg-card p-5 text-left transition-all hover:border-emerald-500 hover:shadow-lg"
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <p className="font-bold text-foreground">Join as Student</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Watch and listen only. Use chat to participate. No camera or mic.
            </p>
          </button>
        </div>

        <Button
          onClick={() => router.push("/live-classes")}
          variant="ghost"
          className="mt-4 gap-1.5 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> {t("liveRoom.cancel")}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background">
      {/* ─── Top bar ─────────────────────────────────────── */}
      <div className="border-b bg-card">
        <div
          className={`mx-auto flex max-w-7xl items-center justify-between gap-3 py-3 ${
            isMobile ? "px-3" : isTablet ? "px-5" : "px-4 sm:px-6 lg:px-8"
          }`}
        >
          <button
            onClick={() => router.push("/live-classes")}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">{t("liveRoom.leave")}</span>
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
            {socketConnected ? t("liveRoom.connected") : t("liveRoom.connecting")}
          </span>
          <Badge variant="outline" className="hidden shrink-0 border-red-200 bg-red-50 text-red-700 sm:inline-flex">
            <Radio className="mr-1 h-3 w-3" /> LIVE
          </Badge>
        </div>
      </div>

      {/* ─── Main grid ──────────────────────────────────── */}
      <div
        className={`mx-auto max-w-7xl py-4 ${
          isMobile ? "px-3" : isTablet ? "px-5" : "px-4 sm:px-6 lg:px-8"
        }`}
      >
        {/* Phone tabs: switch between the video and the chat without
            scrolling past two stacked panels. Both panels stay mounted so
            the WebRTC stream and chat socket are never interrupted. */}
        {isMobile && (
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border bg-card p-1">
            <button
              onClick={() => setMobileTab("video")}
              className={cn(
                "flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors",
                mobileTab === "video"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <Video className="h-4 w-4" /> {t("liveRoom.video")}
            </button>
            <button
              onClick={() => setMobileTab("chat")}
              className={cn(
                "flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors",
                mobileTab === "chat"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              <MessageSquare className="h-4 w-4" /> {t("liveRoom.chat")}
              {messages.length > 0 && mobileTab !== "chat" && (
                <span className="ml-0.5 rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-700">
                  {messages.length}
                </span>
              )}
            </button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {/* ─── Video area ───────────────────────────── */}
          <div
            className="lg:col-span-2"
            style={
              isMobile ? { display: mobileTab === "video" ? "block" : "none" } : undefined
            }
          >
            <VideoArea
              liveClass={liveClass}
              onlineCount={onlineCount}
              participants={participants}
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
              screenSharing={screenSharing}
              hostSharingScreen={hostSharingScreen}
              onToggleScreenShare={handleToggleScreenShare}
              whiteboardOpen={whiteboardOpen}
              onToggleWhiteboard={() => setWhiteboardOpen((v) => !v)}
              onEnablePlay={() => {
                remoteVideoRef.current
                  ?.play()
                  .then(() => setNeedsPlay(false))
                  .catch(() => undefined);
              }}
              onRaiseHand={handleRaiseHand}
              onLeave={() => router.push("/live-classes")}
              isLoggedIn={!!user}
              onLoginPrompt={() => openAuthModal("login")}
            />
            {whiteboardOpen && (
              <div className="mt-4">
                <Whiteboard
                  socket={socketRef.current}
                  socketConnected={socketConnected}
                  classId={classId}
                  canDraw={canBroadcast}
                  userId={user?.id || ""}
                />
              </div>
            )}
            <div className="mt-4">
              <PollPanel
                polls={polls}
                isHost={canBroadcast}
                pollQuestion={pollQuestion}
                setPollQuestion={setPollQuestion}
                pollOptions={pollOptions}
                setPollOptions={setPollOptions}
                busyPoll={busyPoll}
                onCreate={handleCreatePoll}
                onVote={handleVotePoll}
                onEnd={handleEndPoll}
              />
            </div>
          </div>

          {/* ─── Chat sidebar ─────────────────────────── */}
          <div
            className="lg:col-span-1"
            style={
              isMobile ? { display: mobileTab === "chat" ? "block" : "none" } : undefined
            }
          >
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
  participants,
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
  screenSharing,
  hostSharingScreen,
  onToggleScreenShare,
  whiteboardOpen,
  onToggleWhiteboard,
  onEnablePlay,
  onRaiseHand,
  onLeave,
  isLoggedIn,
  onLoginPrompt,
}: {
  liveClass: LiveClass;
  onlineCount: number;
  participants: { userId: string; userName: string; userAvatar?: string }[];
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
  screenSharing: boolean;
  hostSharingScreen: boolean;
  onToggleScreenShare: () => void;
  whiteboardOpen: boolean;
  onToggleWhiteboard: () => void;
  onEnablePlay: () => void;
  onRaiseHand: () => void;
  onLeave: () => void;
  isLoggedIn: boolean;
  onLoginPrompt: () => void;
}) {
  const t = useT();
  const teacherName = liveClass.teacher?.fullName || "Teacher";
  const teacherAvatar = liveClass.teacher?.profilePicture || null;

  return (
    <Card className="overflow-hidden p-0">
      {/* Video surface (mock) */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
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
            <span className="hidden sm:inline">{t("liveRoom.studentsOnline")}</span>
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
                <p className="text-sm font-semibold text-white">{t("liveRoom.tapEnableSound")}</p>
                <Button size="sm" onClick={onEnablePlay}>
                  Enable audio
                </Button>
              </div>
            )}
            <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {teacherName} · {hostSharingScreen ? "sharing screen" : "live"}
            </div>
          </>
        ) : isHost && isBroadcasting ? (
          <>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "absolute inset-0 h-full w-full bg-black object-contain transition-opacity duration-200",
                !screenSharing && "scale-x-[-1]"
              )}
            />
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-sm font-medium text-white">
                {t("liveRoom.cameraOff")}
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <Radio className="h-3 w-3 text-red-400" /> {t("liveRoom.youAreLive")}
              {screenSharing ? " · screen" : ""} · {onlineCount} watching
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center sm:px-6">
            <div className="relative">
              <div className="absolute -inset-3 animate-pulse rounded-full bg-red-500/20 blur-xl" />
              <Avatar className="relative h-20 w-20 border-4 border-white/30 shadow-2xl sm:h-28 sm:w-28 lg:h-32 lg:w-32">
                <AvatarImage src={teacherAvatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-xl font-bold text-white sm:text-2xl">
                  {teacherName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 ring-4 ring-slate-900">
                <Radio className="h-3 w-3 text-white" />
              </span>
            </div>
            <h3 className="mt-4 line-clamp-2 text-base font-bold text-white sm:text-lg lg:text-xl">{liveClass.title}</h3>
            <p className="mt-1 text-xs text-emerald-200 sm:text-sm">
              {t("liveRoom.with")} <span className="font-semibold">{teacherName}</span>
            </p>
            <p className="mt-3 line-clamp-3 max-w-md text-xs text-slate-300">
              {liveClass.description || t("liveRoom.liveInteractive")}
            </p>
            <p className="mt-4 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-emerald-100 backdrop-blur">
              {isHost ? t("live.pressStart") : hostPresent ? t("live.connecting") : t("live.waiting")}
            </p>
          </div>
        )}

        {/* Real participants reported by the chat service */}
        {participants.length > 0 && (
          <div className="absolute bottom-16 left-3 hidden sm:flex lg:bottom-20 lg:left-4">
            <div className="flex flex-wrap gap-2">
              {participants.slice(0, 5).map((p) => (
                <Avatar key={p.userId} className="h-10 w-10 ring-2 ring-white/20" title={p.userName}>
                  <AvatarImage src={p.userAvatar || undefined} />
                  <AvatarFallback className="bg-emerald-600 text-xs font-bold text-white">
                    {p.userName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {participants.length > 5 && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-xs font-bold text-white ring-2 ring-white/20">
                  +{participants.length - 5}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Control bar — wraps on mobile, single row on desktop */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-t bg-card p-3 sm:flex-nowrap sm:gap-3">
        {/* Teacher controls — mic/cam toggle the real MediaStream tracks */}
        {isHost && (
          <>
            <ControlButton
              active={micOn}
              onClick={onToggleMic}
              activeIcon={Mic}
              inactiveIcon={MicOff}
              activeLabel={t("live.mute")}
              inactiveLabel={t("live.unmute")}
            />
            <ControlButton
              active={camOn}
              onClick={onToggleCam}
              activeIcon={Video}
              inactiveIcon={VideoOff}
              activeLabel={t("live.cameraOffBtn")}
              inactiveLabel={t("live.cameraOnBtn")}
            />
            <Button
              size="sm"
              onClick={onToggleBroadcast}
              className={cn(
                "h-11 shrink-0 gap-1.5 rounded-full px-3 text-xs font-semibold sm:px-4",
                isBroadcasting
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              <RadioTower className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isBroadcasting ? t("live.stopCamera") : t("live.startCamera")}
              </span>
              <span className="sm:hidden">{isBroadcasting ? t("live.stop") : t("live.goLive")}</span>
            </Button>
          </>
        )}
        {/* Students only receive — they listen and chat */}
        {!isHost && (
          <div className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 text-xs font-semibold text-emerald-700">
            <Volume2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("liveRoom.listening")}</span>
          </div>
        )}
        {/* Screen sharing — real getDisplayMedia capture for hosts */}
        {isHost && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0">
                <button
                  onClick={onToggleScreenShare}
                  disabled={!isBroadcasting && !screenSharing}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full transition-colors disabled:opacity-50",
                    screenSharing
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  )}
                  aria-label={screenSharing ? t("live.stopShare") : t("live.shareScreen")}
                >
                  <ScreenShare className="h-5 w-5" />
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {screenSharing
                ? t("live.stopShare")
                : isBroadcasting
                  ? t("live.shareScreen")
                  : t("live.startCameraFirst")}
            </TooltipContent>
          </Tooltip>
        )}
        {/* Whiteboard — visible to everyone; only the host can draw */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0">
              <button
                onClick={onToggleWhiteboard}
                aria-pressed={whiteboardOpen}
                aria-label={whiteboardOpen ? t("live.hideWhiteboard") : t("live.openWhiteboard")}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
                  whiteboardOpen
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-700"
                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                )}
              >
                <Pencil className="h-5 w-5" />
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {whiteboardOpen
              ? t("live.hideWhiteboard")
              : isHost
                ? t("live.drawClass")
                : t("live.viewDrawing")}
          </TooltipContent>
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
          aria-label={t("live.raiseHand")}
        >
          <Hand className="h-5 w-5" />
        </button>
        <Separator orientation="vertical" className="hidden h-8 shrink-0 sm:block" />
        {/* Leave */}
        <button
          onClick={onLeave}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-red-500 px-4 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-colors hover:bg-red-600"
          aria-label={t("live.leaveClass")}
        >
          <PhoneOff className="h-4 w-4" />
          <span className="hidden sm:inline">{t("liveRoom.leave")}</span>
        </button>
      </div>
    </Card>
  );
}

/* ─── Live polls ────────────────────────────────────────── */

function PollPanel({
  polls,
  isHost,
  pollQuestion,
  setPollQuestion,
  pollOptions,
  setPollOptions,
  busyPoll,
  onCreate,
  onVote,
  onEnd,
}: {
  polls: Poll[];
  isHost: boolean;
  pollQuestion: string;
  setPollQuestion: (v: string) => void;
  pollOptions: string[];
  setPollOptions: (v: string[]) => void;
  busyPoll: string;
  onCreate: () => void;
  onVote: (pollId: string, optionIndex: number) => void;
  onEnd: (pollId: string) => void;
}) {
  const t = useT();
  const active = polls.filter((p) => !p.endedAt);

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold">{t("liveRoom.livePolls")}</h3>
        </div>
        <Badge variant="outline">{active.length} {t("liveRoom.open")}</Badge>
      </div>

      {isHost && (
        <div className="mb-4 space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-xs font-semibold text-muted-foreground">{t("liveRoom.askClass")}</p>
          <Input
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="e.g. Which word is a noun?"
            className="h-9 text-sm"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {pollOptions.map((option, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Input
                  value={option}
                  onChange={(e) =>
                    setPollOptions(pollOptions.map((o, idx) => (idx === i ? e.target.value : o)))
                  }
                  placeholder={`Option ${i + 1}`}
                  className="h-9 text-sm"
                />
                {pollOptions.length > 2 && (
                  <button
                    onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label={`Remove option ${i + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {pollOptions.length < 8 && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-xs"
                onClick={() => setPollOptions([...pollOptions, ""])}
              >
                <Plus className="h-3 w-3" /> Option
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 gap-1 bg-emerald-600 text-xs hover:bg-emerald-700"
              disabled={busyPoll === "create" || !pollQuestion.trim()}
              onClick={onCreate}
            >
              {busyPoll === "create" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Radio className="h-3 w-3" />
              )}
              Start poll
            </Button>
          </div>
        </div>
      )}

      {polls.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          {isHost ? t("liveRoom.noPollsHost") : t("liveRoom.noPollsStudent")}
        </p>
      ) : (
        <div className="space-y-3">
          {polls.slice(0, 5).map((poll) => {
            const showResults = Boolean(poll.endedAt || poll.voted);
            const totalVotes = poll.results?.reduce((sum, r) => sum + r.votes, 0) ?? 0;
            return (
              <div key={poll.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{poll.question}</p>
                  {poll.endedAt ? (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">{t("liveRoom.ended")}</Badge>
                  ) : (
                    <Badge className="shrink-0 bg-emerald-600 text-[10px] text-white">Live</Badge>
                  )}
                </div>
                <div className="space-y-1.5">
                  {poll.options.map((option, i) => {
                    const votes = poll.results?.find((r) => r.optionIndex === i)?.votes ?? 0;
                    const percent = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
                    return showResults ? (
                      <div key={i} className="relative overflow-hidden rounded-md bg-muted/50 px-3 py-2 text-xs">
                        <div
                          className="absolute inset-y-0 left-0 bg-emerald-100"
                          style={{ width: `${percent}%` }}
                        />
                        <div className="relative flex items-center justify-between gap-2">
                          <span className="font-medium">{option}</span>
                          <span className="shrink-0 font-bold text-emerald-700">{percent}%</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        key={i}
                        disabled={busyPoll === poll.id}
                        onClick={() => onVote(poll.id, i)}
                        className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" /> {totalVotes} vote{totalVotes === 1 ? "" : "s"}
                  </span>
                  {isHost && !poll.endedAt && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px]"
                      disabled={busyPoll === poll.id}
                      onClick={() => onEnd(poll.id)}
                    >
                      End poll
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
  const t = useT();
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
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
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
  const t = useT();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card className="flex h-[460px] flex-col overflow-hidden p-0 sm:h-[520px] lg:h-[calc(100vh-12rem)] lg:max-h-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-emerald-50 to-background px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquare className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="truncate text-sm font-bold text-foreground">{t("live.chatTitle")}</span>
        </div>
        <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700">
          <Users className="mr-1 h-3 w-3" />
          {onlineCount} {t("live.online")}
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="custom-scroll flex-1">
        <div className="space-y-3 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">{t("live.noMessages")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("live.firstHello")}
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
              className="h-10 w-10 shrink-0 bg-emerald-600 hover:bg-emerald-700"
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
              {t("live.loginChat")}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={onLoginPrompt}
              className="mt-2 gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" /> {t("live.loginChat")}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── Message rows ──────────────────────────────────────── */

function ChatMessageRow({ msg, isMe }: { msg: ChatMsg; isMe: boolean }) {
  const t = useT();
  return (
    <div className={cn("flex gap-2", isMe && "flex-row-reverse")}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={msg.userAvatar || undefined} />
        <AvatarFallback className="bg-emerald-100 text-[10px] font-bold text-emerald-700">
          {msg.userName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className={cn("max-w-[75%]", isMe && "text-right")}>
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-xs font-bold", isMe ? "text-emerald-600" : "text-foreground")}>
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
              ? "rounded-br-sm bg-emerald-600 text-white"
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
