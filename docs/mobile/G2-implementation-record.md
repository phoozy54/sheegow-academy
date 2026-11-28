# G2 — Amniga ka hor mobile: implementation record

**Taariikhda:** 2026-11-28
**Xaaladda:** code + automated gates waa dhammaaday; **local keliya** ilaa reviewer-wareegga 2aad uu dhammato. Ma jiro wax production ah oo la qoray, DB la beddelay, migration la sameeyay, ama container la taabtay.
**Go'aanka:** **migration-free**. `prisma/migrations/` lama abuurin; waxaa la isticmaalayaa columns jira oo keliya. **0 NPM package cusub** — `package.json` lama beddelin.

---

## 1. Go'aanka naqshadda (DB-free rotation)

| Su'aal | Go'aan |
|---|---|
| Halkee ku jirtaa rotation state? | Cookie **signed HMAC**, HttpOnly, `path: "/"`, oo aan JS u muuqan (`sheegow_rot`). Waxay haysaa `current`, `previous`, `expires`, `userId`, `familyId`. |
| Maxaa loo isticmaalay session epoch? | `User.updatedAt` oo hore u jiray — logout/change-password/profile edit ayaa hore u dhaqdhaqaaqaya. |
| Maxaa la revocation gareynayaa? | `Enrollment.status = "revoked"` iyo `Certificate.revokedAt` — labaduba hore ayay u jireen. |
| Maxaa laga sheegay legacy tokens? | Refresh tokennada G1 (jti la'aan) waxaa la aqbalayaa **hal mar** si loo beddelo; G2 token (jti leh) oo cookie cursor la'aan ah waa **la diidayaa** (fail-closed). |

---

## 2. Waxa la beddelay (G2)

| ID | Hirgelinta | Faylasha |
|---|---|---|
| `AUTH-2` | `requireSuperAdmin()` waa `role === "super_admin"` oo keliya; admin caadi ah ma beddeli karo role, ma abuuri karo admin, ma tirtiri karo admin | `src/lib/auth.ts`, `src/app/api/users/route.ts`, `src/app/api/users/[id]/route.ts` |
| `JWT-1` | `algorithms: ["HS256"]`; `iss`/`aud` (legacy-la'aan waa la aqbalayaa hal mar); refresh wuxuu helay `jti`/`familyId`; socket token wuxuu helay `sessionVersion`/`jti`/`aud` chat | `src/lib/auth.ts`, `src/lib/token-security.ts` (cusub) |
| `AUTH-3` | Refresh hal-isticmaal ah; cursor saxiixan oo `userId`/`familyId` ku xiran; replay → `revokeUserSessions()`; rate-limit connection + user | `src/lib/refresh-rotation.ts` (cusub), `src/app/api/auth/refresh/route.ts` |
| `SOCK-1` | Chat service wuxuu hubinayaa `exp` marka uu fariin qabanayo (ma aha handshake keliya), wuxuuna goynayaa socket dhacay; broadcast-stop + WebRTC relay waxay marayaan `membership()` | `mini-services/chat-service/index.ts`, `src/app/api/socket/token/route.ts` |
| `PAY-2` | Production-ka `DEMO_MODE` waa la iska indhatirayaa (fail closed) + log muuqda | `src/app/api/payments/checkout/route.ts`, `src/app/api/bundles/[id]/checkout/route.ts` |
| `PAY-3` | Refund approval waa `updateMany({ status: "pending" })` hal transaction; `Payment`, `Enrollment`, `Certificate` wada jir; receipt `courseId: null` waa la diidayaa | `src/app/api/refunds/[id]/route.ts` |
| `PW-1` | Hal `validatePassword()` (≥12 + 3/4 classes) iyo `validateNewPassword()`; UI/admin hints waa la waafajiyay | `src/lib/password.ts` (cusub), 3 auth routes, `admin-teachers.tsx`, `translations.ts` |
| `AUTH-4` | Badhanka been-abuurka ah ee "Forgot password?" waa la saaray (backend ma jiro) | `src/components/sheegow/auth-modal.tsx` |
| `UPL-1` | `lessonId` waa la xaqiijiyay inuu ka tirsan yahay `courseId` kahor intaan lagu ridin public id | `src/app/api/uploads/sign/route.ts` |
| `PII-1` | Leaderboard wuxuu soo celinayaa pseudonym ku salaysan rank (ma jiro id/avatar joogto ah); contact ma soo celinayso xogta la geliyay; newsletter/log ma qoraan email | `src/app/api/leaderboard/route.ts`, `contact/route.ts`, `newsletter/route.ts` |
| `OPS-2` | Logger wuxuu furayaasha u rogayaa lowercase, wuxuu redact gareynayaa secrets + PII, wuxuu nadiifinayaa bearer/JWT/URL credentials, stack-ka production waa la saaray | `src/lib/logger.ts` |
| `OPS-3` | Email helpers waxay soo celinayaan `SendEmailResult`; production missing key waa error; callers muhiim ah waxay soo bandhigayaan failure iyada oo PII aan la qorin | `src/lib/email.ts`, register/refund/certificate/teacher-application/announcement/newsletter routes |
| Tests | Dhaqan + source-level tests cusub | `tests/g2-security.test.ts` (cusub) |

---

## 3. Automated gates — natiijo

| Gate | Wareegga 1aad | Wareegga 2aad (kadib review fixes) |
|---|---|---|
| `bun test` | 107 pass / 0 fail | **111 pass / 0 fail** (459 expect) |
| `bunx tsc --noEmit` | nadiif | **nadiif** |
| `bun run build` | guulaystay | **guulaystay** |

---

## 4. Dib-u-eegis madax-bannaan (reviewer ≠ author)

### Wareegga 1aad

Reviewer wuxuu helay **1 High + 5 Low + 4 Info**. Dhammaan waa la hagaajiyay:

| Finding | Xaaladda |
|---|---|
| High — G2 refresh token waxaa lagu isticmaali karaa client aan `sheegow_rot` cookie lahayn | **Fixed** — jti leh cursor la'aan waa `reuse`; cursor wuxuu ku xiran yahay `userId` + `familyId` HMAC ahaan |
| Low — broadcast-stop / WebRTC relay ma mari jirin `membership()` | **Fixed** — labaduba waxay marayaan `membership()`; jeegga `exp` ma aha `isProduction`-keliya |
| Low — refund `courseId: null` (free bundle receipt) ma lahayn revocation | **Fixed** — approval waa la diidayaa; rejection wuu shaqaynayaa |
| Low — socket token wuxuu hubinayay enrollment jiritaan, ma aha `status` | **Fixed** — kaliya `active`/`completed` ayaa la aqbalayaa |
| Low — `/api/users/me` wuxuu luminayay rotation family (refresh cookie path) | **Fixed** — cursor waa `path: "/"` oo `setAuthCookies()` wuu akhriyaa |
| Low — rate-limit user-keliya wuxuu u oggolaaday DoS la beegsado | **Fixed** — connection bucket + user:connection bucket |
| Info — `"chat service enforces exp and jti"` faallo been ah | **Fixed** — faallo sax ah; jti waa la kaydiyaa, exp/audience ayaa la dhaqan geliyay |
| Info — Error nested ctx / free-form message aan la sanitize gareyn | **Fixed** — labadaba `sanitizeText()` ayaa mariya |
| Info — admin caadi ah wuu tirtiri karaa super_admin | **Fixed** — delete sidoo kale waa super-admin-keliya |
| Info — inta badan tests source-string ayay ahaayeen | **Fixed** — waxaa lagu daray behavioral tests (replay cursor la'aan, wrong user/family) |

### Wareegga 2aad

Isla reviewer ≠ author, akhrin-keliya: **dhammaan natiijooyinkii wareegga 1aad waa la xalliyay; ma jiro arrin cusub oo High/Medium**. Wuxuu xaqiijiyay cursor-ka `userId`/`familyId`, `membership()` ee broadcast-stop/WebRTC, refund `courseId: null`, socket `status`, admin delete guard, logger sanitization, AUTH-4/i18n, iyo behavioral tests-ka cusub.

---

## 3b. Kadib-review gates (final)

| Gate | Natiijo |
|---|---|
| `bun test` | **111 pass / 0 fail** (459 expect), 7 files |
| `bunx tsc --noEmit` | **nadiif** |
| `bun run build` | **guulaystay** — 64 bog, proxy/middleware, standalone la koobiyeeyay |

---

## 5. Khatarta la diiwaangeliyay (residual, ma laha High)

1. **NET-1 shared rate-limit** — `rate-limit.ts` waa in-process; Vercel serverless dhowr instance ayay noqon kartaa. Miisaan la wadaago (Redis/Upstash/platform WAF) wuxuu u baahan yahay go'aan iyo probably package; lama samayn.
2. **Socket logout** — token wuxuu dhacayaa 5 daqiiqo kadib; furitaanka socket hore ma go'ayo isla marka password la beddelo illaa `exp`. `sessionVersion`/`jti` waa la kaydiyaa, laakiin chat service ma haysto DB uu ku hubiyo.
3. **Free-only bundle receipt** — `amount: 0`, `courseId: null`; refund approval waa la diidayaa sababtoo ah ma jiro enrollment lacag ah oo la burinayo.
4. **Legacy token transition** — refresh tokens hore (jti la'aan) hal mar ayay la aqbalayaan; kadib waa lagu beddelayaa kuwo cusub. Access tokens hore (`purpose` la'aan) waa la diidayaa; client-ku wuxuu si toos ah u sameeyaa `/api/auth/refresh` marka uu 401 helo (`src/lib/api.ts`), marka is-dheellitirka waa la maareeyay.
5. **Two-tab trade-off** — `previous` jti wali waa la aqbalayaa hal mar si laba tab isku mar u shaqeeyaan; token la xaday wuu heli karaa hal refresh oo keliya inta u dhaxaysa laba rotation. Tani waa ula kac.
6. **Reuse detection waa global** — `revokeUserSessions(user.id)` wuxuu ka saarayaa dhammaan qalabka, ma aha family keliya; qof token haysta wuxuu sababi karaa logout dhammaan qalabka (availability DoS). Tani waa naqshadda la oggolaaday.
7. **Browser device-matrix smoke** — 34 bog × 320/375/414/768 px, RTL `so`/`ar`, VoiceOver/TalkBack; wuxuu u baahan yahay staging si cad loo habeeyay. Sir lama akhriyo.
8. **Production wali waa deployed `cbb72e8`** (G1/G2 lama deployin). Passive baseline hore: `/api/health` 200, HSTS present, canonical ACAO, 27 scripts/30 nonces.

---

## 6. Xaaladda git iyo tallaabada xigta

- Repository-ga saxda ah waa **nested** `sheegow-academy/` (root `stellar-cactus` wuxuu u arkaa untracked). Origin: `phoozy54/sheegow-academy`.
- G1 + G2 code waa modified/untracked **local**.
- `87dab69` wali waa 1 commit oo `origin/main` ka horreeya; lama riixin.
- Ma jiro commit, push, ama deploy oo la sameeyay ilaa uu reviewer-wareegga 2aad dhammato.

**Xigta:** reviewer-wareegga 2aad → (haddii nadiif) commit → push → Vercel auto-deploy (app) + Render `sheegow-chat` auto-deploy → passive GET verification keliya; active tests staging/local keliya, synthetic `.test`, ≤60 requests, ≤2 concurrent, kill switch.
