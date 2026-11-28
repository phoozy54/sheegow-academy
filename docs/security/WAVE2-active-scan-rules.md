# G0 Threat Note + Rules of Engagement — Wave 2 Active Scan

**Nooca:** 1.0 · **Taariikhda:** 2026-11-28 · **Gate:** G0 (qoran) → ogolaansho preview URL → G4 go/no-go → scan → G5 report
**Xaalad:** `COMPLETED` — 25/60 requests oo staging localhost ah; natiijada waxaa ku qoran `WAVE2-scan-results.md`. (Mulkiilaha ayaa oggolaaday container cusub oo deegaanka ku jira; Vercel/Neon API lama isticmaalin, secrets lama akhriyin.)

---

## 1. G0 Threat Note

```
Feature / endpoints (staging preview KELIYA):
  Auth/session: POST /api/auth/login, refresh, logout, password change
  Access control: socket token, /api/live/:id/messages, polls, attendance
  Payment: POST /api/bundles/:id/checkout (or equivalent checkout route),
           coupon redemption, price validation

Asset affected:
  Staging-only session state, synthetic accounts, sandbox payment records

Trust boundary crossed:
  Test client → Vercel preview → staging Neon DB → sandbox payment processor

Worst-case abuse / breakage (on staging):
  - Stolen refresh cookie still works after logout/password change → session hijack
  - Trial/unpaid student obtains a socket token or writes chat/poll/attendance
  - Two concurrent checkouts both succeed → double enrollment / double charge
  - Coupon reused without limit; client-supplied price accepted by server

Primary control + test (Wave 2 fixes, not yet implemented):
  SES-1: refresh rotation + revoke all sessions on logout/password change
  ACL-1: one shared server-side live-access helper (enrollment + completed payment)
  PAY-1: atomic checkout + coupon consume in one transaction; Decimal/integer cents;
         server-side price only

Rollback / kill switch:
  No production change, no schema/migration, no env value, no secret handling.
  Stop the scan at once on any 5xx spike, unexpected email/SMS, or real charge.
  Staging DB is disposable; no cleanup of production data is needed.
```

---

## 2. Rules of Engagement (qasab ah)

### Target
- **Keliya** Vercel preview URL oo uu mulkiilaha bixiyo.
- **Mamnuuc:** `sheegowacademy.com`, `www.sheegowacademy.com`, ama wax domain/DB ah oo production ah.
- Preview-ku waa inuu isticmaalaa **Neon database gooni ah** — ma aha production DB.

### Xogta la isticmaalayo
- Keliya synthetic accounts: `wave2-<purpose>-<shortid>@example.test` (`.test` waa reserved; email dhab ah ma jiro).
- Magacyo, telefoon, iyo payment details **khayaali ah**; PII dhab ah ma jiro.
- Payment processor waa inuu ahaadaa **test/sandbox mode**. Lacag dhab ah ma jiro.

### Waxa la ogolaanayo
| Baaritaan | Baaxad |
|---|---|
| `SES-1` | login → logout → refresh (old token waa inuu `401` noqdaa); password change → refresh old token `401` |
| `ACL-1` | trial-approved test account → socket token; unpaid account → POST chat/poll/attendance waa inuu `402/403` noqdaa |
| `PAY-1` | 2 concurrent sandbox checkouts (isla isticmaale); coupon `TESTONLY` laba jeer; POST body `price:0.01` (server price ayaa guulaysanaya) |

### Waxa mamnuuc ah
- Brute force, password spraying, rate-limit floods, fuzzing payloads waaweyn.
- SQLi/XSS payloads oo wax ka beddelaya xogta; `DELETE`/`DROP` ama DB direct access.
- Real email/SMS, real payment, real user accounts, production logs oo PII leh.
- API keys, connection strings, `.env` values, tokens, ama passwords la akhriyo/la daabaco.
- Scan kasta oo uu ku jiro wax ka badan **2 concurrent requests**.
- Wadarta guud: **≤ 60 requests** hal fadhi; haddii loo baahdo wax badan, ogolaansho cusub ayaa la qaadanayaa.

### Joojinta (kill switch)
- Haddii uu jiro 5xx oo aan la filayn, email/SMS dhab ah, ama charge dhab ah → **isla markiiba jooji**, waxna ha sii wadin.
- Natijada waxaa lagu qorayaa `docs/security/WAVE2-scan-results.md`: status code, kooban oo evidence ah, waqti — **laakiin waligeed cookie/token/password/connection string ma jiro**.

### Qalabka
- Ma jiro NPM package cusub; `bun`/`fetch` ama `Invoke-WebRequest` oo ku dhex jira ayaa la isticmaalayaa.
- Ma jiro Docker, ma jiro Vercel CLI, ma jiro Neon CLI oo la isticmaalayo.

---

## 3. G4 Go/No-Go (waa la buuxinayaa marka URL-ku yimaado)

- [ ] Preview URL waa la helay, waxaana la xaqiijiyay inaanu production ahayn
- [ ] Mulkiilaha ayaa xaqiijiyay in DB-du tahay staging oo gooni ah
- [ ] Mulkiilaha ayaa xaqiijiyay in payment-ku yahay sandbox
- [ ] G0 threat note + rules of engagement waa la ansixiyay
- [ ] Scan window, ≤60 requests, iyo kill switch waa la isku raacay

**Go'aanka:** `NO-GO` ilaa dhammaan sanduuqyada la calaamadiyo.
