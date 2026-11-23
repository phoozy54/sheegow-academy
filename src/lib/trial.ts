/**
 * Manual trial access to a paid live class.
 *
 * There is no separate DB table: a trial request is a Payment row with
 * method="trial". Its `transactionId` stores `class:<liveClassId>` so the
 * request stays scoped to ONE class. Admin approval simply flips the status
 * from "pending" to "completed", which the existing enrollment/payment gates
 * already understand. No production migration is required.
 */

export const TRIAL_METHOD = "trial";
export const TRIAL_CLASS_PREFIX = "class:";
export const TRIAL_DAYS = 7;

export function trialTransactionId(classId: string): string {
  return `${TRIAL_CLASS_PREFIX}${classId}`;
}

export function classIdFromTrial(transactionId: string | null | undefined): string | null {
  if (!transactionId || !transactionId.startsWith(TRIAL_CLASS_PREFIX)) return null;
  return transactionId.slice(TRIAL_CLASS_PREFIX.length) || null;
}

export function trialExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export const TRIAL_STATUSES = {
  pending: "pending",
  approved: "completed",
  rejected: "failed",
} as const;

/**
 * Payment.couponCode carries the audit trail for an approval:
 *   approvedBy:<adminId>:<approvalEpochMs>
 * The timestamp makes the 7-day window start at approval time, not at the
 * moment the student submitted the request (which could sit pending for days).
 */
export function trialApprovalStamp(adminId: string, at: Date = new Date()): string {
  return `approvedBy:${adminId}:${at.getTime()}`;
}

export function approverId(couponCode: string | null | undefined): string | null {
  if (!couponCode?.startsWith("approvedBy:")) return null;
  return couponCode.split(":")[1] || null;
}

export function approvedTrialAt(couponCode: string | null | undefined): Date | null {
  if (!couponCode?.startsWith("approvedBy:")) return null;
  const ts = Number(couponCode.split(":")[2]);
  return Number.isFinite(ts) && ts > 0 ? new Date(ts) : null;
}

/** True when approval happened within the last TRIAL_DAYS days. */
export function trialStillValid(couponCode: string | null | undefined): boolean {
  const approvedAt = approvedTrialAt(couponCode);
  if (!approvedAt) return false;
  return approvedAt.getTime() >= Date.now() - TRIAL_DAYS * 24 * 60 * 60 * 1000;
}
