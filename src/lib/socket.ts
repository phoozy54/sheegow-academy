"use client";

import { useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Returns the singleton socket.io client.
 *
 * In development (sandbox), connects through the Caddy gateway:
 *   io("/?XTransformPort=3003")
 *
 * In production, connects directly to the Render-hosted chat service:
 *   io(NEXT_PUBLIC_CHAT_URL)   e.g. "https://sheegow-chat.onrender.com"
 */
export function getSocket(): Socket {
  if (!socket) {
    const chatUrl = process.env.NEXT_PUBLIC_CHAT_URL;
    // If NEXT_PUBLIC_CHAT_URL is set (production), connect to it directly.
    // Otherwise (dev sandbox) use the Caddy gateway with XTransformPort.
    const target = chatUrl || "/?XTransformPort=3003";

    socket = io(target, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const s = getSocket();
  if (!s.connected) s.connect();
  s.on("connect", () => setConnected(true));
  s.on("disconnect", () => setConnected(false));
  return { socket: s, connected };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
