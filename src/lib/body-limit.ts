/**
 * G1 — pure, framework-free request-body size limiting.
 *
 * Kept separate from api-helpers.ts so it can be unit-tested with `bun test`
 * without importing `next/server`. api-helpers re-exports these symbols for
 * existing route handlers.
 *
 * Security note: the cap is enforced WHILE STREAMING. We never call
 * req.text() on an unbounded body, so a chunked request (no Content-Length)
 * or a forged short length cannot exhaust memory before rejection.
 */

/** Hard ceiling for public JSON request bodies (64 KiB). */
export const MAX_BODY_BYTES = 64 * 1024;

/** Ceiling for authenticated, content-heavy routes (lesson bodies, notes). */
export const CONTENT_BODY_BYTES = 256 * 1024;

export interface LimitedBody {
  text: string | null;
  tooLarge: boolean;
}

/**
 * Stream a request body with a hard byte cap.
 * 1. Reject an oversized declared Content-Length before reading anything.
 * 2. Read chunk by chunk and abort the stream as soon as the running total
 *    exceeds maxBytes — the response is rejected without buffering the rest.
 * 3. Decode only the buffered, in-bounds bytes (correct for multibyte UTF-8).
 */
export async function readBodyWithLimit(
  req: Request,
  maxBytes = MAX_BODY_BYTES
): Promise<LimitedBody> {
  const declared = req.headers.get("content-length");
  if (declared) {
    const length = Number(declared);
    if (Number.isFinite(length) && length > maxBytes) {
      await req.body?.cancel().catch(() => undefined);
      return { text: null, tooLarge: true };
    }
  }

  if (!req.body) return { text: null, tooLarge: false };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let released = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { text: null, tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    if (!released) {
      try {
        reader.releaseLock();
      } catch {
        /* reader may already be closed after cancel() */
      }
      released = true;
    }
  }

  if (total === 0) return { text: null, tooLarge: false };

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(merged), tooLarge: false };
}

export type SafeBodyResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: 400 | 413 };

/**
 * Parse a JSON body with a distinct 413 for oversized payloads. Used on public
 * endpoints where bad JSON and a size-limit rejection must be distinguishable.
 */
export async function safeBodyChecked<T = unknown>(
  req: Request,
  maxBytes = MAX_BODY_BYTES
): Promise<SafeBodyResult<T>> {
  try {
    const { text, tooLarge } = await readBodyWithLimit(req, maxBytes);
    if (tooLarge) return { ok: false, status: 413 };
    if (!text) return { ok: false, status: 400 };
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: 400 };
  }
}

/** Backwards-compatible helper: null on missing / invalid / oversized body. */
export async function safeBody<T = unknown>(
  req: Request,
  maxBytes = MAX_BODY_BYTES
): Promise<T | null> {
  const result = await safeBodyChecked<T>(req, maxBytes);
  return result.ok ? result.value : null;
}
