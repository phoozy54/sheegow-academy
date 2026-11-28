# G0 Threat Note — BL-1: Bundle checkout entitlement

**Nooca:** 1.0 · **Taariikhda:** 2026-11-28 · **Gate:** G0 → G1 → G2 (pending G3/G4)

```
Feature / endpoint:
  POST /api/bundles/:id/checkout

Asset affected:
  Payments/revenue records + paid-course entitlement (student paid but locked out)

Trust boundary crossed:
  Browser → Next API → DB (payment ↔ enrollment ↔ content access)

Worst-case abuse / breakage:
  One Payment with courseId:null was assigned to every Enrollment, but
  Enrollment.paymentId is @unique → P2002 on the second course (whole tx rolls back).
  Even when it succeeded, content-access and /api/enrollments look for a completed
  payment with a matching courseId → 402 PAYMENT_REQUIRED after paying.

Primary control + test:
  Create one completed Payment PER billable course, each with the real courseId,
  amount allocated in integer cents pro-rata by course price (remainder distributed
  deterministically). Idempotency is enforced by the DB primary key: deterministic
  Payment.id from (student, bundle, generation, courseId) — time-independent,
  so no 60s bucket-boundary race → P2002 for a concurrent second request, which
  then returns the original purchase. Generation = max(existing generations) + 1;
  a refund advances it so a legitimate repurchase gets fresh IDs. Keep @unique
  untouched; use enrollment.upsert. Replay totals are summed in integer cents.
  P2002 replay only on a Payment PK conflict.
  Tests: bundle_allocation_sums_exactly, bundle_allocation_pro_rata,
         bundle_zero_amount_still_creates_payment, bundle_free_courses_excluded.

Rollback / kill switch:
  No schema, no migration, no env var, no infra change. Route + pure helper + tests.
  Rollback = restore previous route.ts and remove helper/test. No production data touched.
```

**Dib-u-eegis madax-bannaan (2026-11-28) — 5 finding oo la hagaajiyay:**
1. HIGH: idempotency read-then-write → deterministic `Payment.id` (DB PK lock, P2002 → replay).
2. MED: replay wuxuu soo celin jiray dhammaan iibsashooyinkii hore → waxaa la shaandheeyaa furayaasha joogtada ah ee `(student, bundle, generation, courseId)`.
3. LOW/MED: qiime yar oo `>0` balse `<0.005` wuxuu heli jiray allocation la'aan → `moneyToCents` ugu yaraan 1 senti; allocation kasta wuxuu helayaa payment row.
4. LOW: Float drift replay `finalAmount` → `sumPaymentCents`.
5. LOW (QG-1): `textAnswer` aan string ahayn → `.trim()` 500 → `safeText()`.

**Dib-u-eegis #2 (2026-11-28) — 2 arrin oo kale:**
- A: 60s bucket boundary wuxuu weli oggolaan karaa double charge → **window-ka waa la saaray**; furaha waa deterministic, marka laba click isla markiiba ama xuduudda waqtiga ku kala dhaca isla PK ayay ku dhacayaan. Si ka duwan iibsasho caadi ah, **refund wuxuu furayaa generation cusub** (eeg dib-u-eegis #3).
- B: P2002 kasta waxaa loo qaatay "concurrent winner" → hadda waxaa la hubiyaa `meta.target` (PK `Payment.id` keliya); kuwa kale waxay helayaan `409` cad, ma aha 500.
- C: `courseId` sidoo kale waa la sanitize gareeyay (URL-safe).

**Dib-u-eegis #3 (2026-11-28):** idempotency joogto ah waxay xannibi jirtay iibsasho kadib refund → **generation counter** laga xisaabiyay payment-yada jira; replay wuxuu shaqeeyaa kaliya marka payment-yadu yihiin `completed`; refund → generation cusub → iibsasho cusub oo sax ah. Ma jiro waqti/DB schema cusub.  
**Dib-u-eegis #4:** refund qayb ah (hal course) → generation-ka waa la diidayaa (`isReplayEligiblePurchase`: dhammaan rows `completed` + dhammaan billable courses leh payment), iibsasho buuxda oo cusub ayaa la samaynayaa.

**Xusuusin 1:** `DEMO_MODE` production weli mamnuuc ayay ku jirtaa `SECURITY.md`; isbeddelkani ma awoodgelinayo lacag dhab ah.  
**Xusuusin 2:** Iibsashooyinkii hore ee `courseId:null` lahaa **lama backfill gareyn** — ardaydaas weli way xiran yihiin. Backfill waa migration u baahan snapshot + ogolaansho gaar ah (G4); ma jiro wax DB ah oo la taabtay.
