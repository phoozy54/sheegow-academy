# SECURITY-PLAYBOOK.md — Nidaamka shaqada ee amniga

**Nooca:** 1.0 · **Taariikhda:** 2026-11-28  
**La xiriir:** `SECURITY.md` (dastuurka). Playbook-kan waa "sida loo shaqeeyo", ma aha sharci cusub.  
**Production:** `https://sheegowacademy.com/` — default: **passive-only**, ogolaansho la'aan wax gardarro ah ma jiro.

---

## 0. Sida la isticmaalo

```
Fikrad / daciifnimo
   → G0 Threat note (§3)
   → Blue Team: hagaaji + regression test
   → G2 PR checklist (§5)
   → G3 CI green
   → G4 Pre-deploy go/no-go (§6) + ogolaansho cad
   → Deploy (hal service)
   → G5 30-min watch (§7)
   → Diiwaan ku dar (§8)
```

> **Xusuusin:** Haddii aad tahay red team: ma hagaajinaysid, ma deploy gareynaysid, ma isticmaalaysid xog dhab ah. Haddii aad tahay blue team: ma ansixinaysid isbeddelkaaga, ma sameynaysid deploy ogolaansho la'aan.

---

## 1. Maatrikska ogolaanshaha (Authorization matrix)

| Ficil | Red Team | Blue Team | Change Approver |
|---|:---:|:---:|:---:|
| akhri code / docs | ✅ | ✅ | ✅ |
| passive check production (headers, public HTML) | ✅ | ✅ | ✅ |
| local/staging active testing | ✅ (oo la diiwaangeliyay) | ✅ | ✅ |
| production active scan / fuzz / brute | ❌ | ❌ | ✅ (qoraal, waqti, scope) |
| beddel code / migration | ❌ | ✅ | ✅ |
| commit / PR | ❌ | ✅ | ✅ |
| deploy / rollback / rotate secret | ❌ | ❌ | ✅ |
| ansixi S0 closure | ❌ | ❌ | ✅ |

---

## 2. Deegaannada iyo xogta la isticmaali karo

| Deegaan | Waxa la oggol yahay | Waxa mamnuuc ah |
|---|---|---|
| **Local** (`:3002`, chat `:3003`) | test accounts, sandbox payment, synthetic data, DDL/migrations | real credentials, real customer data |
| **Staging** | red-team active tests, load within agreed rate | real payments, real student PII |
| **Production** `sheegowacademy.com` | passive checks, health, agreed smoke tests on test account | fuzzing, brute force, race floods, real payment tests, PII export |

**Synthetic test data policy:** magacyo sida `Test Student`, `test+<random>@example.com`, telefoon `+1555...`, coupon `TESTONLY`, class `test-class-01`. Waligeed laguma qaso xogta dhabta ah; DB snapshot laga keenay production ma jiro staging ilaa la anonymize gareeyo oo la ogolaado.

---

## 3. G0 — Threat note template (5 sadar, qasab ah)

Waxaa la qorayaa ka hor code kasta oo taabanaya auth / money / live / PII / minors.

```
Feature / endpoint:
Asset affected:          (payment | certificate | live class | student PII | admin authority)
Trust boundary crossed:  (browser→API | socket→service | API→DB | API→3rd party | admin→user)
Worst-case abuse:        (max 1 sadar: qof maxuu heli karaa?)
Primary control + test:  (e.g. conditional update in $transaction; test name: quiz_total_all_questions)
Rollback / kill switch:  (flag off | migration rollback | endpoint disabled)
```

Haddii 5-ta sadar la buuxin waayo → feature-ka ma gudbi karo G1.

---

## 4. Red Team — Test matrix (badbaado leh)

> Dhammaan waxaa lagu sameeyaa **local/staging** ama production **passive**. Haddii calaamad impact ah muuqato → **STOP** oo sheeg.

| ID | Daciifnimada la tijaabiyay | Tijaabada badbaadsan | Loo filayo (secure) | Sev |
|---|---|---|---|---|
| `QG-1` | Quiz hal jawaab → 100% | Local: 10-su’aal quiz, dir 1 jawaab oo sax ah | `passed=false`, `score` sax ah, `total`=10 su’aal | S0 |
| `QG-1b` | Double submit | Isla `attemptId` laba jeer POST, isku mar | Marka 2aad `409`, points hal jeer keliya | S0 |
| `BL-1` | Bundle paid balse locked | Sandbox: bundle 2 course, checkout, open both lessons | labada lesson waa furan yihiin; 1 payment, 2 allocations | S0 |
| `CSP-1` | CSP blocks hydration | Browser devtools: console errors + `document.querySelector` interactive | 0 CSP violations, nonce dhammaan scripts, Maps iframe load | S0 |
| `DEP-1` | Health/routing | `GET /api/health`, `GET /health` chat, common static routes | 200, DB check OK, port consistent | S0 |
| `SES-1` | Refresh token after logout | Local: login → capture refresh cookie (test acct) → logout → refresh | `401`, session revoked, token reuse detected | S1 |
| `SES-1b` | Password change | Change password → refresh with old token | `401`, all sessions revoked | S1 |
| `ACL-1` | Trial student socket 403 | Approved trial (test) → request socket token | token la bixiyay, class-scoped | S1 |
| `ACL-1b` | Unpaid REST chat | Enroll without payment → POST `/api/live/:id/messages` | `402/403`, ma jiro message/attendance/poll | S1 |
| `PAY-1` | Checkout race | 2 concurrent sandbox checkouts same course/test user | 1 payment completed, 1 enrollment, second idempotent | S1 |
| `PAY-1b` | Coupon reuse | Coupon `TESTONLY` laba checkout | marka 2aad diiday / `usageCount` koray | S1 |
| `PAY-1c` | Client price tampering | POST body `price:0.01` | server DB price ayaa la isticmaalay | S1 |
| `RT-1` | Host reconnect | Local: disconnect host socket 5s, reconnect | viewers dib ayay u helayaan stream ama "restart" cad | S1 |
| `RT-1b` | Stale socket authority | Revoke enrollment → privileged emit on open socket | server wuu diidayaa / disconnect | S1 |
| `RT-1c` | Poll results early | GET polls before vote | `results` ma jiro | S2 |
| `OPS-1` | Log redaction | Log object `{apiKey:"FAKE", refreshToken:"FAKE"}` | `***` ayaa u muuqda, FAKE ma u muuqda | S1 |
| `OPS-1b` | Email failure | Unset `RESEND_API_KEY` local → trigger welcome | failure waa la arkay/alert, ma aha silent no-op | S1 |
| `FE-1` | SW private caching | Login → visit `/invoice/...` → logout → offline reload | private route cache ma jiro; `no-store` la ixtiraamay | S2 |
| `FE-1b` | Consent | Decline cookies → click course card | analytics request ma baxayso | S2 |
| `FE-1c` | RTL | Switch Arabic → inspect `<html dir>` + icon alignment | `dir=rtl`, logical spacing | S2 |
| `DATA-1` | `completedLessons` | Complete lesson "12" → dashboard count | `12` ma aha `1` | S2 |

**Stop conditions (ku celcelin):** production impact · S0 la helay · PII la arkay · mulkiilaha "stop" · rate xadka dhaaftay.

---

## 5. G2 — PR checklist (buuxa)

**Amniga**
- [ ] Diff-ka ma jiro secret, token, password, signed URL, ama `.env` qiime.
- [ ] Endpoint kasta: `requireAuth` → role → ownership → conditional update.
- [ ] Hal access helper; ma jiro `Boolean(enrollment)` oo kaligiis ah.
- [ ] Qiimaha/role/`passed`/`paid` server-ka ayaa ka yimaada, ma aha request body.
- [ ] Lacag/state/reward: `$transaction` + `updateMany(where status)` + idempotency.
- [ ] Input: type, maxLength, allowlist, `UUID`, domain/lesson ownership.
- [ ] IP: source la aamino, ma aha client-injected `x-forwarded-for`.
- [ ] Rate limit: shared store (Redis/Upstash) halkii `Map` gudaha process ah.
- [ ] Log: ma jiro PII/token; `redact()` camelCase ayay qabataa; stack production raw ma aha.
- [ ] Errors: 401/403 cad, 500 waa generic.
- [ ] CSP: `nonce` gaaray `headers()` + `<script>` kasta; `frame-src` allowlist; HSTS prod HTTPS.
- [ ] SW: public paths oo keliya; logout clear.
- [ ] Realtime: token class-scope, recheck, membership, identity token-ka ka timid, hal publish path.
- [ ] Migrations: additive-first + rollback SQL + backfill; `--accept-data-loss` ma jiro.
- [ ] Dependencies: ma jiro package cusub oo aan la eegayn; lockfile frozen.
- [ ] Test: regression test oo S0/S1 dib u celisa ayaa jirta; CI green.

**Habka**
- [ ] Reviewer ≠ author.
- [ ] PR description wuxuu ku jiraa `Threat note` (§3) haddii uu khuseeyo.
- [ ] Docs (`SECURITY.md` remediation register, README, terms/privacy) waa la cusbooneysiiyay haddii loo baahdo.

---

## 6. G4 — Pre-deploy go/no-go

- [ ] **Change Approver** uu ogolaansho qoraal ah bixiyay (chat/message waa okay, waa inay cad tahay).
- [ ] Waxaa la go'aamiyay **hal service** oo la cusbooneysiinayo; kuwa kale lama taabanayo.
- [ ] DB snapshot ID + image tag + migration ID waa la duubay.
- [ ] Rollback la tijaabiyay (ama ugu yaraan la qoray: `image:<previous>`, `migration:<previous>`).
- [ ] S0 furan ma jiro; haddii uu jiro, waa la xalliyay ama si cad loo ogolaaday.
- [ ] `bun install --frozen-lockfile`; hal canonical build/start script.
- [ ] Env var **magacyada** waa la xaqiijiyay (ma aha qiimaha): `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SUPER_ADMIN_PASSWORD`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TURN_SECRET`, `CLOUDINARY_*`.
- [ ] `DEMO_MODE=true` ma aha production; `NODE_ENV=production` waa sax; HSTS HTTPS keliya.
- [ ] CORS/allow-list sax ah; `origin:true` ma jiro.
- [ ] Smoke plan + 30-min watch roster diyaar.
- [ ] Jimce galab / ciido ma aha; ma jiro big-bang migration.

---

## 7. G5 — Post-deploy 30-min watch

| Daqiiqo | Hubi |
|---|---|
| 0–2 | `/api/health` 200 + DB OK; chat `/health` 200; 5xx rate |
| 2–5 | `GET /`, `/courses`, `/courses/<slug>`; console CSP violations = 0 |
| 5–10 | Login test account → `/dashboard`; logout → refresh token fails (post-fix) |
| 10–15 | Checkout sandbox → enrollment → lesson open; coupon consumed |
| 15–20 | Socket join test class; host broadcast; chat message persisted + live |
| 20–25 | `/api/certificates/verify/<test>`; `/verify/<code>` metadata |
| 25–30 | Error log scan (no PII/token), payment count, auth failure spike |

Haddii wax ka mid ah failure noqdaan → **rollback decision** isla markiiba, ha sugin "bal subaxda".

---

## 8. Diiwaan & warbixinta daciifnimada

### Qaabka finding-ka
```
ID:          QG-1
Title:       Quiz grading counts only submitted answers
Severity:    S0
Location:    src/app/api/quizzes/[id]/submit/route.ts:91-127
Repro (safe): local test quiz, 10 questions, submit 1 correct answer
Observed:    score=100, passed=true, progress+points awarded
Expected:    score=0.1, passed=false
Impact:      certificate/gamification bypass; trust + revenue risk
Fix:         compute total from all server-side questions; conditional update
Regression:  quiz_total_all_questions.spec.ts
Status:      OPEN → FIXED → VERIFIED (verifier: <name>, date)
```

### Qaabka dhacdada (incident)
```
INC-YYYYMMDD-NN | detected | severity | asset | impact
IC: ... | Approver: ...
Contain: ... | Eradicate: ... | Recover: ...
Secrets rotated: yes/no (name only) | Evidence: <restricted path>
Postmortem due: +48h | Link: ...
```

---

## 9. Remediation waves (oo la raacayo dastuurka)

> **`QG-1`, `BL-1`, `CSP-1` waa `FIXED — VERIFIED`; `DEP-1` waa `FIXED — pending independent review`; inta kale waa `OPEN`.**
> Ma jiro commit, push, ama deploy la sameeyay.

### Wave 1 — P0 / S0 (kahor wax kasta oo kale)
| ID | Acceptance criteria | Regression test |
|---|---|---|
| `QG-1` | `total` = dhammaan su’aalaha server-ka; short answers waa la keydiyaa balse ma auto-pass gareeyaan; `submittedAt` conditional; dedupe + `@@unique(attemptId,questionId)` (no `skipDuplicates`, SQLite-portable) | `quiz_total_all_questions`, `quiz_duplicate_answers_deduped`, `quiz_double_submit_second_claim_rejected` |
| `BL-1` | Bundle checkout → 1 completed payment per billable course (allocation in cents); `Enrollment.paymentId @unique` safe; deterministic `Payment.id` (student+bundle+generation+course, **time-independent**) → concurrent checkout waa idempotent; P2002 waa PK-only; refund wuxuu furayaa generation cusub. **Backfill hore: `BLOCKED` — migration u baahan snapshot + ogolaansho** | `bundle_two_courses_access`, `bundle_payment_allocation`, `bundle_payment_ids_are_permanent_and_unique`, `refund_advances_generation` |
| `CSP-1` | nonce forwarded on request headers; builder with strict-dynamic + no unsafe-inline in script-src; ALL inline scripts nonced (layout/SW/SeoShell/ThemeProvider); `frame-src` Maps; dev unsafe-eval inside script-src | `script_src_nonce_no_unsafe_inline`, `dev_unsafe_eval_scoped`, `maps_frame_src`, `all_inline_scripts_nonced`, `proxy_forwards_nonce`, `next_themes_script_nonce` |
| `DEP-1` | **Vercel + Neon** waa hal target; `render.yaml` = chat keliya; `/api/health` (`SELECT 1`, `no-store`, `503`, 10s cache); `db:push` = empty-DB bootstrap la xaqiijiyay; exported `DATABASE_URL` wuu guulaystaa; `db:deploy` waa no-op ilaa migrations la keeno; Caddy/`.zscripts` oo `ARCHIVED` ah (ma la tiray) | `canonical_architecture_documented`, `no_accept_data_loss_and_no_env_override`, `render_yaml_chat_only`, `schema_provider_postgresql`, `archived_self_host_marked`, `health_payload_shape`, `health_route_no_leak`, `health_probe_is_throttled_and_no_store`, `health_failure_returns_503_without_exposing_the_error` |

### Wave 2 — P1 / S1
`SES-1` session rotation/revocation · `ACL-1` shared live-access helper · `PAY-1` atomic checkout + coupon consume + `Decimal` · `RT-1` token recheck/reconnect/single publish path · `OPS-1` migrations/backup/tests/email/redaction.

### Wave 3 — P2 / S2–S3
`FE-1` i18n/SW/consent/SEO · `DATA-1` indexes/soft delete/coupon redemption/trial model · gamification aggregates · legal/copy consistency · repo hygiene.

**Wave gate:** Wave 2 ma bilaabanto ilaa Wave 1 `VERIFIED` uu noqdo oo uu Change Approver ansixiyo.

---

## 10. Kill switches & recovery

| Xaalad | Kill switch | Soo kabasho |
|---|---|---|
| CSP jebisa UI | `Content-Security-Policy-Report-Only` ilaa nonce la saxo | Dib u enforce |
| Checkout bug | `DEMO_MODE=false` + disable checkout endpoint flag | Fix + sandbox retest |
| Socket auth leak | Disable chat service / revoke all socket tokens | Rotate `JWT_SECRET`, deploy approved |
| Payment/coupon abuse | Deactivate coupon codes + freeze checkout | Backfill + replay guard |
| Bad migration | **Additive-first** → migration hore waa lahayn; restore snapshot haddii wax la tiray | PITR restore + postmortem |
| Secret shaacday | Revoke old → generate new → deploy → verify → update docs (magac keliya) | Incident `INC-...` |

---

## 11. Noocayn

| Nooca | Taariikhda | Isbeddelka |
|---|---|---|
| 1.0 | 2026-11-28 | Dastuur + playbook la abuuray; diiwaanka daciifnimada la furay; dhammaan OPEN; wax isbeddel/design deploy ah ma dhicin. |
| 1.1 | 2026-11-28 | `QG-1` hagaajin la dhammeeyay (pending review): grading helper + atomic claim + 7 Bun tests; ma jiro schema/env/deploy change. |
| 1.2 | 2026-11-28 | `BL-1` hagaajin la dhammeeyay (pending review): payment-per-course + cent allocation + idempotency + 6 Bun tests; ma jiro schema/migration/env/deploy change. |
| 1.3 | 2026-11-28 | Dib-u-eegis madax-bannaan: 5 finding la hagaajiyay (concurrent idempotency → deterministic `Payment.id`; replay scope; tiny-price; Float drift; malformed `textAnswer`). 18/18 Bun tests. `BL-1` backfill weli waa `BLOCKED — needs approved migration`. |
| 1.4 | 2026-11-28 | Dib-u-eegis #2: 60s bucket-boundary race waa la saaray (idempotency joogto ah); P2002 waa constraint-aware; `courseId` waa la sanitize gareeyay. 18/18 Bun tests. |
| 1.5 | 2026-11-28 | Dib-u-eegis #3/#4: refund kadib iibsasho waa la ogolaaday (generation counter, replay generation nadiif ah oo buuxa). 20/20 Bun tests. Dib-u-eegiga kama dambaysta ah: zero issues. |
| 1.6 | 2026-11-28 | `CSP-1` hagaajin la dhammeeyay (pending review): nonce request headers → layout/SeoShell/SW, `frame-src` Maps, CSP builder + 7 tests. 27/27 Bun tests. |
| 1.7 | 2026-11-28 | Dib-u-eegis CSP-1: 0 High/Medium; 3 Low la hagaajiyay (Cloudinary test, response-header test, 128-bit `crypto.getRandomValues`); comment `next.config.ts` → `src/proxy.ts`. 27/27 Bun tests. |
| 1.8 | 2026-11-28 | `DEP-1` hagaajin la dhammeeyay (pending review): go'aanka `Vercel + Neon` docs ku jira; `/api/health`; `db:push` badbaado leh + `db:deploy`; self-host toolchain `ARCHIVED`; 8 deployment tests. 35/35 Bun tests. Ma jiro migration/deploy/env value change. |
| 1.9 | 2026-11-28 | Dib-u-eegis DEP-1: 3 MED + 4 LOW la hagaajiyay — `DATABASE_URL` override laga saaray; bootstrap diidaya DB aan madhnayn; health 10s cache + `GET()` tests dhab ah; Railway/3003 iyo calaamadaha archived la saxay. 36/36 Bun tests (9 deployment). |
| 1.10 | 2026-11-28 | Dib-u-eegis #2: bootstrap `spawnSync` raw output la qabtay/la tuuray (`stdio` pipe, ma aha `inherit`); fariin guud keliya; test-ku wuxuu xaqiijiyaa `shell: false` iyo in `stdout/stderr` aan la gudbin. 36/36 Bun tests (186 expect). |
| 1.11 | 2026-11-28 | Push + deploy la ogolaaday: `5608526` Vercel auto-deploy wuu guuleystay, `/api/health` 200. Post-deploy HTML check wuxuu helay `next-themes` script nonce la'aan → `ThemeProvider nonce={nonce}` + regression test. 37/37 Bun tests (188 expect); dib u deploy. |
| 1.12 | 2026-11-28 | `1366bbd` deploy `success`. G5 verification: `/` HTML 27/27 `<script>` nonced (0 missing), CSP nonce + strict-dynamic + no unsafe-inline + Maps frame-src, `/api/health` 200 db ok. `SECURITY.md` status rows la cusboonaysiiyay: Wave 1 `VERIFIED` + deployed, Wave 2 opens only on new approval. |

---

**Hubin ka hor intaadan wax qaban:** Ma haystaa ogolaansho cad? Ma uu jiraa S0 furan? Ma diyaar baa rollback? Haddii mid ka mid ah "maya" yahay → **joog, weydii, ha dhaqmin.**
