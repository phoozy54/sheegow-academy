"use client";

import { useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("/?XTransformPort=3003", {
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
