# G0 Threat Note — ACL-1: Socket token for approved trial students

**Nooca:** 1.0 · **Taariikhda:** 2026-11-28 · **Gate:** G0 → G1 → G2 (pending G3/G4)
**Xaqiijin:** `docs/security/WAVE2-scan-results.md` — trial la oggolaaday kadib REST chat → 201, balse `/api/socket/token?mode=viewer` → 403.

```
Feature / endpoint:
  GET /api/socket/token?classId=<id>&mode=viewer

Asset affected:
  Live-class access control (approved timed trial).

Trust boundary crossed:
  Browser → Next API → DB (Payment trial approval) → Socket.io token claims.

Worst-case abuse / breakage:
  Koodhku wuxuu leeyahay:
    if (student && !trialApproved) { ... enrollment/payment checks ... }
    else if (!canBroadcast && !isTeachingRole(role)) return 403;
  Arday trial-approved ah wuxuu galayaa `else if` branch (maxaa yeelay
  `!trialApproved` waa been), wuuna helayaa 403 — inkastoo hasApprovedTrial()
  sax ah, REST chat-na uu u furan yahay. Natiijada: ogolaansho la bixiyay
  balse live room-ka la geli kari waayay (functional break, ma aha privilege
  escalation).

Primary control + test:
  Ku dar `!trialApproved` shardka `else if`  — arday trial-approved ah wuu
  helayaa socket token viewer ah, canBroadcast:false (host privileges ma
  helayo). Arday aan trial lahayn wuxuu weli marijiraa enrollment/payment
  402/403 checks. Admin/teacher branches isma beddelaan.
  Tests: source assertion + live staging re-scan (trial approval → token 200,
         unpaid → 403, price tamper → server-side).

Rollback / kill switch:
  Hal condition ah oo route.ts ku jira. No schema, no migration, no env change.
```

**Xusuusin:** Ma jiro ballaarin mudnaan — `canBroadcast` wuu false u yahay ardayda, socket service-ku wuu xaqiijinayaa claim-ka.

**Reviewer:** waa inuu ka duwanaadaa qofka qoray.
