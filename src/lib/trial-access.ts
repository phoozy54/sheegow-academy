import { db } from "@/lib/db";
import {
  TRIAL_CLASS_PREFIX,
  TRIAL_METHOD,
  TRIAL_STATUSES,
  trialStillValid,
  trialTransactionId,
} from "@/lib/trial";

/**
 * True when an admin/super admin has approved a non-expired trial for this
 * student and this specific live class. The 7-day window starts at approval.
 */
export async function hasApprovedTrial(
  studentId: string,
  classId: string
): Promise<boolean> {
  const payment = await db.payment.findFirst({
    where: {
      studentId,
      method: TRIAL_METHOD,
      status: TRIAL_STATUSES.approved,
      transactionId: trialTransactionId(classId),
    },
    select: { couponCode: true },
  });
  return Boolean(payment && trialStillValid(payment.couponCode));
}

/** True when an approved trial covers a course (used by the enrollment gate). */
export async function hasApprovedTrialForCourse(
  studentId: string,
  courseId: string
): Promise<boolean> {
  const payment = await db.payment.findFirst({
    where: {
      studentId,
      courseId,
      method: TRIAL_METHOD,
      status: TRIAL_STATUSES.approved,
    },
    select: { couponCode: true },
  });
  return Boolean(payment && trialStillValid(payment.couponCode));
}

/** True when the student still has a pending trial request for this class. */
export async function hasPendingTrial(
  studentId: string,
  classId: string
): Promise<boolean> {
  const payment = await db.payment.findFirst({
    where: {
      studentId,
      method: TRIAL_METHOD,
      status: TRIAL_STATUSES.pending,
      transactionId: trialTransactionId(classId),
    },
    select: { id: true },
  });
  return Boolean(payment);
}

export { TRIAL_CLASS_PREFIX, TRIAL_METHOD, TRIAL_STATUSES };
