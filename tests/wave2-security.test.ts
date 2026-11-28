import { describe, expect, it } from "bun:test";
import {
  isCurrentSession,
  nextSessionVersion,
  sessionVersionOf,
} from "../src/lib/session";
import {
  courseGeneration,
  coursePaymentId,
  coursePaymentPrefix,
  replayablePayment,
} from "../src/lib/course-checkout";

const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text();

describe("SES-1 — refresh/session revocation", () => {
  const at = new Date("2026-11-28T10:00:00.000Z");
  const later = new Date("2026-11-28T10:05:00.000Z");

  it("session_version_matches_epoch", () => {
    expect(sessionVersionOf({ updatedAt: at })).toBe(at.getTime());
  });

  it("stale_token_is_rejected_current_token_accepted", () => {
    const issued = sessionVersionOf({ updatedAt: at });
    expect(isCurrentSession({ sessionVersion: issued }, { updatedAt: at })).toBe(
      true,
    );
    expect(
      isCurrentSession({ sessionVersion: issued }, { updatedAt: later }),
    ).toBe(false);
    expect(isCurrentSession({}, { updatedAt: at })).toBe(false);
  });

  it("revocation_epoch_always_strictly_increases", () => {
    expect(nextSessionVersion(1000, 1000)).toBe(1001);
    expect(nextSessionVersion(1000, 2000)).toBe(2000);
    expect(nextSessionVersion(1000, 999)).toBe(1001);
  });

  it("tokens_carry_epoch_and_routes_revoke_it", async () => {
    const auth = await read("../src/lib/auth.ts");
    expect(auth).toContain("sessionVersion?: number");
    expect(auth).toContain("nextSessionVersion,");
    expect(auth).toContain("new Date(nextSessionVersion(user.updatedAt.getTime()))");
    expect(auth).toContain("if (!isCurrentSession(payload, user)) return null");

    for (const route of ["register", "login", "refresh"]) {
      const source = await read(`../src/app/api/auth/${route}/route.ts`);
      expect(source).toContain("sessionVersion: sessionVersionOf(");
    }

    const refresh = await read("../src/app/api/auth/refresh/route.ts");
    expect(refresh).toContain("if (!isCurrentSession(payload, user))");

    const logout = await read("../src/app/api/auth/logout/route.ts");
    expect(logout).toContain('get("sheegow_refresh")');
    expect(logout).toContain("verifyRefreshToken(refreshToken)");
    expect(logout).toContain("isCurrentSession(payload, user)");
    expect(logout).toContain("revokeUserSessions(payload.userId)");
    expect(logout).toContain("limitRequest(`auth-logout:");
    expect(logout).toContain("await clearAuthCookies()");

    const change = await read("../src/app/api/auth/change-password/route.ts");
    expect(change).toContain("nextSessionVersion(dbUser.updatedAt.getTime())");
    expect(change).toContain("sessionVersion: sessionVersionOf(renewed)");

    const profile = await read("../src/app/api/users/me/route.ts");
    expect(profile).toContain("sessionVersion: sessionVersionOf(updated)");
  });
});

describe("ACL-1 — approved trial socket token", () => {
  it("trial_approved_student_is_not_rejected_by_broadcast_guard", async () => {
    const source = await read("../src/app/api/socket/token/route.ts");
    expect(source).toContain("!trialApproved &&");
    expect(source).toContain("!canBroadcast &&");
    expect(source).toContain("!isTeachingRole(user.role)");
    // The unpaid/enrollment gates must remain intact (fail closed).
    expect(source).toContain("if (user.role === \"student\" && !trialApproved)");
    expect(source).toContain("402");
  });
});

describe("PAY-1 — checkout idempotency + one-time coupon", () => {
  const prefix = coursePaymentPrefix("student-1", "course-1");

  it("prefix_is_stable_and_time_independent", () => {
    expect(prefix).toBe("course:student-1:course-1:");
    expect(coursePaymentPrefix("student-1", "course-1")).toBe(prefix);
    expect(coursePaymentPrefix("student-2", "course-1")).not.toBe(prefix);
  });

  it("generation_advances_after_refund_and_ignores_noise", () => {
    expect(courseGeneration([], prefix)).toBe(0);
    expect(
      courseGeneration([{ transactionId: `${prefix}0` }], prefix),
    ).toBe(1);
    // A refunded row stays in history, so a repurchase gets a fresh ID.
    expect(
      courseGeneration(
        [
          { transactionId: `${prefix}0` },
          { transactionId: `${prefix}1` },
          { transactionId: null },
          { transactionId: "demo_other" },
          { transactionId: `${prefix}not-a-number` },
        ],
        prefix,
      ),
    ).toBe(2);
  });

  it("payment_id_is_deterministic_and_scoped", () => {
    expect(coursePaymentId(prefix, 0)).toBe(coursePaymentId(prefix, 0));
    expect(coursePaymentId(prefix, 0)).not.toBe(coursePaymentId(prefix, 1));
    expect(coursePaymentId(prefix, 0)).not.toBe(
      coursePaymentId(coursePaymentPrefix("student-2", "course-1"), 0),
    );
    expect(coursePaymentId(prefix, 0)).toMatch(/^[0-9a-f]{24}$/);
  });

  it("completed_active_purchase_is_replayed_refund_is_not", () => {
    const completed = { transactionId: `${prefix}0`, status: "completed" };
    expect(replayablePayment([completed], prefix, 1)).toBe(completed);
    expect(
      replayablePayment(
        [{ transactionId: `${prefix}0`, status: "refunded" }],
        prefix,
        1,
      ),
    ).toBeNull();
    expect(replayablePayment([completed], prefix, 0)).toBeNull();
    expect(
      replayablePayment(
        [{ transactionId: "other", status: "completed" }],
        prefix,
        1,
      ),
    ).toBeNull();
  });

  it("checkout_uses_pk_idempotency_and_atomic_coupon_deactivation", async () => {
    const source = await read("../src/app/api/payments/checkout/route.ts");
    expect(source).toContain("coursePaymentPrefix(user.id, courseId)");
    expect(source).toContain("courseGeneration(history, prefix)");
    expect(source).toContain("coursePaymentId(prefix, generation)");
    expect(source).toContain("replayablePayment(history, prefix, generation)");
    expect(source).toContain("db.$transaction(async (tx) =>");
    expect(source).toContain("id: paymentId");
    expect(source).toContain("where: { id: fresh.id, active: true }");
    expect(source).toContain("claimed.count !== 1");
    expect(source).toContain("isPaymentPrimaryKeyConflict(e)");
    expect(source).toContain("alreadyPurchased: true");
    expect(source).toContain("existingEnrollment?.paymentId ? {}");
    // Server-side price is unchanged.
    expect(source).toContain("course.price * (1 - discount / 100)");

    const bundle = await read("../src/app/api/bundles/[id]/checkout/route.ts");
    expect(bundle).toContain("where: { id: fresh.id, active: true }");
    expect(bundle).toContain("claimed.count !== 1");
    expect(bundle).toContain('kind: "coupon_invalid"');
  });
});
