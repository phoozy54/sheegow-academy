"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Eraser, Trash2, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

/* ─── Types ─────────────────────────────────────────────── */

// A single line segment drawn on the canvas. Synced over the socket as-is.
interface Stroke {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
}

interface WhiteboardProps {
  socket: Socket | null;
  classId: string;
  /** Hosts (admin/teacher/super_admin with canBroadcast) can draw. */
  canDraw: boolean;
  userId: string;
  /** Re-fires the "request state" effect when the parent's connection flips. */
  socketConnected?: boolean;
}

/* ─── Constants ─────────────────────────────────────────── */

// Six preset colors tuned for legibility on a white canvas.
// `nameKey` is the i18n key used to resolve the localized color name.
const PRESET_COLORS: { nameKey: string; value: string }[] = [
  { nameKey: "whiteboard.colorBlack", value: "#1f2937" },
  { nameKey: "whiteboard.colorRed", value: "#ef4444" },
  { nameKey: "whiteboard.colorBlue", value: "#2563eb" },
  { nameKey: "whiteboard.colorGreen", value: "#16a34a" },
  { nameKey: "whiteboard.colorAmber", value: "#f59e0b" },
  { nameKey: "whiteboard.colorIndigo", value: "#10b981" },
];

const CANVAS_BG = "#ffffff";
const MIN_BRUSH = 2;
const MAX_BRUSH = 20;

/* ─── Component ─────────────────────────────────────────── */

export function Whiteboard({
  socket,
  classId,
  canDraw,
  userId,
  socketConnected,
}: WhiteboardProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing state held in refs so handlers don't depend on stale closures.
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const dprRef = useRef(1);

  // Visual toolbar state.
  const [color, setColor] = useState(PRESET_COLORS[0].value);
  const [brushSize, setBrushSize] = useState(4);
  const [eraser, setEraser] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Keep the latest draw settings in a ref so socket handlers read fresh
  // values without re-subscribing on every change.
  const colorRef = useRef(color);
  const brushRef = useRef(brushSize);
  const eraserRef = useRef(eraser);
  const canDrawRef = useRef(canDraw);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    brushRef.current = brushSize;
  }, [brushSize]);
  useEffect(() => {
    eraserRef.current = eraser;
  }, [eraser]);
  useEffect(() => {
    canDrawRef.current = canDraw;
  }, [canDraw]);

  /* ─── Canvas setup: high-DPI scaling + resize preservation ─── */
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    // Skip when the container is hidden (e.g. behind a mobile tab) — otherwise
    // we'd shrink the canvas to ~1×1 and lose every stroke that was on it.
    if (rect.width < 10 || rect.height < 10) return;

    const targetW = Math.max(1, Math.floor(width * dpr));
    const targetH = Math.max(1, Math.floor(height * dpr));

    // No-op if the device-pixel size hasn't changed.
    if (canvas.width === targetW && canvas.height === targetH) {
      dprRef.current = dpr;
      return;
    }

    // Snapshot the existing canvas so we can paint it back after resizing.
    let snapshot: HTMLCanvasElement | null = null;
    if (canvas.width > 0 && canvas.height > 0) {
      snapshot = document.createElement("canvas");
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      const snapCtx = snapshot.getContext("2d");
      if (snapCtx) snapCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = targetW;
    canvas.height = targetH;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Scale the transform once so every draw call uses CSS pixels.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    dprRef.current = dpr;

    if (snapshot) {
      ctx.drawImage(snapshot, 0, 0, width, height);
    }
  }, []);

  // Initial paint + responsive resize via ResizeObserver.
  useEffect(() => {
    setupCanvas();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => setupCanvas());
    ro.observe(container);
    return () => ro.disconnect();
  }, [setupCanvas]);

  /* ─── Canvas primitives ──────────────────────────────────── */
  const drawStroke = useCallback((s: Stroke) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.beginPath();
    ctx.moveTo(s.x0, s.y0);
    ctx.lineTo(s.x1, s.y1);
    ctx.stroke();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = dprRef.current;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);
  }, []);

  const restoreFromDataURL = useCallback((dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = dprRef.current;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
    };
    img.onerror = () => {
      /* ignore malformed snapshots */
    };
    img.src = dataUrl;
  }, []);

  /* ─── Socket listeners ──────────────────────────────────── */
  useEffect(() => {
    if (!socket) return;

    const onDraw = (payload: { stroke?: Stroke }) => {
      if (payload?.stroke) drawStroke(payload.stroke);
    };
    const onClear = () => clearCanvas();
    const onState = (payload: { state?: string }) => {
      if (payload?.state) restoreFromDataURL(payload.state);
    };
    const onRequestState = () => {
      // Only the host has the authoritative canvas — reply with the snapshot.
      if (!canDrawRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const dataUrl = canvas.toDataURL("image/png");
        socket.emit("whiteboard-state", { classId, userId, state: dataUrl });
      } catch {
        // toDataURL can throw if the canvas is tainted by cross-origin content.
      }
    };

    // Viewers (and reconnecting hosts) ask for the current canvas whenever
    // the socket (re)connects so a dropped connection doesn't strand them
    // on an empty whiteboard.
    const requestCurrentState = () => {
      if (canDrawRef.current) return;
      socket.emit("whiteboard-request-state", { classId, userId });
    };
    if (socket.connected) requestCurrentState();
    socket.on("connect", requestCurrentState);

    socket.on("whiteboard-draw", onDraw);
    socket.on("whiteboard-clear", onClear);
    socket.on("whiteboard-state", onState);
    socket.on("whiteboard-request-state", onRequestState);

    return () => {
      socket.off("whiteboard-draw", onDraw);
      socket.off("whiteboard-clear", onClear);
      socket.off("whiteboard-state", onState);
      socket.off("whiteboard-request-state", onRequestState);
      socket.off("connect", requestCurrentState);
    };
  }, [socket, classId, userId, drawStroke, clearCanvas, restoreFromDataURL]);

  /* ─── Viewer: request the current canvas once connected ─── */
  // `socketConnected` is passed by the parent so this effect re-fires when
  // the live-room view's socket transitions to "connected" — even if the
  // socket reference itself did not change.
  useEffect(() => {
    if (!socket || !socket.connected) return;
    if (canDraw) return; // host owns the canvas — no need to ask
    socket.emit("whiteboard-request-state", { classId, userId });
  }, [socket, classId, userId, canDraw, socketConnected]);

  /* ─── Pointer drawing (mouse + touch via PointerEvents) ─── */
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    const point = getCanvasPoint(e);
    if (!point) return;
    drawingRef.current = true;
    lastPointRef.current = point;
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* some browsers throw if the pointer is already released */
    }
    // Paint a dot at the start so single taps also leave a mark.
    const stroke: Stroke = {
      x0: point.x,
      y0: point.y,
      x1: point.x,
      y1: point.y,
      color: eraserRef.current ? CANVAS_BG : colorRef.current,
      size: brushRef.current,
    };
    drawStroke(stroke);
    if (socket?.connected) {
      socket.emit("whiteboard-draw", { classId, userId, stroke });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || !drawingRef.current) return;
    const point = getCanvasPoint(e);
    const last = lastPointRef.current;
    if (!point || !last) return;
    const stroke: Stroke = {
      x0: last.x,
      y0: last.y,
      x1: point.x,
      y1: point.y,
      color: eraserRef.current ? CANVAS_BG : colorRef.current,
      size: brushRef.current,
    };
    drawStroke(stroke);
    lastPointRef.current = point;
    if (socket?.connected) {
      socket.emit("whiteboard-draw", { classId, userId, stroke });
    }
  };

  const endStroke = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  /* ─── Host actions ─────────────────────────────────────── */
  const handleClear = () => {
    clearCanvas();
    if (socket?.connected) {
      socket.emit("whiteboard-clear", { classId, userId });
    }
    setShowClearConfirm(false);
    toast.success(t("whiteboard.clearedToast"));
  };

  const handleEraseToggle = () => {
    setEraser((v) => !v);
  };

  /* ─── Render ────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-3">
      {canDraw && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 shadow-sm">
          {/* Color palette */}
          <div className="flex items-center gap-1" role="radiogroup" aria-label={t("whiteboard.brushColorAria")}>
            {PRESET_COLORS.map((c) => {
              const selected = !eraser && color === c.value;
              const colorName = t(c.nameKey);
              return (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={colorName}
                  title={colorName}
                  onClick={() => {
                    setColor(c.value);
                    setEraser(false);
                  }}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
                    selected
                      ? "border-foreground ring-2 ring-foreground/20"
                      : "border-border"
                  )}
                  style={{ backgroundColor: c.value }}
                />
              );
            })}
          </div>

          <Separator />

          {/* Brush size slider */}
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" aria-hidden />
            <Slider
              value={[brushSize]}
              min={MIN_BRUSH}
              max={MAX_BRUSH}
              step={1}
              onValueChange={(v) => setBrushSize(v[0] ?? brushSize)}
              className="w-24"
              aria-label={t("whiteboard.brushSizeAria")}
            />
            <span className="w-6 text-center text-xs font-medium tabular-nums text-muted-foreground">
              {brushSize}
            </span>
          </div>

          <Separator />

          {/* Eraser */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  size="sm"
                  variant={eraser ? "default" : "outline"}
                  onClick={handleEraseToggle}
                  aria-pressed={eraser}
                  className={cn(
                    "gap-1.5",
                    eraser && "bg-amber-500 text-white hover:bg-amber-600"
                  )}
                >
                  <Eraser className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {eraser ? t("whiteboard.erasing") : t("whiteboard.eraser")}
                  </span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {eraser ? t("whiteboard.eraserTooltipOn") : t("whiteboard.eraserTooltipOff")}
            </TooltipContent>
          </Tooltip>

          {/* Clear with confirmation */}
          <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
            <AlertDialogTrigger asChild>
              <span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("whiteboard.clear")}</span>
                </Button>
              </span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("whiteboard.clearTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("whiteboard.clearDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("whiteboard.clearCancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClear}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {t("whiteboard.clearConfirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="ml-auto flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Pencil className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
            <span className="hidden sm:inline">{t("whiteboard.drawingLive")}</span>
          </div>
        </div>
      )}

      {/* Canvas surface */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border bg-white shadow-inner"
        style={{ height: "clamp(280px, 48vh, 560px)" }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
          className={cn(
            "block h-full w-full touch-none select-none",
            canDraw ? "cursor-crosshair" : "cursor-default"
          )}
          aria-label={
            canDraw
              ? t("whiteboard.canvasDrawAria")
              : t("whiteboard.canvasViewAria")
          }
        />

        {!canDraw && (
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
            <Pencil className="h-3 w-3" aria-hidden />
            {t("whiteboard.viewingTeacher")}
          </div>
        )}

        {/* Watermark indicator for hosts */}
        {canDraw && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 backdrop-blur">
            {t("whiteboard.hostBadge")}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Small internal separator ──────────────────────────── */

function Separator() {
  return <div className="mx-0.5 h-6 w-px shrink-0 bg-border" aria-hidden />;
}
