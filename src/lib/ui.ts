// UI helpers for SHEEGOW ACADEMY
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LEVEL_STYLES: Record<string, string> = {
  Beginner: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Intermediate: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Advanced: "bg-violet-100 text-violet-700 border-violet-200",
  IELTS: "bg-amber-100 text-amber-700 border-amber-200",
  Kids: "bg-pink-100 text-pink-700 border-pink-200",
};

export function levelBadgeClass(level: string): string {
  return LEVEL_STYLES[level] || "bg-muted text-muted-foreground border-border";
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function isLiveNow(scheduledAt: string, duration: number, status: string): boolean {
  if (status === "live") return true;
  if (status === "ended") return false;
  const now = Date.now();
  const start = new Date(scheduledAt).getTime();
  const end = start + duration * 60 * 1000;
  return now >= start && now <= end;
}
