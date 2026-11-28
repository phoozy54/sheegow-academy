# G0 Threat Note — QG-1: Quiz grading

**Nooca:** 1.0 · **Taariikhda:** 2026-11-28 · **Gate:** G0 → G1 → G2 (pending G3/G4)

```
Feature / endpoint:
  POST /api/quizzes/:id/submit  (grading, progress, points, certificate eligibility)

Asset affected:
  Certificate trust + gamification integrity + course progress (revenue-adjacent reputation)

Trust boundary crossed:
  Browser → Next API (client supplies answers) → DB (authoritative questions/choices)

Worst-case abuse:
  Student submits only one correct answer; total is computed from submitted answers,
  so score=100, passed=true → lesson completed, points/streak/badge and certificate eligibility.

Primary control + test:
  Compute `total` from ALL non-short server-side questions (never from request answers);
  dedupe answers by questionId; claim the attempt with
  `updateMany({ where: { id, submittedAt: null } })` inside one interactive transaction;
  dedupe answers by questionId + existing `@@unique([attemptId, questionId])`
  (no `skipDuplicates`, to stay SQLite-portable); stop rewards when claim.count !== 1.
  Tests: quiz_total_all_questions, quiz_duplicate_answers_deduped,
         quiz_double_submit_second_claim_rejected.

Rollback / kill switch:
  Pure helper + route-only change; no schema change, no migration, no env var.
  Rollback = restore previous route.ts and remove helper/test. No production data touched.
```

**Dib-u-eegis madax-bannaan (2026-11-28):** ma jirin S0/S1 oo harsan. Waxaa la hagaajiyay hal LOW: `textAnswer` aan string ahayn wuxuu sababi jiray 500 (`safeText()` ayaa hadda ilaaliya).

**Xusuusin:** Ma jiro wax schema/env/deploy/DB change ah. Qiimaha `isCorrect` waligeed lama soo celinayo ka hor submit.
