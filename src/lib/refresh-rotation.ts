/**
 * G2 / AUTH-3 — single-use refresh tokens without a database migration.
 *
 * The database has no session/token table, and adding one needs a first-ever
 * Prisma migration plus a backup. Instead we keep the rotation cursor in a
 * signed, HttpOnly cookie holding the current and previous refresh jti, bound
 * to the owning user and rotation family. An attacker who replays an old
 * refresh token cannot forge this cookie, so the mismatch is detected and the
 * whole session family is revoked.
 *
 * Cookie is opaque, HttpOnly and signed. No secret value is logged or returned
 * to the client.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ROTATION_COOKIE = "sheegow_rot";
export const ROTATION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const devSecret = randomBytes(32).toString("hex");

function secret(): string {
  const value = process.env.JWT_REFRESH_SECRET?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_REFRESH_SECRET must be set in production (refresh rotation)");
  }
  return devSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export interface RotationState {
  current: string;
  previous: string | null;
  expires: number;
  userId: string;
  familyId: string;
}

/** Build the signed cursor. `previous` is null on the very first issue. */
export function issueRotation(
  current: string,
  previous: string | null,
  userId: string,
  familyId: string,
  now = Date.now()
): string {
  const expires = now + ROTATION_MAX_AGE * 1000;
  const payload = `${current}.${previous ?? "-"}.${expires}.${userId}.${familyId}`;
  return `${payload}.${sign(payload)}`;
}

/** Verify + parse. Returns null for forged, malformed or expired cursors. */
export function readRotation(
  raw: string | null | undefined,
  now = Date.now()
): RotationState | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 6) return null;
  const [current, previousRaw, expRaw, userId, familyId, signature] = parts;
  if (!current || current === "-" || !expRaw || !userId || !familyId || !signature) {
    return null;
  }

  const expires = Number(expRaw);
  if (!Number.isSafeInteger(expires) || expires <= now) return null;

  const signedPayload = `${current}.${previousRaw}.${expRaw}.${userId}.${familyId}`;
  let expected: string;
  try {
    expected = sign(signedPayload);
  } catch {
    return null; // fail closed when production secret is missing
  }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return {
    current,
    previous: previousRaw === "-" ? null : previousRaw,
    expires,
    userId,
    familyId,
  };
}

export type RotationDecision = "legacy" | "current" | "previous" | "reuse";

/**
 * Decide what to do with a refresh token's jti.
 * - legacy: pre-G2 refresh token (no jti) presented with no cursor — allowed
 *   once so the next rotation can issue a hardened replacement.
 * - current/previous: normal, or a two-tab race — allow and rotate.
 * - reuse: a G2 token with no cursor, a stale jti, or a cursor belonging to a
 *   different user/family. Revoke the whole family.
 *
 * A G2 token (with jti) is NEVER accepted without a matching signed cursor.
 * This closes the cross-client replay path where a stolen refresh cookie is
 * presented by a browser that simply has no `sheegow_rot` cookie.
 */
export function classifyRotation(
  rotation: RotationState | null,
  tokenJti: string | undefined,
  tokenUserId?: string,
  tokenFamilyId?: string
): RotationDecision {
  if (!tokenJti) return rotation ? "reuse" : "legacy";
  if (!rotation) return "reuse";
  if (!tokenUserId || !tokenFamilyId) return "reuse";
  if (rotation.userId !== tokenUserId || rotation.familyId !== tokenFamilyId) {
    return "reuse";
  }
  if (rotation.current === tokenJti) return "current";
  if (rotation.previous === tokenJti) return "previous";
  return "reuse";
}
