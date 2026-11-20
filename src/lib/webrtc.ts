"use client";

import type { Socket } from "socket.io-client";

/**
 * Real one-to-many audio/video for live classes.
 *
 * The teacher (or admin/super admin) publishes a single MediaStream obtained
 * from getUserMedia. The existing Socket.io chat service is used purely as a
 * WebRTC signaling relay: offers, answers and ICE candidates are forwarded
 * point-to-point. Students only receive the stream and keep using chat.
 *
 * Public STUN servers are used for NAT traversal. For restrictive networks a
 * TURN server would also be needed (add it to ICE_SERVERS).
 */

/**
 * Public STUN servers need no credentials. TURN credentials, if configured,
 * are short-lived and fetched from /api/rtc/ice — they must NEVER be exposed
 * through NEXT_PUBLIC_* because those values are baked into the browser bundle.
 */
const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

let iceServersCache: { servers: RTCIceServer[]; expiresAt: number } | null = null;

async function getIceServers(): Promise<RTCIceServer[]> {
  const now = Date.now();
  if (iceServersCache && iceServersCache.expiresAt > now) {
    return iceServersCache.servers;
  }
  try {
    const res = await fetch("/api/rtc/ice", {
      credentials: "include",
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as {
        iceServers?: RTCIceServer[];
        expiresIn?: number;
      };
      if (Array.isArray(data.iceServers)) {
        const ttl = Math.max(60, Number(data.expiresIn) || 300);
        iceServersCache = {
          servers: data.iceServers,
          expiresAt: now + ttl * 1000 - 30_000,
        };
        return data.iceServers;
      }
    }
  } catch {
    // Fall back to public STUN only.
  }
  return STUN_SERVERS;
}

export interface StreamManagerOptions {
  socket: Socket;
  classId: string;
  userId: string;
  userName: string;
  mode: "host" | "viewer";
  onRemoteStream?: (stream: MediaStream, fromUserId: string) => void;
  onBroadcastStarted?: (hostUserId?: string) => void;
  onBroadcastStopped?: () => void;
  onError?: (message: string) => void;
}

type SignalPayload = {
  toUserId?: string;
  fromUserId?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export class LiveStreamManager {
  private socket: Socket;
  private classId: string;
  private userId: string;
  private userName: string;
  private mode: "host" | "viewer";
  private opts: StreamManagerOptions;

  private localStream: MediaStream | null = null;
  private peers = new Map<string, RTCPeerConnection>();
  private pendingIce = new Map<string, RTCIceCandidateInit[]>();
  private broadcasting = false;
  private destroyed = false;

  constructor(opts: StreamManagerOptions) {
    this.opts = opts;
    this.socket = opts.socket;
    this.classId = opts.classId;
    this.userId = opts.userId;
    this.userName = opts.userName;
    this.mode = opts.mode;

    this.socket.on("broadcast-denied", this.onDenied);
    this.socket.on("broadcast-started", this.onStarted);
    this.socket.on("broadcast-stopped", this.onStopped);
    this.socket.on("viewer-joined", this.onViewerJoined);
    this.socket.on("webrtc-offer", this.onOffer);
    this.socket.on("webrtc-answer", this.onAnswer);
    this.socket.on("webrtc-ice", this.onIce);
  }

  get isBroadcasting() {
    return this.broadcasting;
  }

  getLocalStream() {
    return this.localStream;
  }

  /** Host: request camera + microphone and announce the broadcast. */
  async startBroadcast(): Promise<{ ok: boolean; error?: string }> {
    if (this.mode !== "host") {
      return { ok: false, error: "Only the teacher can start the stream" };
    }
    if (this.broadcasting && this.localStream) return { ok: true };

    if (typeof window !== "undefined" && !window.isSecureContext) {
      return {
        ok: false,
        error:
          "Camera and microphone need HTTPS. Open the site over https:// (localhost is also allowed).",
      };
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return {
        ok: false,
        error:
          "This browser cannot access the camera. Use an up-to-date browser over HTTPS.",
      };
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (e) {
      const err = e as DOMException;
      const messages: Record<string, string> = {
        NotAllowedError: "Camera and microphone permission was denied.",
        NotFoundError: "No camera or microphone was found on this device.",
        NotReadableError: "The camera is already in use by another app.",
      };
      return {
        ok: false,
        error: messages[err.name] || "Could not access the camera and microphone.",
      };
    }

    this.broadcasting = true;
    // The server requires a `join-class` registration before it accepts a
    // broadcast. If the socket is still connecting, queue this until connect
    // (the join-class listener in the view is registered first).
    this.emitWhenConnected("broadcast-start", {
      classId: this.classId,
      userId: this.userId,
      userName: this.userName,
    });
    return { ok: true };
  }

  /** Host: stop publishing and close every viewer connection. */
  stopBroadcast() {
    if (this.broadcasting) {
      this.emitWhenConnected("broadcast-stop", { classId: this.classId });
    }
    this.broadcasting = false;
    this.stopLocal();
    this.peers.forEach((_pc, id) => this.closePeer(id));
  }

  toggleMic(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  toggleCam(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }

  /** Remove all listeners and release devices. Call on unmount. */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.socket.off("broadcast-denied", this.onDenied);
    this.socket.off("broadcast-started", this.onStarted);
    this.socket.off("broadcast-stopped", this.onStopped);
    this.socket.off("viewer-joined", this.onViewerJoined);
    this.socket.off("webrtc-offer", this.onOffer);
    this.socket.off("webrtc-answer", this.onAnswer);
    this.socket.off("webrtc-ice", this.onIce);
    this.stopBroadcast();
  }

  /* ─── Signaling handlers ─────────────────────────────── */

  private onDenied = (payload: { message?: string }) => {
    this.broadcasting = false;
    this.stopLocal();
    this.opts.onError?.(payload?.message || "Could not start the stream");
  };

  private onStarted = (payload: { hostUserId?: string }) => {
    if (this.mode === "viewer") {
      this.opts.onBroadcastStarted?.(payload?.hostUserId);
    }
  };

  private onStopped = () => {
    // A host's stream ended — drop all viewer connections.
    if (this.mode === "viewer") {
      this.peers.forEach((_pc, id) => this.closePeer(id));
      this.pendingIce.clear();
      this.opts.onBroadcastStopped?.();
    }
  };

  private onViewerJoined = async (payload: { userId?: string }) => {
    const viewerId = payload?.userId;
    if (this.mode !== "host" || !this.broadcasting || !viewerId) return;
    if (viewerId === this.userId || this.peers.has(viewerId)) return;
    await this.createOfferFor(viewerId);
  };

  private onOffer = async (payload: SignalPayload) => {
    if (this.mode !== "viewer" || !payload.fromUserId || !payload.sdp) return;
    let pc = this.peers.get(payload.fromUserId);
    if (!pc) pc = await this.createViewerPeer(payload.fromUserId);
    try {
      await pc.setRemoteDescription(payload.sdp);
      await this.flushIce(payload.fromUserId);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit("webrtc-answer", {
        toUserId: payload.fromUserId,
        sdp: pc.localDescription,
      });
    } catch (e) {
      this.opts.onError?.("Failed to connect to the teacher's video");
      this.closePeer(payload.fromUserId);
    }
  };

  private onAnswer = async (payload: SignalPayload) => {
    if (this.mode !== "host" || !payload.fromUserId || !payload.sdp) return;
    const pc = this.peers.get(payload.fromUserId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(payload.sdp);
      await this.flushIce(payload.fromUserId);
    } catch {
      this.closePeer(payload.fromUserId);
    }
  };

  private onIce = async (payload: SignalPayload) => {
    if (!payload.fromUserId || !payload.candidate) return;
    const id = payload.fromUserId;
    const pc = this.peers.get(id);
    if (!pc || !pc.remoteDescription) {
      const list = this.pendingIce.get(id) || [];
      list.push(payload.candidate);
      this.pendingIce.set(id, list);
      return;
    }
    try {
      await pc.addIceCandidate(payload.candidate);
    } catch {
      // Ignore stale candidates from a closed peer.
    }
  };

  /* ─── Peer helpers ───────────────────────────────────── */

  private async createViewerPeer(hostUserId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({ iceServers: await getIceServers() });
    this.peers.set(hostUserId, pc);

    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      this.opts.onRemoteStream?.(stream, hostUserId);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("webrtc-ice", {
          toUserId: hostUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") this.closePeer(hostUserId);
    };

    return pc;
  }

  private async createOfferFor(viewerId: string) {
    if (!this.localStream) return;
    const pc = new RTCPeerConnection({ iceServers: await getIceServers() });
    this.peers.set(viewerId, pc);

    this.localStream.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream as MediaStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("webrtc-ice", {
          toUserId: viewerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.closePeer(viewerId);
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket.emit("webrtc-offer", {
        toUserId: viewerId,
        sdp: pc.localDescription,
      });
    } catch {
      this.closePeer(viewerId);
    }
  }

  private async flushIce(peerId: string) {
    const list = this.pendingIce.get(peerId);
    if (!list?.length) return;
    const pc = this.peers.get(peerId);
    this.pendingIce.delete(peerId);
    if (!pc) return;
    for (const candidate of list) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore stale candidates.
      }
    }
  }

  private closePeer(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      this.peers.delete(peerId);
    }
    this.pendingIce.delete(peerId);
  }

  /** Emit now, or queue until the signaling socket is connected. */
  private emitWhenConnected(event: string, payload: unknown) {
    if (this.socket.connected) {
      this.socket.emit(event, payload);
      return;
    }
    const onConnect = () => {
      this.socket.off("connect", onConnect);
      if (!this.destroyed) this.socket.emit(event, payload);
    };
    this.socket.on("connect", onConnect);
  }

  private stopLocal() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }
}
