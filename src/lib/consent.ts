/**
 * G1 / CONSENT-1 — signed, HttpOnly consent cookie.
 *
 * The banner choice is persisted in localStorage for the UI, but analytics
 * must not trust a client-controlled header. The server issues an HMAC-signed
 * cookie that cannot be forged by same-origin script or a direct request.
 *
 * No secret value is ever logged or returned to the client. Follows the same
 * fail-closed pattern as lib/auth.ts: a random dev-only secret, and a hard
 * requirement for JWT_SECRET in production.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CONSENT_COOKIE = "sheegow_consent";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type ConsentValue = "accepted" | "rejected";

const devSecret = randomBytes(32).toString("hex");

function secret(): string {
  const value = process.env.JWT_SECRET?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production (consent signing)");
  }
  return devSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Build the signed token: value.expiry.signature. */
export function signConsent(value: ConsentValue, now = Date.now()): string {
  const expires = now + CONSENT_MAX_AGE * 1000;
  const payload = `${value}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

/** Verify signature, value and expiry in constant time. Never throws. */
export function verifyConsent(
  raw: string | null | undefined,
  now = Date.now()
): ConsentValue | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [value, exp, signature] = parts;
  if (value !== "accepted" && value !== "rejected") return null;

  const expires = Number(exp);
  if (!Number.isSafeInteger(expires) || expires <= now) return null;

  let expected: string;
  try {
    expected = sign(`${value}.${exp}`);
  } catch {
    return null; // production without a configured secret -> fail closed
  }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

/** Set-Cookie header value for an accepted / rejected choice. */
export function consentCookie(value: ConsentValue, now = Date.now()): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CONSENT_COOKIE}=${signConsent(value, now)}; Path=/; Max-Age=${CONSENT_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
}

/** Set-Cookie header that withdraws consent. */
export function clearConsentCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CONSENT_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}

/** Read + verify the consent cookie from a raw Cookie header. */
export function readConsentFromCookieHeader(
  header: string | null | undefined
): ConsentValue | null {
  if (!header) return null;
  const part = header
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE}=`));
  if (!part) return null;
  return verifyConsent(part.slice(CONSENT_COOKIE.length + 1));
}
