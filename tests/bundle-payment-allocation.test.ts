import { describe, expect, it } from "bun:test";
import {
  allocateBundleAmount,
  bundleGeneration,
  bundleGenerationPrefix,
  bundlePaymentId,
  bundlePurchasePrefix,
  bundleTransactionPrefix,
  clampDiscount,
  isReplayEligiblePurchase,
  moneyToCents,
  sumPaymentCents,
} from "../src/lib/bundle-checkout";

const courses = [
  { id: "cheap", price: 30 },
  { id: "expensive", price: 70 },
  { id: "free", price: 0 },
];

describe("BL-1 — bundle payment allocation", () => {
  it("bundle_allocation_sums_exactly: allocations always equal the charged total", () => {
    for (const total of [0, 0.01, 9.99, 10, 80, 123.45]) {
      const allocations = allocateBundleAmount(courses, total);
      const sum = allocations.reduce((acc, row) => acc + row.amountCents, 0);
      expect(sum).toBe(Math.round(total * 100));
    }
  });

  it("bundle_allocation_pro_rata: 30/70 split of 80 is 24/56", () => {
    const allocations = allocateBundleAmount(courses, 80);
    expect(allocations).toHaveLength(2);
    expect(allocations.find((row) => row.courseId === "cheap")?.amount).toBe(24);
    expect(allocations.find((row) => row.courseId === "expensive")?.amount).toBe(56);
  });

  it("remainder is distributed deterministically one cent at a time", () => {
    const three = [
      { id: "a", price: 10 },
      { id: "b", price: 10 },
      { id: "c", price: 10 },
    ];
    const allocations = allocateBundleAmount(three, 10.01);
    expect(allocations.map((row) => row.amountCents)).toEqual([334, 334, 333]);
    expect(allocations.reduce((sum, row) => sum + row.amountCents, 0)).toBe(1001);
  });

  it("bundle_zero_amount_still_creates_payment rows (100% coupon)", () => {
    const allocations = allocateBundleAmount(courses, 0);
    expect(allocations).toHaveLength(2);
    expect(allocations.every((row) => row.amount === 0)).toBe(true);
  });

  it("bundle_free_courses_excluded: free course never gets a payment row", () => {
    const allocations = allocateBundleAmount(courses, 80);
    expect(allocations.some((row) => row.courseId === "free")).toBe(false);
  });

  it("coupon discount is clamped and transaction prefix is stable", () => {
    expect(clampDiscount(-20)).toBe(0);
    expect(clampDiscount(150)).toBe(100);
    expect(clampDiscount(25)).toBe(25);
    expect(bundleTransactionPrefix("bundle-1")).toBe("bundle:bundle-1:");
  });

  it("moneyToCents keeps tiny positive prices billable", () => {
    expect(moneyToCents(0)).toBe(0);
    expect(moneyToCents(-5)).toBe(0);
    expect(moneyToCents(9.99)).toBe(999);
    expect(moneyToCents(0.001)).toBe(1);
  });

  it("a tiny positive-priced course still gets an allocation/payment row", () => {
    const allocations = allocateBundleAmount(
      [
        { id: "tiny", price: 0.001 },
        { id: "normal", price: 10 },
      ],
      10,
    );
    expect(allocations.map((row) => row.courseId)).toContain("tiny");
    expect(allocations.reduce((sum, row) => sum + row.amountCents, 0)).toBe(1000);
  });

  it("bundle_payment_ids_are_permanent_and_unique (no time-bucket race)", () => {
    // Same student + bundle at any time → the same key, so a boundary-crossing
    // double-click collides on Payment.id instead of creating two payments.
    const prefix = bundlePurchasePrefix("bundle-1", "student-1");
    expect(prefix).toBe("bundle:bundle-1:student-1:");
    expect(bundlePaymentId(prefix, "course-a")).toBe(bundlePaymentId(prefix, "course-a"));
    expect(bundlePaymentId(prefix, "course-a")).not.toBe(bundlePaymentId(prefix, "course-b"));
    expect(bundlePaymentId(prefix, "course-a")).not.toBe(
      bundlePaymentId(bundlePurchasePrefix("bundle-2", "student-1"), "course-a"),
    );
    expect(bundlePaymentId(prefix, "course/a?b")).not.toContain("/");
    expect(bundlePaymentId(prefix, "course/a?b")).not.toContain("?");
  });

  it("refund advances generation so a real repurchase gets fresh payment IDs", () => {
    const base = bundlePurchasePrefix("bundle-1", "student-1");
    expect(bundleGeneration([], base)).toBe(0);

    const g0 = bundleGenerationPrefix(base, 0);
    const history = [
      { transactionId: `${g0}course-a` },
      { transactionId: `${g0}course-b` },
    ];
    expect(bundleGeneration(history, base)).toBe(1);
    expect(bundlePaymentId(g0, "course-a")).not.toBe(
      bundlePaymentId(bundleGenerationPrefix(base, 1), "course-a"),
    );
  });

  it("partial_refund_is_not_replayed: a fresh full purchase is required", () => {
    const clean = [
      { status: "completed", courseId: "a" },
      { status: "completed", courseId: "b" },
    ];
    const partiallyRefunded = [
      { status: "completed", courseId: "a" },
      { status: "refunded", courseId: "b" },
    ];
    expect(isReplayEligiblePurchase(clean, ["a", "b"])).toBe(true);
    expect(isReplayEligiblePurchase(partiallyRefunded, ["a", "b"])).toBe(false);
    expect(isReplayEligiblePurchase(clean.slice(0, 1), ["a", "b"])).toBe(false);
    // All-free bundle has only a receipt row (courseId null).
    expect(isReplayEligiblePurchase([{ status: "completed", courseId: null }], [])).toBe(true);
  });

  it("sumPaymentCents avoids Float drift on replay totals", () => {
    expect(sumPaymentCents([{ amount: 0.1 }, { amount: 0.2 }])).toBe(30);
  });
});
