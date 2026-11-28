import { createHash } from "crypto";

/**
 * PAY-1 — single-course checkout identity helpers.
 *
 * Payment.id is derived deterministically from (student, course, generation),
 * the same primary-key idempotency pattern already reviewed for BL-1 bundles.
 * Two concurrent checkouts therefore race for the SAME primary key: one wins,
 * the loser gets P2002 and replays the winner's payment instead of creating a
 * second charge. No time bucket, no schema change.
 */

/** Stable, time-independent prefix for one student/course purchase line. */
export function coursePaymentPrefix(studentId: string, courseId: string): string {
  return `course:${studentId}:${courseId}:`;
}

/**
 * Next generation from existing payment transactionIds. A refunded payment
 * keeps its row, so the generation advances and a legitimate repurchase gets
 * fresh IDs. Malformed suffixes are ignored — never reuse or guess an ID.
 */
export function courseGeneration(
  history: Array<{ transactionId: string | null }>,
  prefix: string
): number {
  let max = -1;
  for (const row of history) {
    const transactionId = row.transactionId;
    if (!transactionId || !transactionId.startsWith(prefix)) continue;
    const suffix = transactionId.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) continue;
    const value = Number(suffix);
    if (Number.isSafeInteger(value) && value > max) max = value;
  }
  return max + 1;
}

/** URL-safe, collision-resistant Payment.id (24 hex characters). */
export function coursePaymentId(prefix: string, generation: number): string {
  return createHash("sha256")
    .update(`${prefix}${generation}`)
    .digest("hex")
    .slice(0, 24);
}

export interface CoursePaymentRow {
  transactionId: string | null;
  status: string;
}

/**
 * Payment of the ACTIVE generation, when that purchase was completed.
 * Sequential retries / double-clicks separated in time replay the original
 * payment (200) instead of advancing the generation and charging again.
 * A refunded/failed/pending row is NOT replayable, so a genuine repurchase
 * after a refund still gets a fresh generation.
 */
export function replayablePayment<T extends CoursePaymentRow>(
  history: T[],
  prefix: string,
  generation: number
): T | null {
  if (generation <= 0) return null;
  const activeTransactionId = `${prefix}${generation - 1}`;
  const row = history.find(
    (item) => item.transactionId === activeTransactionId
  );
  return row && row.status === "completed" ? row : null;
}
