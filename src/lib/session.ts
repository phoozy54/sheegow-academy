/**
 * PURE session-epoch helpers (SES-1). No DB, no cookies, no secrets — safe to
 * unit test directly. The epoch is the existing User.updatedAt value in ms,
 * so no migration or new column is required.
 */

export interface SessionUser {
  updatedAt: Date;
}

/** Session epoch captured at token issuance. */
export function sessionVersionOf(user: SessionUser): number {
  return user.updatedAt.getTime();
}

/** True only when a token still matches the user's current epoch. */
export function isCurrentSession(
  payload: { sessionVersion?: number },
  user: SessionUser
): boolean {
  return payload.sessionVersion === sessionVersionOf(user);
}

/**
 * Strictly advance a session epoch. `Math.max(now, current + 1)` guarantees
 * the epoch changes even if two revocations land in the same millisecond —
 * otherwise a token issued in that millisecond could survive revocation.
 */
export function nextSessionVersion(
  current: number,
  now: number = Date.now()
): number {
  return Math.max(now, current + 1);
}
