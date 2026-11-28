# G0 Threat Note — SES-1: Session revocation (logout / password change)

**Nooca:** 1.0 · **Taariikhda:** 2026-11-28 · **Gate:** G0 → G1 → G2 (pending G3/G4)
**Xaqiijin:** `docs/security/WAVE2-scan-results.md` — refresh token hore wuxuu shaqaynayaa 200 kadib logout iyo kadib password change (waa inay 401 ahaato).

```
Feature / endpoint:
  POST /api/auth/logout
  POST /api/auth/change-password
  POST /api/auth/refresh
  helper: getCurrentUser()/requireAuth() (dhammaan API-yada authenticated)

Asset affected:
  Session integrity — access + refresh tokens.

Trust boundary crossed:
  Browser (httpOnly cookies) → Next API → JWT verify → DB user row.

Worst-case abuse / breakage:
  Refresh token waa JWT 30-maalmood ah, stateless ah. logout wuxuu kaliya
  cookie ka tirtirayaa browser-ka; change-password wuxuu kaliya password-ka
  beddelayaa. Haddii cookie/token la xado, wuu sii shaqaynayaa 30 maalmood
  kadib logout ama password change — ma jiro server-side revocation.

Primary control + test:
  SESSION EPOCH = User.updatedAt.getTime() (column jirta, MA JIRO schema
  change). Marka tokens la samaynayo, epoch waxaa lagu darayaa JWT payload
  (sessionVersion). Refresh route iyo getCurrentUser waxay barbar dhigaan
  payload.sessionVersion iyo user.updatedAt hadda; hadduu kala duwanaado →
  401 / null (fail closed).
  logout: akhri sheegow_refresh cookie, verify, kadibna bump updatedAt
  (revokeUserSessions) → dhammaan tokens hore waa dhacay; kadibna clear cookies.
  change-password: bump updatedAt isla update-ka password-ka, kadibna soo
  saar cookies cusub epoch cusub leh → isticmaalaha hadda wuu sii galayaa,
  session-yada kale waa la buriyay.
  Access token sidoo kale waa la hubinayaa (getCurrentUser) → 15 min sugitaan
  ma jiro.
  Tests: pure helper (sessionVersionOf/isCurrentSession) + source assertions
         + live staging re-scan (refresh kadib logout iyo kadib change-password).

Rollback / kill switch:
  No schema, no migration, no env var, no secret, no dependency, no infra change.
  Rollback = restore auth.ts + 4 route files + 3 call sites. Production lama taaban.
```

**Trade-off la ogolyahay (fail closed):**
- `updatedAt` wuu is beddelaa marka profile-ka la cusboonaysiiyo → isticmaaluhu wuu ka baxayaa (re-login). Tani waa **logout everywhere** semantics: logout ama password change wuxuu burinayaa dhammaan qalabka, ma aha qalabka keliya.
- Haddii mustaqbalka loo baahdo "logout this device only" ama profile updates oo aan session jebin, waxaa loo baahan yahay `sessionVersion Int` column cusub → taas waa **DB change** oo u baahan ogolaansho gaar ah (G4). Maanta lama sameynayo.

**Reviewer:** waa inuu ka duwanaadaa qofka qoray.
