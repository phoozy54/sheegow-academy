/**
 * BL-1 — Bundle payment allocation + deterministic purchase identity.
 *
 * Pure helpers: no Next.js, no Prisma client, no env access.
 *
 * A bundle is paid with ONE invoice total but MUST produce one Payment row per
 * billable course so the existing `courseId`-based entitlement checks work and
 * `Enrollment.paymentId @unique` is never violated. Money is allocated in
 * integer cents to avoid Float drift; the remainder is deterministic.
 *
 * Idempotency is enforced by the DATABASE primary key, not by a read-then-write
 * check: all payments of one (student, bundle) purchase get deterministic IDs.
 * Two concurrent checkouts therefore collide on `Payment.id` (P2002) and only
 * the first one can create rows — no schema change and no time bucket (hence
 * no boundary race).
 */

export interface BundleCourseForAllocation {
  id: string;
  price: number;
}

export interface BundleAllocation {
  courseId: string;
  /** Major currency units, rounded to 2 decimals. */
  amount: number;
  /** Integer cents — the authoritative value used for accounting. */
  amountCents: number;
}

/**
 * Convert money to integer cents. A positive price that rounds below one cent
 * is still billable (1 cent), so a student is never left without a payment
 * row for a paid course. Zero/negative/invalid values are free.
 */
export function moneyToCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(1, Math.round(value * 100));
}

function toCents(value: number): number {
  return moneyToCents(value);
}

/**
 * Split `totalAmount` across billable courses (price > 0) pro-rata.
 * Free courses are excluded because they need no payment for access.
 * The sum of the returned `amountCents` always equals `moneyToCents(totalAmount)`.
 */
export function allocateBundleAmount(
  courses: BundleCourseForAllocation[],
  totalAmount: number,
): BundleAllocation[] {
  const billable = courses.filter((course) => toCents(course.price) > 0);
  const totalCents = toCents(totalAmount);
  if (billable.length === 0) return [];

  const weights = billable.map((course) => toCents(course.price));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);

  const cents = weights.map((weight) =>
    weightTotal > 0
      ? Math.floor((totalCents * weight) / weightTotal)
      : Math.floor(totalCents / billable.length),
  );

  // Distribute any remaining cents one at a time, in course order. This is
  // deterministic and guarantees the allocations sum to the charged total.
  let remainder = totalCents - cents.reduce((sum, value) => sum + value, 0);
  for (let i = 0; remainder > 0; i = (i + 1) % cents.length) {
    cents[i] = (cents[i] ?? 0) + 1;
    remainder -= 1;
  }

  return billable.map((course, index) => {
    const amountCents = cents[index] ?? 0;
    return {
      courseId: course.id,
      amountCents,
      amount: amountCents / 100,
    };
  });
}

/** Shared prefix for all bundle purchases. */
export function bundleTransactionPrefix(bundleId: string): string {
  return `bundle:${bundleId}:`;
}

/**
 * Stable base prefix for one student + one bundle. Time-independent.
 * A generation number is appended to allow exactly one fresh purchase after
 * a refund, without any time-bucket boundary race.
 */
export function bundlePurchasePrefix(bundleId: string, studentId: string): string {
  return `${bundleTransactionPrefix(bundleId)}${studentId}:`;
}

/** Prefix for one specific purchase generation. */
export function bundleGenerationPrefix(basePrefix: string, generation: number): string {
  return `${basePrefix}${generation}:`;
}

/**
 * Next purchase generation, derived from existing payment rows only.
 * Concurrent requests see the same number and collide on the same Payment.id.
 * A refunded generation yields the next number, so a legitimate repurchase
 * after a refund is possible.
 */
export function bundleGeneration(
  history: Array<{ transactionId: string | null }>,
  basePrefix: string,
): number {
  let max = -1;
  for (const payment of history) {
    const transactionId = payment.transactionId;
    if (!transactionId || !transactionId.startsWith(basePrefix)) continue;
    const part = transactionId.slice(basePrefix.length).split(":")[0] ?? "";
    if (!/^\d+$/.test(part)) continue;
    const value = Number(part);
    if (Number.isSafeInteger(value) && value > max) max = value;
  }
  return max + 1;
}

/**
 * Deterministic primary key for a payment inside one purchase.
 * The PK is the DB-level idempotency lock: a second concurrent request
 * inserting the same key gets P2002 and returns the original purchase.
 * Both parts are sanitized so even unexpected IDs stay URL-safe.
 */
export function bundlePaymentId(prefix: string, courseId: string): string {
  const safe = (value: string) => value.replace(/[^a-zA-Z0-9]/g, "_");
  return `bpay_${safe(prefix)}${safe(courseId)}`;
}

export interface PurchaseRowForReplay {
  status: string;
  courseId: string | null;
}

/**
 * A purchase may only be replayed when its generation is clean and complete:
 * every row is completed and every billable course has a payment row.
 * A partially refunded generation must instead advance to a fresh purchase,
 * otherwise the refunded course stays locked forever.
 */
export function isReplayEligiblePurchase(
  rows: PurchaseRowForReplay[],
  billableCourseIds: string[],
): boolean {
  if (rows.length === 0) return false;
  if (rows.some((row) => row.status !== "completed")) return false;
  const paidCourseIds = new Set(
    rows.filter((row) => row.courseId).map((row) => row.courseId as string),
  );
  return billableCourseIds.every((courseId) => paidCourseIds.has(courseId));
}

/** Sum Float payment amounts as integer cents (no 0.30000000000000004). */
export function sumPaymentCents(payments: Array<{ amount: number }>): number {
  return payments.reduce((sum, payment) => sum + moneyToCents(payment.amount), 0);
}

/** Clamp a coupon percentage into the safe 0–100 range. */
export function clampDiscount(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}
