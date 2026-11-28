# Wave 2 Active Scan — Natiijada (staging keliya)

**Taariikhda:** 2026-11-28 · **Nooca:** 1.0 · **Gate:** G0 rules of engagement → scan → G5 report
**Target:** `http://127.0.0.1:3002` (Vercel-style local dev server) + `sheegow-staging-db` (Docker container **cusub**, `127.0.0.1:55432`)
**Xaalad:** `COMPLETED` — 25/60 requests, 2 concurrency ugu badnaan, 0 production requests.

> **Ma jiro** cookie, token, password, connection string ama API key oo halkan ku qoran. Dhammaan akoonnada waa synthetic `@example.test`; email dhab ah lama dirin (`RESEND_API_KEY` lama dejisan); lacag dhab ah lama isticmaalin (dev mock checkout keliya).

---

## 1. Shaxda natiijada

| Check | Filasho | Natijo | Go'aanka |
|---|---|---|---|
| `staging_reachable` | 200 | 200 | ✅ |
| `course_seeded` | id | id | ✅ |
| `ses_register` | 201 | 201 | ✅ |
| `ses_refresh_works` | 200 | 200 | ✅ |
| `ses_logout` | 200 | 200 | ✅ |
| **`ses_refresh_revoked_on_logout`** | 401 | **200** | ❌ **daciifnimo la xaqiijiyay** |
| `ses_relogin` | 200 | 200 | ✅ |
| `ses_password_changed` | 200 | 200 | ✅ |
| **`ses_all_sessions_revoked_on_password_change`** | 401 | **200** | ❌ **daciifnimo la xaqiijiyay** |
| `acl_admin_login` | 200 | 200 | ✅ |
| `acl_live_class_created` | 201 + id | 201 + id | ✅ |
| `acl_register` | 201 | 201 | ✅ |
| `acl_unpaid_student_denied` | 402 | 403 | ⚠️ filasho khaldan — **diidmo sax ah** (eeg §3) |
| `acl_unpaid_chat_denied` | 403 | 403 | ✅ |
| `acl_trial_requested` | 201 + id | 201 + id | ✅ |
| `acl_trial_approved` | 200 | 200 | ✅ |
| **`acl_approved_trial_gets_token`** | 200 + token | **403** | ❌ **daciifnimo la xaqiijiyay** |
| `acl_approved_trial_chat_allowed` | 201 | 201 | ✅ |
| `pay_sandbox_checkout` | 201 | 201 | ✅ |
| **`pay_concurrent_checkout_idempotent`** | 1 payment keliya | **laba 201** | ❌ **daciifnimo la xaqiijiyay** |
| `pay_coupon_first_use` | 201 | 201 | ✅ |
| **`pay_coupon_reuse_denied`** | 4xx | **201** | ❌ **daciifnimo la xaqiijiyay** |
| `pay_server_side_price` | 10 | 10 | ✅ (client `price:0.01` waa la iska indhatiray) |
| `staging_still_healthy` | 200 | 200 | ✅ |

**Wadarta:** 24 checks · 18 pass · 5 daciifnimo · 1 filasho khaldan.

---

## 2. Daciifnimo la xaqiijiyay (Wave 2 — weli `OPEN`)

### SES-1 — Refresh token ma burinayo (High)
- `POST /api/auth/logout` kadib, `sheegow_refresh` hore wuxuu sii wadaa `POST /api/auth/refresh` → **200**.
- `POST /api/auth/change-password` kadib, refresh token hore wuxuu sii shaqaynayaa → **200**.
- Sababta: `src/app/api/auth/logout/route.ts` wuxuu kaliya `clearAuthCookies()` sameeyaa; `refresh` wuxuu kaliya `verifyRefreshToken()` + user lookup sameeyaa; `change-password` ma uu taabanayo session state. Ma jiro rotation ama session store.
- Saamayn: cookie la xaday ama session duug ah wuu sii shaqaynayaa kadib logout/password change.

### ACL-1 — Approved trial socket token waa 403 (High)
- Arday synthetic ah → `POST /api/trial-requests` → admin `PATCH /api/admin/trial-requests/:id` `approve` → 200.
- `GET /api/socket/token?classId=...&mode=viewer` → **403**, inkastoo `hasApprovedTrial()` uu jidka u furan yahay qaybaha kale.
- `POST /api/live/:id/messages` isla ardaydaas → **201** (sidaa darteed trial-ku wuu shaqaynayaa REST chat, balse socket token-ka wuu diidayaa).
- Sababta: socket token route wuxuu leeyahay `else if (!canBroadcast && !isTeachingRole(user.role)) → 403` oo ka horreeya/ku daboola trial-approved branch-ka marka `mode=viewer` la codsado.
- Saamayn: arday trial uu helay ogolaansho ma uu geli karo live room-ka (chat REST wuu geli karaa).

### PAY-1a — Checkout race (High)
- Laba `POST /api/payments/checkout` oo isku mar ah, isla isticmaale + isla course → **labaduba 201**.
- `db.payment.create` waa outside `db.$transaction`, mana jiro idempotency key.
- Saamayn: laba Payment oo kala duwan + enrollment la cusboonaysiiyay; lacag laba jeer la qaadan karo marka provider dhab ah uu ku xidhan yahay.

### PAY-1b — Coupon unlimited reuse (Medium)
- `WELCOME10` (starter coupon) waxaa la isticmaalay laba jeer oo isku xigta → labaduba **201**, qiimo dhimis laba jeer ayuu khuseeyay.
- `findValidCoupon()` wuxuu hubinayaa `active` + `expiresAt` keliya; ma jiro `usageCount` ama isticmaale keliya.
- Saamayn: discount aan xad lahayn.

---

## 3. Filasho khaldan (ma aha daciifnimo)

`acl_unpaid_student_denied`: waxaan filayay **402**, balse route-ku wuxuu soo celiyay **403** ("Enroll in this course and complete payment before joining the class"). Koodhku wuu **diidayaa** gelitaanka — taas ayaa ah natiijada saxda ah. 402 waxaa loo sameeyay kiiska "enrollment jirta balse payment incomplete"; kiiskaas lama heli karo public API (enrollment la'aanteed), sidaas darteed ma jirto daciifnimo halkan.

---

## 4. Waxa la xaqiijiyay inay sax yihiin

- `pay_server_side_price`: body-ga waxaa ku jiray `price:0.01`, `amount:0.01`, `finalAmount:0.01`; server-ku wuxuu isticmaalay DB price **10** → client tampering ma shaqaynayo.
- `acl_unpaid_chat_denied`: arday aan enrollment lahayn → **403**.
- `acl_approved_trial_chat_allowed`: arday approved trial → **201**.
- `/api/health` wuu saxnaa kahor iyo kadiba scan-ka (200, `db: ok`).

---

## 5. Dhib farsamo oo la helay inta la dhisayay staging-ka (DEP-1 follow-up)

`scripts/db-bootstrap.mjs` wuxuu `npx` ku wacayay `shell: false`; Windows-ka wuxuu ku fashilmay `ENOENT` (`npx.cmd` ayaa loo baahan yahay). Waxaa lagu beddelay `spawnSync(process.execPath, [prismaCli, "db", "push"], { shell: false, stdio: ["ignore","pipe","pipe"] })` — cross-platform, injection-free, raw output-ka waa la tuurayaa. Test-ka waa la cusboonaysiiyay; `bun test` → **37/37 pass (190 expect)**.

---

## 6. G5 / xaaladda hadda

- Production `https://www.sheegowacademy.com/` **lama taaban**; hal request oo active ah kuma dhicin.
- 9-da container ee shaqadu ka socoto **lama eegin, lama taaban, lama joojin**.
- Container-ka cusub `sheegow-staging-db` wuu shaqaynayaa; dev server `127.0.0.1:3002` wuu shaqaynayaa (waxaa loo hayaa xaqiijinta hagaajinta mustaqbalka).
- Ma jiro code fix oo Wave 2 ah oo la sameeyay — daciifnimada waa la **report gareeyay** oo keliya; hagaajintu waxay u baahan tahay G0→G4 cusub iyo ogolaansho.
- Ma jiro commit/push oo isbeddellada cusub ah (db-bootstrap fix + docs) ilaa ogolaansho laga helo.
