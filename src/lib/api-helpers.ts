import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Return a 429 response when a key exceeds its window, otherwise null.
 * Call after requireAuth so authenticated endpoints can limit per user.
 */
export function limitRequest(
  key: string,
  limit: number,
  windowMs: number
) {
  const result = rateLimit(key, limit, windowMs);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Too many requests. Please wait before trying again." },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
  );
}

/**
 * Standard JSON error response helper.
 */
export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standard JSON success response helper.
 */
export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Map auth-related errors thrown by requireAuth / requireAdmin /
 * requireTeacherOrAdmin (which throw Error("UNAUTHORIZED" | "FORBIDDEN"))
 * to the proper HTTP response. Returns null when the error is not an
 * auth error so callers can fall back to a generic 500.
 */
export function handleAuthError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  if (message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
  if (message === "FORBIDDEN") return jsonError("Forbidden", 403);
  return null;
}

/**
 * G1 — body-size limiting lives in a framework-free module so it is testable.
 * Re-exported here for backwards compatibility with all existing routes.
 */
export {
  CONTENT_BODY_BYTES,
  MAX_BODY_BYTES,
  readBodyWithLimit,
  safeBody,
  safeBodyChecked,
} from "@/lib/body-limit";

/**
 * Tiny helper that returns the value of `obj[key]` when it is a non-empty
 * string, otherwise undefined. Useful for optional query filters.
 */
export function nonEmpty(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const v = value.trim();
  return v.length > 0 ? v : undefined;
}
