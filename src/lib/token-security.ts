/**
 * G2 / JWT-1 + SOCK-1 — shared token claim constants and helpers.
 *
 * Pure module: no secrets, no I/O. `iss`/`aud` are added to every newly issued
 * token. Verification is conditional for these claims during the transition
 * window (tokens issued before G2 legitimately omit them), but the signature
 * algorithm is always pinned to HS256 by the verifiers in lib/auth.ts.
 */

import { randomUUID } from "node:crypto";

export const TOKEN_ISSUER = "sheegow-academy";
export const API_AUDIENCE = "sheegow-academy-api";
export const CHAT_AUDIENCE = "sheegow-academy-chat";

/** Unique token id — enables single-use refresh and socket identity tracking. */
export function newJti(): string {
  return randomUUID();
}

/** A rotation family survives multiple refreshes within one login session. */
export function newFamilyId(): string {
  return randomUUID();
}

/**
 * Transition-safe claim check: a missing claim means "legacy token", which we
 * still accept once and then replace at the next rotation. A PRESENT claim that
 * does not match is always rejected — an attacker cannot remove it without
 * breaking the signature.
 */
export function claimAllowsLegacy(
  payload: object,
  claim: string,
  expected: string
): boolean {
  const value = (payload as Record<string, unknown>)[claim];
  return value === undefined || value === null || value === expected;
}
