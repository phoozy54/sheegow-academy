import { NextResponse } from "next/server";

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
 * Safely parse a JSON request body. Returns null when the body is not
 * valid JSON or when the request has no body.
 */
export async function safeBody<T = unknown>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Tiny helper that returns the value of `obj[key]` when it is a non-empty
 * string, otherwise undefined. Useful for optional query filters.
 */
export function nonEmpty(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const v = value.trim();
  return v.length > 0 ? v : undefined;
}
