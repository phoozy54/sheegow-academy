# SECURITY.md — Dastuurka Amniga ee Sheegow Academy

**Nooca:** 1.0  
**Taariikhda:** 2026-11-28  
**Dhaqan gelaya:** dhammaan code, deegaan, iyo personnel ka shaqeeya mashruuca.  
**Production:** `https://sheegowacademy.com/` — waa live, dad dhab ah, lacag dhab ah, iyo xog dhab ah ayaa ku jirta.

---

## 0. Mabda'a koowaad: "Ha waxyeelayn"

Production waa bukaan miyir ku jira. Wax kasta oo aan ku samayno waa inuu ahaadaa mid la celin karo, la tijaabiyay, oo uu ogolaaday mulkiilaha.

- **Ma jiro wax isbeddel ah oo la sameeyo ogolaansho la'aan.** Tan waxaa ku jira code, config, DB, DNS, env vars, iyo deploy.
- **Ma jiro wax secrets/qiime sir ah la akhriyo, la daabaco, la log gareeyo, ama la commit gareeyo.** Magacyada `env` variable-ka oo keliya ayaa la eegi karaa; qiimahooda marna.
- **Ma jiro red-team/usr testing oo production lagu sameeyo ogolaansho qoraal ah la'aan.**
- **Ma jiro "bal aan isku dayo"** oo ku dhaca DB, payment, enrollment, certificate, ama cookies-ka isticmaalayaasha dhabta ah.
- Khalad yar oo la dhaho "waa test kaliya" wuxuu noqon karaa khalad weyn marka uu live yahay. Sidaa darteed: **slow is smooth, smooth is safe.**

---

## 1. Maamulka, doorarka, iyo awooda go'aan qaadashada

| Door | Yaa | Awooda | Xadka |
|---|---|---|---|
| **Change Approver** | Mulkiilaha / founder | Wuxuu ogolaadaa **kasta** oo deploy, migration, rotation, ama production change ah | Ma jiro qof kale oo is-ogolaan kara |
| **Blue Team (Defender / Implementer)** | Sameeyaha hagaajinta | Wuxuu qoraa code, tests, migrations, runbooks | Ma uu deploy gareyn karo, ma uu ansixin karo isbeddelkiisa |
| **Red Team (Authorized Tester)** | Baaraha daciifnimada | Wuxuu helaa/dukumenteynayaa weakness isagoo raacaya Section 7 | Ma uu beddelo production, ma uu isticmaalo xog dhab ah, ma uu wax hagaajiyo inta uu baarayo |
| **Incident Commander** | Qofka ay magacaabaan mulkiilaha marka dhacdo dhacdo | Wuxuu xakameeyaa jawaabta dhacdada | Waa inuu isla markiiba la xiriiraa Change Approver |
| **Reviewer** | Qof aan author ahayn | Wuxuu ansixiyaa PR | Waa inuu hubiyaa checklist Section 11 |

**Separation of duties:** qofka wax qoray ma uu ahaado qofka kaliya ee eegaya; qofka baaraya ma uu ahaado qofka isla markiiba wax ka beddelaya production.

---

## 2. Sharciyaasha aan la jebin karin (Non-negotiables)

1. **Secrets:** `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SUPER_ADMIN_PASSWORD`, `RESEND_API_KEY`, `DATABASE_URL`, `TURN_SECRET`, `CLOUDINARY_*` iwm — qiimahooda waligeed lama akhriyo, lama print gareeyo, lama commit gareeyo, lama log gareeyo. `.env.example` waa la eegi karaa (magacyo keliya). Haddii sir la shaaciyo → **rotate isla markiiba**, ha sugan.
2. **Production waa read-only** ilaa uu jiro change-approved window iyo rollback plan.
3. **`prisma db push --accept-data-loss` waa mamnuuc dhanka production/deegaan kasta oo xog dhab ah leh.** Migrations la xafiday oo la eegay ayaa keliya la isticmaalayaa.
4. **Runtime DDL waa mamnuuc** (`ALTER TABLE ... IF NOT EXISTS` gudaha request path). Schema waa inuu yimaadaa deployment step, ma aha login request.
5. **Qiimaha iyo entitlement-ka waa server-side.** Client kasta oo soo diray `price`, `discount`, `role`, `paid`, ama `passed` waa la diidayaa. Lacagta `Decimal`/minor units ayaa lagu hayaa, `Float` ma aha.
6. **Hal access helper ayaa jiri doona** (`decideCourseContentAccess` / u dhiganta). Waddo kasta oo content, live chat, polls, attendance, socket, ama certificate ah waa inay isticmaashaa. `return Boolean(enrollment)` keligiis waa mamnuuc.
7. **Session waa la burin karaa.** Access token gaaban, refresh token oo rotation + reuse detection leh, `logout`/`password change`/role downgrade dhammaantood waxay jebiyaan session-ka.
8. **Deny by default.** Endpoint kasta wuxuu u bilaabmaa `requireAuth` → `require...Role` → `ownership check` → `conditional update`. "Admin ayaa eegaya" ma aha bedelkii owner check.
9. **Input waa la xaqiijiyaa server-ka:** nooca, dhererka, allowlist, UUID, domain, iyo xiriirka DB. IP-ga client-ka laga aamino `x-forwarded-for` ma aha isha dhabta ah haddii uusan edge-ku qorin.
10. **Headers & CSP:** nonce waa inuu gaaraa `headers()` iyo `<script>` kasta; `unsafe-inline` script ma aha; `frame-src` waa allowlist; HSTS waa **production + HTTPS keliya**; CORS waa allowlist (`sheegowacademy.com` iyo local/preview oo cad).
11. **Logging:** ma jiro PII, token, signed URL, card data, ama email content oo logs ku dhaca. Redaction waa la tijaabiyaa (camelCase keys waa inay shigmaan).
12. **Realtime:** socket token waa class-scoped, `purpose` cad, waqtiga la recheck gareeyaa, membership waa la hubinayaa, hal waddo oo authoritative ah ayaa message-ka qoraysa oo baahinaysa. Anonymous access production ma jiro.
13. **Dependency kasta waa la eegayaa** kahor intaan lagu daray: source, license, maintenance, CVE, lockfile. `bun install --frozen-lockfile` ayaa la isticmaalayaa.
14. **Test la'aan deploy ma jiro.** Arrinta P0/P1 kasta waxay leedahay regression test oo lagu celin karo.
15. **Deploy waa hal service, hal change, hal window.** Rollback artifact waa inuu diyaar ahaadaa kahor deploy. Jimcaha galabtii iyo "big-bang migration" waa mamnuuc.

---

## 3. Heerka daciifnimada iyo waqtiga jawaabta (Severity & SLA)

| Heer | Macnaha | Tusaale mashruucan | Waqtiga jawaabta |
|---|---|---|---|
| **S0 — Critical** | Lacag, access, ama xog uu qof helayo hadda | Quiz 100%been ah; bundle paid balse locked; session stolen oo 30 maalmood shaqaynaya; CSP oo UI jebisa; production down | Deploy isla markiiba waa la joojinayaa; containment ≤30 min; founder waa la ogeysiinayaa |
| **S1 — High** | Waddo dhab ah oo abuse ah, balse aan weli si ballaaran u dhicin | Coupon unlimited; REST chat/polls access leak; host reconnect; checkout race; refund entitlement; email failures | Triage ≤24h; fix kahor deploy-ka xiga |
| **S2 — Medium** | Khatar dhexe / quality risk | Indexes la'aan; SW private caching; i18n incomplete; poll results early; HSTS local | Sprint-ka ku xiga |
| **S3 — Low** | Arrin yar / hygiene | "Download PDF" label; stale config; demo toast | Backlog |

**Damiin:** S0 la helay → `Incident Commander` ayaa magacaaban, Change Approver waa la wacay, waxna laguma darayo deploy queue ilaa la xiro.

---

## 4. Threat model (waxa aan ilaalinayno)

### Hanti (Assets)
- Xogta ardayda: magac, email, telefoon, waddan, da' (7-12 ayaa la sheegay), progress, notes.
- Lacag: `Payment`, coupon, referral, refund, invoice, revenue reporting.
- Kalsooni: certificate verification (`/verify/[code]`), brand-ka SHEEGOW.
- Live class: video/audio, chat, whiteboard, polls, attendance, gamification.
- Admin authority: role changes, user deletion, payment status edits.

### Cadaw (Adversaries)
| Cadaw | Waxay rabaan | Koontaroolka ugu weyn |
|---|---|---|
| Scanner/opportunist | exposed endpoints, default creds, env leak | fail-closed secrets, headers, rate limit, no demo users |
| Credential stuffer | login arday/admin | dummy hash + anti-enumeration + shared rate limit + per-account lockout |
| "Free-rider" student | class/video bilaash ah | hal access helper: enrollment + completed payment + unexpired trial; socket token recheck |
| Malicious teacher | arday aanu dhigan Progress/grade/diploma beddelo | ownership checks server-side, conditional updates, audit logs |
| Admin la jabsaday | payments/roles/delete users | `super_admin` dhab ah, self-demote block, soft delete, session revocation |
| Supply chain | dependency malicious | frozen lockfile, review, audit, minimal deps |
| **Khaladkeena** | db push, wrong deploy, leaked log | sharci Section 2 + checklists Section 11 |

### Trust boundaries
`Browser → Next API` · `Browser → Chat service (Socket.io)` · `API → Prisma/DB` · `API → Cloudinary/Resend/STUN/TURN` · `Admin UI → User/Payment data`.

Boundary kasta waa inuu leeyahay: **authenticate → authorize → validate → rate-limit → log (aan PII lahayn) → fail closed.**

---

## 5. Secure Development Lifecycle (Gates)

| Gate | Maxaa dhacaya | Dukumeenti / caddeyn |
|---|---|---|
| **G0 — Design** | Feature kasta oo taabanaya auth, lacag, live, PII, ama minors wuxuu helayaa 5-line threat note | `docs/SECURITY-PLAYBOOK.md` §3 |
| **G1 — Code** | Sharciyaasha Section 2 + standards Section 6 | code review |
| **G2 — PR** | Checklist §11; reviewer ≠ author; diff sig scan; no secret in diff | PR template |
| **G3 — CI** | `typecheck`, `lint`, `vitest`, `playwright`, `audit`, CSP Report-Only smoke | green build |
| **G4 — Pre-deploy** | Backup + rollback tag + go/no-go checklist §11 + smoke plan | Change Approver ogolaansho |
| **G5 — Post-deploy** | 30 daqiiqo la socod: health, error rate, login, checkout (sandbox), certificate verify, socket join | incident channel |
| **G6 — Freeze** | Jimcaha galabtii, ciidaha, iyo inta uu S0 furan yahay: deploy ma jiro | calendar |

**Migration gate:** migration kasta waa inuu noqdaa **additive first** (ku dar column/table, backfill, kadibna remove old), oo uu leeyahay rollback SQL oo la tijaabiyay.

---

## 6. Heerarka code (Secure coding standards)

### Backend / API
- `requireAuth` → `require...Role` → `ownership` → `conditional update` had iyo jeer.
- **Check-then-act waa mamnuuc** meesha lacag, state, ama reward ku jirto. Isticmaal `updateMany({ where: { id, status: "pending" } })` oo hubi `count === 1`.
- Transaction keliya: coupon consume + payment + enrollment + idempotency key + learning event.
- Quiz: `total` waxaa laga xisaabiyaa **dhammaan** su’aalaha server-ka; `submittedAt === null` waa qeyb ka mid ah `where`.
- Certificate: `findFirst({ orderBy: { submittedAt: "desc" } })`, re-check eligibility isla transaction-ka.
- Gamification: idempotency `(attemptId, submissionId, studentId, day)`; `quiz_master` wuxuu tirinayaa quiz kala duwan (`groupBy`), ma aha attempts.
- Refund approval: payment `refunded` + enrollment revoked + certificate `revokedAt` + socket privileges removed — hal transaction.
- Upload signing: `lessonId` waa inuu ka tirsanaadaa `courseId` la oggol yahay; `publicId` waa `[A-Za-z0-9_-]` oo keliya; `expiresIn` waa inuu dhab ahaanshaada.
- Public forms: `maxLength`, rate limit la wadaago, double opt-in newsletter, unsubscribe joogto ah.
- Response: `401/403` kala saar si cad; 500-gu waa `"Internal server error"` oo keliya; stack-ka logs ayuu ku jiraa, response ma aha.

### Auth & Session
- `purpose` waa **lagu kala saaray si sax ah**: `"access"`, `"refresh"`, `"socket"`. Verifier wuxuu hubinayaa `purpose === ...`, `algorithms: ["HS256"]`, `iss`, `aud`.
- `jti`/`sessionVersion` + active-session store; refresh kasta wuxuu tirayaa kii hore; reuse → revoke all sessions.
- `logout` / `change-password` / role downgrade / user deactivate → dhammaan sessions waa la jebinayaa.
- Cookies: `HttpOnly`, `Secure` prod, `SameSite=Lax` access / `Strict` refresh, refresh path `/api/auth`; CSRF: `Origin`/`Referer` check state-changing requests.
- Password: hal validator oo la wadaago (registration + change); ≥12 + 3/4 character classes.
- "Forgot password" waa real single-use reset token (TTL gaaban) ama waa laga saarayaa UI — demo toast mamnuuc.
- `super_admin` waa ka duwan `admin`; `requireSuperAdmin()` waa inuu dhab ahaadaa.

### Frontend
- SEO pages waa server components; client islands oo keliya ayaa interactive ah.
- `<script>` kasta wuxuu leeyahay `nonce`; `dangerouslySetInnerHTML` waa la escaped; `style-src 'unsafe-inline'` waa laga saarayaa markii la waafajiyo.
- SW wuxuu cache gareynayaa **public marketing paths oo keliya**; `Cache-Control: private/no-store` waa la ixtiraamayaa; logout wuxuu clear gareynayaa caches.
- Cookie consent wuxuu dhab ahaan u xannibayaa analytics.
- RTL: `ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start` — ma aha `left-*`/`right-*`.
- `<html lang/dir>` waa server-ka laga go'aamiyay; auth/messages/errors/SEO waa la turjumay.
- Card/CVC fields ma jiraan ilaa real provider tokenization jiro; demo waa la calaamadeeyay.
- Skip link → `id="main-content"` wuxuu ku jiraa `<main>` kasta.
- HSTS waa `proxy.ts` laga bixiyaa oo keliya marka `NODE_ENV=production && https`.

### Realtime / WebRTC
- Token: handshake + periodic recheck; class scope **had iyo jeer** (prod/dev); identity ka timid token, ma aha client payload.
- Hal waddo: chat service ayaa persist gareynaya kadibna baahinaya (ama Next API ayaa publisher ah) — `id` isku mid ah.
- Host reconnect: `broadcast-start` dib ayaa loo dirayaa ama local media waa la joojinayaa ilaa dib loo bilaabo; UI ma muujin karo "live" been ah.
- Poll: `results` ma baxayso ilaa user uu vote gareeyay ama poll uu dhammaaday; close+vote waa atomic.
- Attendance: socket presence dhab ah ayaa loo baahan yahay; minutes waa la xaddidayaa daaqada class-ka.
- Whiteboard: state replies waa requester-keliya; stroke coords waa finite/bounded; PNG data URL waa la allowlist gareeyay.
- Scaling: Redis adapter + shared rate state, ama si cad u "single instance only" oo load balancer la'aan.
- Moderation + retention: message report/block/delete;朵 retention policy la qoray. Minor DM: xiriir la oggol yahay oo keliya.

### Data & Ops
- `Decimal(12,2)` / integer minor units; `enum` statuses; `refunded` waa status rasmi ah; `refundedAt/refundedAmount`.
- Soft delete `User`/`Course`; `Restrict` financial children; indexes `Payment(studentId, createdAt)`, `(courseId, status)`, `User(phone)`.
- Migrations versioned; PITR/backups la xaqiijiyay; rollback runbook; `db push --accept-data-loss` mamnuuc.
- Email: `RESEND_*` waa required prod; failure waa la arkayaa (alert + queue/retry); `FROM` waa domain la xaqiijiyay; docs waxay la mid yihiin code.
- Health: `/api/health` (process + DB) oo lagu xiro monitoring; `/health` chat waa internal only.
- Build/start: hal canonical script; `tee` la'aan; `bun install --frozen-lockfile`; server.log aan la tracked.

---

## 7. Red Team — Xeerarka ka qaybgalka (Rules of Engagement)

> Waxaan u dhaqmeynaa sida red team **mas'uul ah**: helitaanka daciifnimada waa okay; waxyeelinta isticmaale waa marna okay.

1. **Ogolaansho qoraal ah** ayaa loo baahan yahay ka hor fadhi kasta: aqbalaha, baaxadda (scope), waqtiga, iyo xiriirka stop-call.
2. **Production (`https://sheegowacademy.com/`) waa default "passive-only"**: TLS/headers/public HTML/robots/sitemap ayaa la eegi karaa. **Scan gardarro ah, fuzzing, brute-force, ama request-volume ma jiro** ilaa ogolaansho cad la bixiyo.
3. **Local ama staging ayaa la door bidaa.** Tijaabada lacagta, coupon, quiz, certificate, iyo enrollment waxaa lagu sameeyaa test accounts + sandbox payment oo keliya. **Lacag dhab ah lama isticmaalo.**
4. **Xog dhab ah lama isticmaalayo, lama akhriyayo, lama kaydinayo.** Haddii response uu ku jiro PII → isla markiiba waa la redact gareynayaa, lama wadaagin.
5. **Max request rate** ayaa la dejinayaa (tusaale ≤5 rps), oo lama dhaafayo; **ma jiro DoS, stress test, ama race-condition flood** oo saameyn kara isticmaale kale.
6. **Stop conditions:** (a) calaamad kasta oo production impact ah, (b) S0 la helay, (c) mulkiilaha uu yiraahdo "stop", (d) xog shaqsi oo la arkay. Markaas: jooji, duub, sheeg.
7. **Ma jiro social engineering** oo lagu beegsanayo arday/macallin/shaqaale, ma jiro phishing dhab ah, ma jiro physical attack, ma jiro third-party scanning oo aan la ogolaan.
8. **Ma jiro "fix while testing".** Red team wuu helayaa oo wuu diiwaangelinayaa; blue team ayaa hagaajinaya ka dib ogolaansho gooni ah.
9. **Qaabka natiijada:** `ID | Title | Severity | Endpoint/file:line | Reproduction (safe) | Impact | Fix | Regression test`. Reproduction waa inuu badbaado u yahay qof akhrinaya.
10. **Caddaynta** waxaa lagu hayaa meel xaddidan; screenshots-ka PII leh lama dhajinayo Slack/PR/public channel.
11. **Ethics:** Tijaabinta waa oo keliya nidaamka uu mulkiilahu leeyahay. Ma jiro wax "for the greater good" ah oo sharci/dar ah.

---

## 8. Blue Team — Hawlgalka difaaca (Runbooks)

### Maalin kasta (≤10 min)
- `/api/health` + chat `/health` → OK.
- Error rate, 401/403 spike, failed login count, payment anomalies, coupon reuse, socket auth errors.
- Cert verify requests aan caadi ahayn; admin role changes; user deletions.

### Toddobaad kasta
- Dependency/CVE audit; lockfile frozen check.
- Permission review: kasta oo `admin`/`super_admin` ah ma uu yahay mid la filayo?
- Log redaction test: ma jiraa `apiKey`/`refreshToken`/`accessToken` oo plaintext ku jira?
- Backup restore drill (bil kasta), PITR check.

### Dhacdo (Incident) — 6 tallaabo
1. **Detect** → ogow calaamadda; fur incident ID.
2. **Triage** → S0/S1/S2/S3; magacaab Incident Commander; wac Change Approver.
3. **Contain** → revoke sessions/tokens, disable endpoint/flag, freeze deploy, preserve evidence (logs aan la tirtirin).
4. **Eradicate** → hagaaji root cause + regression test; rotate secrets haddii loo baahdo.
5. **Recover** → deploy la ogolaaday + smoke tests; 30-min watch; user comms haddii PII laga hadlay.
6. **Postmortem** → 48h gudaheed: maxaa dhacay, maxaa la waayay, waxa laga hortagayo, `SECURITY.md` update.

### Secret rotation (tusaale)
`generate new → set in provider env → deploy approved → verify → revoke old → update doc (name only) → log incident ID`. **Qiimaha cusub waligeed laguma qoro dukumeenti ama chat.**

### Backup & rollback
- Kahor deploy kasta: DB snapshot + image tag + migration ID waa la duubayaa.
- Rollback = image tag hore + compatible migration. **Destructive migration lama celin karo** — sidaa darteed additive-first ayaa qasab ah.

---

## 9. Production Change Protocol (gaar ah `sheegowacademy.com`)

- Waddo kasta oo public ah waa inay ka timaadaa hal canonical build; `vercel.json`, `render.yaml`, `Caddyfile`, `.zscripts` isku mid ma noqon karaan — hal architecture ayaa la dooranayaa ka hor wax hagaajin ah.
- CORS: `https://sheegowacademy.com` + origins cadcad oo local/preview; `origin: true` production mamnuuc.
- Payments: sandbox keliya; `DEMO_MODE=true` production mamnuuc; real charge kasta waa inuu yeesho webhook verified + idempotency.
- Smoke test kasta oo deploy kadib ah: `GET /`, `/courses`, `/api/health`, login (test user), `/dashboard`, checkout sandbox, `/api/certificates/verify/<test>`, socket join test class.
- Legal/copy: `terms`, `privacy`, landing copy, SEO shell waa inay isku raacaan (online checkout, processors, recording policy, minors).

---

## 10. Diiwaanka daciifnimada (laga helay dib-u-eegis 2026-11-28)

**Status:** `QG-1`, `BL-1`, `CSP-1`, `DEP-1` = `FIXED — VERIFIED` (dib-u-eegis madax-bannaan); inta kale waa `OPEN`.
**Wave 1 waa la deploy gareeyay** (ogolaansho cad): commit `5608526` + `1366bbd`, Vercel auto-deploy `success`, `/api/health` 200, HTML 27/27 scripts nonced.
**Wave 2 active scan (staging localhost keliya, 2026-11-28):** `SES-1`, `ACL-1`, `PAY-1` waa la xaqiijiyay — eeg `docs/security/WAVE2-scan-results.md`.
**Wave 2 hagaajin (staging, 2026-11-28):** `SES-1`, `ACL-1`, `PAY-1` waa la hagaajiyay; dib-u-eegis madax-bannaan (reviewer ≠ author) wareeggiisii labaad wuu dhammaystirmay, High/Medium dhammaan `Resolved`; staging re-scan 27/32 + coupon scan 8/8 (5 check ayaa 429 ka yimid `/register`, ma aha daciifnimo). 47/47 tests, `tsc --noEmit` clean (eeg `docs/security/WAVE2-fix-verification.md`). Ma jiro schema/env/dependency change. **G3 ✅; G4 deploy ma jiro ogolaansho cusub; Wave 3 ma bilaabayo.**

| ID | Daciifnimada | Sev | Gate | Status |
|---|---|---|---|---|
| `QG-1` | Quiz grading: hal jawaab → 100%, progress/certificate | S0 | P0 | `FIXED — VERIFIED` |
| `BL-1` | Bundle: `courseId:null` + `paymentId @unique` → paid balse locked / P2002 | S0 | P0 | `FIXED — VERIFIED` |
| `CSP-1` | Nonce request-ka ma gaarayo; SW/SeoShell scripts unnonced; Maps iframe blocked | S0 | P0 | `FIXED — VERIFIED` |
| `DEP-1` | Saddex architecture oo is-diid ah; SQLite vs postgres provider; health la'aan | S0 | P0 | `FIXED — VERIFIED` |
| `SES-1` | Refresh token 30d ma la burinayo logout/password kadib; rotation la'aan | S1 | P1 | `OPEN` |
| `ACL-1` | Trial-approved student socket token 403; REST chat/polls/attendance access leak | S1 | P1 | `OPEN` |
| `PAY-1` | Checkout non-atomic; coupon/referral unlimited; `Float` money | S1 | P1 | `OPEN` |
| `RT-1` | No SFU; single-instance chat; host reconnect; stale socket auth; dual chat path | S1 | P1 | `OPEN` |
| `OPS-1` | Migration/backup/test/email observability la'aan; logger redaction bug | S1 | P1 | `OPEN` |
| `FE-1` | i18n qayb ah; SW private caching; client-only SEO; consent aan la dhaqan gelin | S2 | P2 | `OPEN` |
| `DATA-1` | Indexes, `completedLessons`, trial model, coupon redemption, soft delete | S2 | P2 | `OPEN` |

Faahfaahinta buuxda iyo reproduction/checklist: `docs/SECURITY-PLAYBOOK.md`.

---

## 11. Checklists (kooban)

### PR security checklist
- [ ] Ma jiro secret/qiime sir ah diff-ka ku jira.
- [ ] `requireAuth` + role + ownership dhammaan endpoints cusub.
- [ ] Money/state/reward: conditional update gudaha transaction, idempotency.
- [ ] Input: validate + maxLength + allowlist; IP trusted source.
- [ ] Hal access helper ayaa la isticmaalay (ma aha local duplicate).
- [ ] Log: ma jiro PII/token; redaction test pass.
- [ ] CSP/nonce: `<script>` kasta waa nonced; HSTS prod HTTPS keliya.
- [ ] Regression test oo arrinta S0/S1 dib u celisa ayaa jirta.
- [ ] Reviewer ≠ author; CI green; migration additive + rollback la diiwaangeliyay.

### Pre-deploy go/no-go
- [ ] Change Approver uu ogolaaday (qoraal).
- [ ] Backup + image tag + migration ID waa la duubay; rollback diyaar.
- [ ] `SECURITY.md` Section 2 sharciyada la hubiyay.
- [ ] S0 furan ma jiro (ama uu si cad u la oggolaaday).
- [ ] Smoke plan + 30-min watch roster diyaar.
- [ ] Hal service keliya ayaa la cusbooneysiinayaa.

### Incident one-pager
`ID | detected_at | severity | impact | containing_action | IC | approver | evidence_location | rotation_needed | postmortem_due`

---

## 12. Dib u eegis iyo noocayn

- **Toddobaad kasta:** security sync 15 min — S0/S1 status, PR checklist, deploy calendar.
- **Bil kasta:** red-team fadhi la ogolaaday (passive ama local), dependency audit, backup drill.
- **Saddex bilood kasta:** external audit / penetration test oo qoraal ah, `SECURITY.md` dib loo eego.
- Dukumeentigan wax ka beddelkiisa waxaa ansixinaya **Change Approver**; nooca cusub waa la taariikheynayaa.

---

**Gabagabo:** Dastuurkani ma aha decoration. Waa shuruudda aan ku ilaalinayno tacabka, ardayda, macallimiinta, iyo kalsoonida `sheegowacademy.com`. Wave 1 (`QG-1`, `BL-1`, `CSP-1`, `DEP-1`) wuxuu dhamaystirmay G0→G5, waxaana la deploy gareeyay ogolaansho cad ka dib. **Wave 2 (`SES-1`, `ACL-1`, `PAY-1`) waa la hagaajiyay waana la xaqiijiyay staging gudaheed; `RT-1`, `OPS-1` weli ma bilaaban. Deploy/Wave 3 ma bilaabayo ilaa ogolaansho cusub laga helo.**
