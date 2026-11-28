# G0 Threat Note — PAY-1: Checkout idempotency + one-time coupon

**Nooca:** 1.0 · **Taariikhda:** 2026-11-28 · **Gate:** G0 → G1 → G2 (pending G3/G4)
**Xaqiijin:** `docs/security/WAVE2-scan-results.md` — laba checkout oo isku mar ah → laba 201; `WELCOME10` laba jeer → laba 201.

```
Feature / endpoint:
  POST /api/payments/checkout  (+ POST /api/bundles/:id/checkout for coupon parity)

Asset affected:
  Payment records/revenue + course entitlement + coupon discount integrity.

Trust boundary crossed:
  Browser → Next API → DB (Payment, Enrollment, Coupon).

Worst-case abuse / breakage:
  A) payment.create wuxuu ka baxsanaa transaction; laba request oo isku mar
     ah waxay abuuraan laba Payment oo kala duwan (labaduba "completed").
     Marka provider dhab ah ku xidhan yahay → lacag laba jeer la qaadan karo.
  B) findValidCoupon wuxuu eegayaa active + expiresAt keliya. Faalada
     register/seed waxay ku qoran tahay "one-time-use, deactivated on
     redemption", balse checkout ma uu damin jiray → discount aan xad lahayn.

Primary control + test:
  A) Payment.id DETERMINISTIC ah, laga soo saaray
     (studentId, courseId, generation) — time-independent (qaabkii BL-1 ee
     hore loo eegay). Laba click oo isku mar ah isla PK ayay ku dhacayaan:
     mid 201, kan kalena P2002 → dib u akhri payment-kii guuleystay → 200.
     Generation waxaa laga xisaabiyaa payment-yada jira (transactionId
     prefix), marka refund kadib iibsasho cusub waa sax.
  B) Coupon-ka waxaa la hubiyaa OO la daminayaa (active:false) isla
     $transaction gudaheed, payment + enrollment ka hor. Haddii transaction-ku
     P2002 ku fashilmo, damintu waa la rogayaa (rollback) → ma jiro coupon
     lumin. Bundle checkout wuxuu ku darayaa isla daminta transaction-kiisa.
  Price waa server-side (DB), client price/amount waa la iska indhatirayaa —
  weli sax.
  Tests: pure helper (coursePaymentPrefix/courseGeneration/coursePaymentId)
         + source assertions + live staging re-scan (race + coupon reuse).

Rollback / kill switch:
  No schema, no migration, no env var, no dependency, no infra change.
  DEMO_MODE production weli mamnuuc. Rollback = restore 3 files.
```

**Xusuusin:** Coupon-ku wuxuu noqonayaa **hal-isticmaal** (global), oo waafaqsan faalada jirta ee `register/seed`. Ma jiro `usageCount` cusub — ma jiro DB change.

**Reviewer:** waa inuu ka duwanaadaa qofka qoray.
