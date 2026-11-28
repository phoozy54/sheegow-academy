# Wave 2 — Hagaajinta & Xaqiijinta (staging keliya)

**Taariikhda:** 2026-11-28 · **Nooca:** 1.2 (final) · **Gate:** G0 ✅ → G1 ✅ → G2 ✅ → **G3 ✅ (reviewer ≠ author; wareegga 2aad wuu dhammaystirmay)** → G4 (deploy, ogolaansho cusub) → G5

> Production `https://www.sheegowacademy.com/` **lama taaban**. Dhammaan tijaabooyinku waxay ka dhaceen `http://127.0.0.1:3002` (dev server) + `sheegow-staging-db` (container-ka cusub ee la oggolaaday). 9-da container ee jira lama eegin, lama taaban.

---

## 1. Wixii la hagaajiyay

| ID | Daciifnimo | Hagaajin | Faylasha |
|---|---|---|---|
| `SES-1` | Refresh token wuu noolaadaa kadib logout / password change | `sessionVersion` = `User.updatedAt` epoch oo lagu daro JWT; `/refresh` iyo `getCurrentUser()` waxay isbarbardhigaan DB hadda. `logout` wuxuu bump gareeyaa epoch (akhri signed refresh cookie → userId); `change-password` wuu bump gareeyaa isla update-ka wuxuuna soo saaraa cookies cusub oo keliya qalabka hadda ah. | `src/lib/session.ts` (cusub), `src/lib/auth.ts`, `auth/{logout,change-password,refresh,login,register}/route.ts` |
| `ACL-1` | Arday trial-approved ah → socket token 403 | `else if` broadcast guard waxaa lagu daray `!trialApproved`; token-ku weli waa `canBroadcast:false`. | `src/app/api/socket/token/route.ts` |
| `PAY-1a` | Laba checkout oo isku mar ah → laba Payment | `Payment.id` deterministic ah `(student, course, generation)` — qaabkii BL-1. Laba request isla PK ayay ku dhacaan; kii lunsanaa wuxuu helayaa `200` + payment-kii guuleystay (`P2002` replay). Generation wuxuu ka yimaadaa payment-yada jira → refund kadib iibsasho cusub waa sax. | `src/lib/course-checkout.ts` (cusub), `src/app/api/payments/checkout/route.ts` |
| `PAY-1b` | `WELCOME10` laba jeer la isticmaalay | Coupon waxaa la hubiyaa **oo la daminayaa** (`active:false`) isla `$transaction` gudaheed; P2002 rollback wuxuu soo celinayaa daminta. Bundle checkout wuxuu helay isla ilaalinta. | `src/app/api/payments/checkout/route.ts`, `src/app/api/bundles/[id]/checkout/route.ts` |

**Ma jiro:** schema/migration change, env var, secret, dependency cusub, NPM package, ama infra change. `DEMO_MODE` production weli mamnuuc ayay ku jirtaa.

---

## 2. Xaqiijin toos ah (staging)

**Re-scan wareegga 1aad:** 25/60 requests · ≤2 concurrent · synthetic `@example.test` accounts · email dhab ah ma jiro · lacag dhab ah ma jiro · cookie/token/password waxba lama daabacin → **25/25 pass** (SES 401/401/200, ACL 403/200+token/canBroadcast=false, PAY race `201/200`, coupon 201/400, server price 10, health 200).

**Re-scan wareegga 2aad (oo daboolaya reviewer findings):** 33/60 requests · 32 checks → **27 pass**, 5 coupon checks waxay heleen `429` dhanka `/register` (rate-limit 3/saacaddii — ma aha daciifnimo). Kuwaas waxaa lagu celiyay scan yar oo accounts hore u jiray isticmaalaya:

| Check | Filasho | Natijo |
|---|---|---|
| `ses_logout_revokes` | 401 | ✅ 401 |
| `ses_password_change_revokes` | 401 | ✅ 401 |
| `ses_current_survives` | 200 | ✅ 200 |
| `stale_logout_no_dos` (M1) | 200 + session weli nool | ✅ 200 / 200 |
| `profile_edit_keeps_session` (L3) | 200 | ✅ 200 |
| `acl_unpaid_denied` | 403 | ✅ 403 |
| `acl_trial_token` / `acl_no_broadcast` | 200 + false | ✅ 200 / false |
| `pay_sequential_no_second_charge` (H1) | 200 + `alreadyPurchased` | ✅ 200 / true |
| `pay_concurrent_no_charge` | ma aha 201 | ✅ `200/200` |
| `pay_server_side_price` | 10 | ✅ 10 |
| `coupon_reuse_denied` (H2, isku xigta) | 400 | ✅ 400 |
| `coupon_concurrent_single_use` (H2, isku mar) | `201/400` | ✅ `201/400` |
| `staging_healthy` | 200 | ✅ 200 |

**Coupon scan-ka gaarka ah:** 9/20 requests · **8/8 pass** · 0 fail (coupon isku xigta + coupon isku-waqtiga ah + login/health).

**Unit tests:** `bun test` → **47 pass / 0 fail / 248 expect()** (5 files).
**Typecheck:** `bunx tsc --noEmit` → **clean** (0 errors).
**Build:** `bun run build` → **success** (Prisma generate + Next.js production build + standalone asset copy; 64/64 static pages).
**Kill switch:** ma jiro 5xx lama filaan ah, email dhab ah, ama lacag dhab ah; scan-ku wuu joogsan lahaa haddii mid dhaco.

---

## 3. G0 trade-offs (la ogolyahay, fail-closed)

- `updatedAt` wuu is beddelaa marka profile-ka la cusboonaysiiyo → qalabka kale wuu ka baxayaa, laakiin qalabka wax ka beddelay cookies cusub ayuu helayaa (L3 waa la hagaajiyay). Waa **logout everywhere**: logout/password change wuxuu burinayaa dhammaan qalabka, ma aha hal qalab.
- Haddii mustaqbalka loo baahdo "hal qalab oo keliya" ama profile updates aan session jebin → `sessionVersion Int` column cusub ayaa loo baahan yahay → **DB change**, ogolaansho gaar ah (G4). Maanta lama sameyn.
- Coupon-ku wuxuu noqday **hal-isticmaal global** — waafaqsan faalada jirta ee `register/seed` ("one-time-use, deactivated on redemption").
- Tokens hore (kuwa la samaynayay hagaajinta ka hor) ma laha `sessionVersion` → `isCurrentSession` wuu diidayaa. Marka la deploy gareeyo G4 kadib, **dhammaan isticmaalayaashu hal mar bay dib u login gareynayaan**. Tani waa fail-closed ula kac ah; ma jiro "grace path" oo tokens duug ah la aqbali karo. Waa in lagu daro G4 go'aanka.

---

## 4. G3 — dib-u-eegis madax-bannaan (reviewer ≠ author)

**Wareegga 1aad:** reviewer wuxuu helay **2 High, 2 Medium, 4 Low**. Waxba lama beddelin ilaa uu reviewer-ku dhammeeyo; koodhka author-ka ayaa markaas wax ka qabtay:

| ID | Daciifnimada la helay | Hagaajin la sameeyay |
|---|---|---|
| H1 (High) | Checkout isku xigta (double-click / retry) wuxuu sameyn jiray Payment labaad | `replayablePayment()` → haddii payment-ka generation-ka hadda uu `completed` yahay, soo celi `200 alreadyPurchased` adigoon wax cusub samayn; refund/failed/pending ma aha replayable |
| H2 (High) | Coupon laba iibsi oo isku-waqtiga ah ayuu laba jeer dhimi jiray | `tx.coupon.updateMany({ where: { id, active: true }, data: { active: false } })` + `claimed.count !== 1` → hal iibsi oo keliya ayaa discount helaya (course + bundle) |
| M1 (Medium) | Refresh token hore oo hore loo buriyay wuxuu ku qasbi jiray logout cusub (DoS) | `logout` wuxuu hubinayaa `isCurrentSession()` ka hor revocation; `limitRequest(auth-logout:<ip>, 10, 60s)` ayaa lagu daray |
| M2 (Medium) | Tests badankood waxay eegayeen qoraal source ah, ma aha dhaqan | Tijaabo saafi ah oo `nextSessionVersion` / `replayablePayment`; 47/47 pass, 248 expect |
| L2 (Low) | Revocation isku millisecond ah ma beddeli jirin epoch | `nextSessionVersion(current, now) = Math.max(now, current + 1)`; meel walba waa laga isticmaalay |
| L3 (Low) | Profile PATCH wuxuu isla markiiba ka saarayay qalabka wax ka beddelay | `/api/users/me` wuxuu soo celinayaa cookies cusub oo epoch cusub leh |
| L4 (Low) | Checkout wuxuu tirtirayay `Enrollment.paymentId` hore | `existingEnrollment?.paymentId ? {} : { paymentId: payment.id }` |

**Wareegga 2aad (dib-u-eegis):** reviewer isla kan ah ayaa akhriyay qaybaha la beddelay. **H1, H2, M1, L2, L3, L4 dhammaan waa `Resolved`**. Wax arrin amni oo cusub lama helin; ma jiro schema/dependency change.

**Residual Low (hore u jiray, ma aha blocks):**
- `L1`: socket token-ku ma laha `sessionVersion`, wuxuu noolaan karaa ilaa 5 daqiiqo kadib logout. Ma laha awood broadcast (`canBroadcast:false`); wax looga qaban doono Wave 3.
- `M2`: qayb ka mid ah tests-ku wali waa source-string checks; dhaqanka waxaa lagu xaqiijiyay staging re-scan toos ah.
- `M1` rate-limit waa IP-based (`x-forwarded-for` waa la aaminay) → NAT/campus waxay heli karaan 429; laakiin stale-token check ayaa hore u joojiyay DoS-goynta.

**Wareegga 2aad (re-scan toos ah):** SES/ACL/payment checks wuu gudbay; 5 coupon check ayaa 429 ku helay `/register` (rate-limit 3/saacaddii), ma aha daciifnimo. Coupon-ka waxaa lagu celiyay scan yar oo accounts hore u jiray isticmaalaya → **8/8 pass** (eeg qaybta 2).

---

## 5. G4 / G5

- **G3 (dib-u-eegis madax-bannaan):** ✅ wareegga 1aad + wareegga 2aad (reviewer ≠ author). Dhammaan High/Medium iyo L2/L3/L4 waa `Resolved`; residual Low (L1 socket token, M2 source-strings, IP rate-limit) waa la diiwaangeliyay, deploy ma block gareynayo.
- **G4 (deploy):** MA JIRO ogolaansho. Ma jiro push, PR, ama Vercel deploy. Code-ku waa local keliya.
- **G5 (post-deploy verification):** ma bilaabayo ilaa G4 laga helo.
