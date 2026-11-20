"use client";

import { useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let tokenTimer: ReturnType<typeof setInterval> | null = null;
let authPending: Promise<boolean> | null = null;
let currentClassId: string | null = null;
let currentMode: "host" | "viewer" | undefined = undefined;

/**
 * Default production chat service (same URL used in DEPLOYMENT.md).
 * Override it with NEXT_PUBLIC_CHAT_URL in Vercel if your Render service has
 * a different name. Never leave an http:// URL here on an https:// domain —
 * the browser will block it as mixed content.
 */
const PRODUCTION_CHAT_URL = "https://sheegow-chat.onrender.com";

async function fetchSocketToken(
  classId: string | null,
  mode?: "host" | "viewer"
): Promise<string | null> {
  try {
    const params = new URLSearchParams();
    if (classId) params.set("classId", classId);
    if (mode) params.set("mode", mode);
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/socket/token${query}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("sheegow:socket-auth-error", {
            detail: {
              message: data?.error || "You are not allowed to join this class.",
              status: res.status,
            },
          })
        );
      }
      return null;
    }
    const data = (await res.json().catch(() => null)) as { token?: string } | null;
    return typeof data?.token === "string" ? data.token : null;
  } catch {
    return null;
  }
}

/**
 * The signaling service requires a short-lived, signed token so it can trust
 * the user's identity. In local development the chat service allows anonymous
 * connections, so a failed token fetch is non-fatal there.
 */
async function authenticateAndConnect(s: Socket, isProd: boolean) {
  if (authPending) return authPending;
  authPending = (async () => {
    const token = await fetchSocketToken(currentClassId, currentMode);
    if (token) {
      s.auth = { token };
      s.connect();
      return true;
    }
    if (isProd) {
      // Fail closed in production — an anonymous socket is not allowed.
      console.warn("[socket] Could not obtain signaling token. Check that you are logged in.");
      return false;
    }
    s.connect();
    return true;
  })();
  try {
    return await authPending;
  } finally {
    authPending = null;
  }
}

/**
 * Returns the singleton socket.io client.
 *
 * - Production (Vercel + domain): connects directly to the Render chat
 *   service. This carries both chat AND WebRTC signaling for live video.
 * - Development (sandbox): connects through the Caddy gateway using the
 *   XTransformPort query so the local chat service on port 3003 is reachable.
 */
export function getSocket(classId?: string, mode?: "host" | "viewer"): Socket {
  const requestedClassId = classId || null;
  const requestedMode = mode;
  // Token is class+mode-scoped — reconnect if either changed.
  if (
    socket &&
    (currentClassId !== requestedClassId || currentMode !== requestedMode)
  ) {
    disconnectSocket();
  }
  currentClassId = requestedClassId;
  currentMode = requestedMode;

  if (!socket) {
    const configured = process.env.NEXT_PUBLIC_CHAT_URL?.trim();
    const isProd = process.env.NODE_ENV === "production";
    const target =
      configured || (isProd ? PRODUCTION_CHAT_URL : "/?XTransformPort=3003");

    if (isProd && !configured) {
      console.warn(
        `[socket] NEXT_PUBLIC_CHAT_URL is not set — using ${PRODUCTION_CHAT_URL}. ` +
          "Set it in Vercel → Environment Variables to your Render chat URL."
      );
    }
    if (
      isProd &&
      target.startsWith("http://") &&
      typeof window !== "undefined" &&
      window.location.protocol === "https:"
    ) {
      console.warn(
        "[socket] Chat URL uses http:// on an https:// page. Mixed content will " +
          "be blocked — use an https:// chat URL."
      );
    }

    socket = io(target, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    void authenticateAndConnect(socket, isProd);

    // Keep a fresh token in `socket.auth` so every reconnect is authorized.
    if (!tokenTimer && typeof window !== "undefined") {
      tokenTimer = setInterval(async () => {
        const s = socket;
        if (!s) return;
        const token = await fetchSocketToken(currentClassId, currentMode);
        if (token) s.auth = { token };
      }, 4 * 60 * 1000);
    }
  }
  return socket;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const s = getSocket();
  s.on("connect", () => setConnected(true));
  s.on("disconnect", () => setConnected(false));
  return { socket: s, connected };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (tokenTimer) {
    clearInterval(tokenTimer);
    tokenTimer = null;
  }
}
