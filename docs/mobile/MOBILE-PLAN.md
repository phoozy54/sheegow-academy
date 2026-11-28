# Sheegow Academy — Qorshaha Mobile (PWA First)

**Taariikhda:** 2026-11-28  
**Nooca:** 1.0 (qorshe la ansixiyay, aan la bilaabin)  
**Go'aanka mulkiilaha:** **PWA marka hore — 0 NPM package cusub.** Capacitor / React Native waa la dib dhigay; go'aan gaar ah ayaa loo baahan yahay.  
**Xaaladda:** Qorshe **local keliya**. Ma jiro commit, push, deploy, DB change, ama store submission. Production waa passive-only.

---

## 0. Digniin daacad ah oo ku saabsan "100% la hubo"

Ma jiro qorshe 100% dammaanad qaadi kara Apple/Google review, isbeddel OS, ama qalab kala duwan. Waxa la dammaanad qaadi karaa waa:

- **Shuruudo la cabbiri karo** (acceptance criteria) oo mid kasta uu leeyahay pass/fail cad.
- **Gates** (G0→G5) oo fail-closed ah: shuruud lagu guuldareysto → shaqada waa la joojinayaa ilaa Change Approver uu go'aan ka bixiyo.
- **Kala-saar waajibaad:** red team wuxuu sheegaa, blue team wuu hagaajiyaa, reviewer ≠ author, Change Approver ayaa ogolaada deploy/rollback.
- **Xogta dhabta ah lama taabanayo:** production GET/passive keliya; staging/local synthetic `.test` account, sandbox, ≤60 requests, ≤2 concurrent, 0 real email, 0 real charge, 0 PII dhab ah.

---

## 1. Shuruudaha adag (non-negotiable)

1. **Frontend: ma jiro NPM package cusub.** PWA-ga waxaa lagu dhisayaa React/Next.js/Tailwind jira + browser APIs. Manifest, icons, service worker, meta tags — dhammaantood waa faylo jira oo la beddelayo, ma aha dependency cusub.
2. **Ma jiro AWS.** Canonical: Vercel (app/API), Neon (Postgres), Render `sheegow-chat` (Socket.io/WebRTC), Cloudflare DNS (gray).
3. **Ma jiro commit/push/deploy** ogolaansho gaar ah la'aan. Deployment kasta wuxuu u baahan yahay G4 + Change Approver.
4. **Ma jiro sir la akhriyo/la daabaco:** token, password, API key, connection string, `.env` value, signing credential — **magaca env keliya** waa la isticmaali karaa.
5. **CSP adag:** `script-src` nonce + strict-dynamic; `unsafe-inline` scripts ma laha; 27/27 `<script>` tags waa inay nonced ahaadaan (`src/proxy.ts:15-61`, `src/lib/csp.ts:23-46`).
6. **Docker:** kaliya `sheegow-staging-db` waa la isticmaali karaa; 9-da kale lama taabanayo; `docker ps` ma jiro.
7. **Wave 3 (`RT-1`, `OPS-1`) ma bilaabayo** ogolaansho cusub la'aan. Qorshahan waa waji gooni ah.
8. **Diiwaanka:** `87dab69` (docs-only deploy record) weli waa **local keliya**, 1 commit oo remote ka horreeya. Faylkan sidoo kale waa local.

---

## 2. Ujeeddo

PWA rakiban (Add to Home Screen) oo iOS + Android ku shaqeeya, isla `https://www.sheegowacademy.com` URL, isla auth/cookies/API/CSP, oo buuxiya shuruudaha:

- responsive + touch + safe-area,
- accessibility WCAG 2.1 AA,
- i18n/RTL oo hydration ka hor bilaabma,
- auth oo ku shaqeeya "standalone" mode,
- install prompt + icons + offline shell oo **private content lahayn**,
- analytics oo cookie consent raacda,
- deep links oo sax ah.

**Ma bixiyo:** binary App Store/Play, APNs/FCM push dhab ah, background execution, FULL offline. Kuwaas waxaa looga baahan yahay Capacitor/RN — dib ayaa loo go'aaminayaa.

---

## 3. Wajiyada iyo gates

### G0 — Baaxadda (akhrin-keliya) ✅ qorshe ahaan

**Deliverables:**
- Faylkan (`docs/mobile/MOBILE-PLAN.md`).
- `docs/mobile/MOBILE-REQUIREMENTS.md` — device/OS matrix + acceptance criteria (Waji G1 ayaa qoraya).
- `docs/mobile/MOBILE-DECISION.md` — go'aanka PWA-first + sababta Capacitor/RN dib loo dhigay.

**Device/OS matrix (la tijaabinayo):**

| Platform | Qalab | OS | Width |
|---|---|---|---|
| iOS | iPhone SE (2nd gen), iPhone 15, iPad | iOS 16+ | 320 / 375 / 414 / 768 |
| Android | Pixel low-end, Samsung mid-range | Android 10+ | 320 / 375 / 414 / 768 |
| RTL | Soomaali + Carabi | — | `dir=rtl`, `<html lang>` sax |

**Gate:** Change Approver wuu saxiixay baaxadda. Weli kood lama beddelayo.

---

### G1 — Web app mobile-ready (0 package cusub)

Mid kasta waa pass/fail la cabbiri karo:

| # | Shuruudda | Sida lagu xaqiijinayo | Pass criteria |
|---|---|---|---|
| 1 | **Responsive + touch** | 34 bog × 4 width, browser tool (staging) | 0 horizontal overflow; touch target ≥44px; `env(safe-area-inset-*)`; landscape live-class shaqeynaya |
| 2 | **Accessibility** | Keyboard + VoiceOver/TalkBack smoke | Skip link `layout.tsx:142-148`; focus-visible; labels; `prefers-reduced-motion`; `<div onClick>` search-bar (`search-bar.tsx:345,359,373`) waa la hagaajiyay; charts description leh |
| 3 | **i18n / RTL** | localStorage locale → hydration | English flash ma jiro; `<html lang/dir>` sax `so`/`ar` (`i18n/index.tsx:137-171`, `layout.tsx:114`) |
| 4 | **Auth standalone** | staging `.test` account | HttpOnly cookies + `/api/auth/refresh` 401-dedupe (`lib/api.ts:73-89`) waxay ka shaqeeyaan standalone PWA; logout kadib session epoch wuu kordhaa |
| 5 | **PWA manifest + icons** | `public/manifest.webmanifest`, `public/icons/*` | `display: standalone`, `start_url: /`, theme/background color, 192/512 icon, `apple-touch-icon`, `apple-mobile-web-app-capable` |
| 6 | **Service worker (SW-1)** | `public/sw.js:38-83` | `/api/`, Cloudinary, chat waa laga baxsaday; HTML `private/no-store` **lama cache gareeyo**; `api.logout()` kadib `caches.delete()`; public marketing paths keliya ayaa cached ah |
| 7 | **Headers** | `next.config.ts:4,10,18-21`, `csp.ts:44-46` | HSTS **production HTTPS keliya** (local HTTP ma helayo); CORS allowlist + `Vary: Origin`; `style-src unsafe-inline` waa la diiwaangeliyay; `script-src` nadiif ah |
| 8 | **Consent + body caps** | `lib/analytics.ts:14-29`, `api-helpers.ts:48-60` | `trackConversion` wuxuu raacayaa `cookieConsent === "accepted"`; `safeBody` wuxuu leeyahay 32–64 KB cap → 413 |
| 9 | **Performance budget** | browser tool, throttled 4G | LCP <2.5s, CLS <0.1, TTI <3.5s; heavy views 71/64/52KB la cabbiray |
| 10 | **Deep links** | PWA installed | `/course/[slug]`, `/class/[id]`, `/certificate/[id]`, `/verify/[code]` si sax ah ayay u furmaan standalone |

**Gate G1 ✅:** `bun test` (47 jir + imtixaanno cusub oo pure helper ah), `bunx tsc --noEmit`, `bun run build` — dhammaan pass; reviewer ≠ author; production lama taaban.

---

### G2 — Amniga mobile ka hor (P0 oo laga helay daraasadda)

Kuwani waa shuruudo **ka hor inta token/qalab ku jirin** — xitaa PWA-da cookies ayay qalabku hayaa:

| ID | Shuruudda | Tixraac |
|---|---|---|
| `AUTH-2` | `requireSuperAdmin()` → `role === "super_admin"`; admin caadi ah ma kor qaadi karo super_admin | `lib/auth.ts:236-284`, `users/[id]/route.ts:106-118` |
| `PAY-3` | Refund hal transaction: `Payment.status` + `Enrollment` revoked + `Certificate.revokedAt` + socket revoke; verify endpoint wuu ixtiraamayaa `revokedAt` | `refunds/[id]/route.ts:163-205`, `certificates/verify/[code]/route.ts:37-44` |
| `NET-1` | Rate-limit shared (platform feature ama Redis); IP laga qaadanayo proxy la aamino | `lib/rate-limit.ts:8-40` |
| `PAY-2` | `NODE_ENV=production && DEMO_MODE` → fail closed + alert | `payments/checkout/route.ts:28-29` |
| `OPS-2` | Redaction camelCase la hagaajiyay; `stack`/PII JSON logs ma galaan | `lib/logger.ts:51-60,74-83,101-106` |
| `OPS-3` | Email failure muuqda; production `RESEND_*` required | `lib/email.ts:35-47,73-77,88-99` |
| `SOCK-1` | Socket token wuxuu hayaa `sessionVersion`/`jti`; dib-u-hubin xilliyeed | `socket/token/route.ts:103-117` |
| `AUTH-3`, `JWT-1` | Refresh rotation + reuse detection; `algorithms:["HS256"]`, `iss`, `aud`, `purpose` required | `auth/refresh/route.ts:28-63`, `lib/auth.ts:49-64,125-147` |
| `PW-1`, `AUTH-4` | Hal `validatePassword()`; forgot-password la hirgeliyo **ama** UI laga saaro | `auth-modal.tsx:325` |
| `UPL-1`, `PII-1` | `lessonId ∈ courseId`; public endpoints PII la yareeyo | `uploads/sign/route.ts:49-65`, `leaderboard/route.ts:27-62` |

**Go'aanka DB (la xalliyay 2026-11-28):** migration lagama baahna. Rotation state waa **signed HttpOnly cookie** (`sheegow_rot`) oo haysa `current`/`previous` jti + `userId`/`familyId`, oo lagu xiray HMAC; session epoch waa `User.updatedAt`; revocation waa `Enrollment.status`/`Certificate.revokedAt`. `prisma/migrations/` weli ma jiro. Faahfaahin: `docs/mobile/G2-implementation-record.md`.

**Gate G2 ✅:** threat notes cusub, G0 RoE, staging synthetic ≤60 req/≤2 concurrent, kill switch (5xx / real email / real charge / PII), reviewer ≠ author, Change Approver deploy.

---

### G3 — Haddii mustaqbalka la go'aamiyo store binary (LA DIB DHIGAY)

**Capacitor remote-URL option** — waxay u baahan tahay **package exception**:

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` + plugins (push, preferences, browser, app, screen-orientation, status-bar, biometric, share).
- Native value-add (Apple 4.2 mitigation, ≥4): push + deep link; biometric unlock (Keychain/Keystore); share sheet + safe-area/status-bar; offline fallback screen.
- WebView config: URL = canonical HTTPS keliya; JS bridge madhan; mixed content NEVER_ALLOW; external links → `@capacitor/browser`; AASA + `assetlinks.json` in `public/.well-known/`; camera/mic user gesture.
- Store metadata: privacy label, `/privacy` + `/terms`, synthetic demo account, **0 real payment**.

**React Native / Expo** — go'aan gooni ah; UI cusub + WebRTC/DM/gamification dib loo dhisayo.

**Gate G3:** ma bilaabayo ilaa mulkiilaha uu ogolaansho gaar ah bixiyo.

---

### G4 — Deployment (ogolaansho gaar ah)

- PWA waa isla web app; ma jiro "store deploy". Vercel deploy kasta wuxuu u baahan yahay G1/G2 pass + Change Approver.
- Haddii G3 la go'aamiyo: TestFlight → Play internal → 10% staged → 100%; rollback = version cusub (iOS ma laha rollback dhab ah).
- Signing credentials weligood lama akhriyo, lama kaydiyo repo.

---

### G5 — Post-deploy verification (passive)

| Check | Expected |
|---|---|
| `GET /api/health` | 200, `checks.db=ok` |
| `GET /` | 200, 27/27 `<script>` nonced |
| `script-src` | nonce ✅, strict-dynamic ✅, `unsafe-inline` ❌ |
| `frame-src` | Google Maps ✅ |
| Crash/error rate | 0 unexpected 5xx; 30-min watch + 7-day watch |
| PWA install | Add-to-Home-Screen shaqeynaya iOS/Android |
| Kill switch | 5xx / real charge / real email / PII → stop + report |

---

## 4. Shaxda imtixaanka (qalab jira oo keliya)

| Lakab | Waxa la tijaabiyay | Aalad |
|---|---|---|
| Pure logic | session epoch, checkout/coupon helpers, CSP, health | `bun test` (47 jir + kuwo cusub) |
| Web/mobile | responsive, a11y, RTL, SW cache, deep links | in-app browser tool — **staging keliya** |
| Security | role matrix, refund→access, redaction, DEMO_MODE | staging synthetic, ≤60 req |
| Native (dib) | build, push, biometric, deep link, WebRTC | TestFlight / Play internal |
| Production | health + nonce + error rate | **GET/passive keliya** |

---

## 5. Khataraha iyo go'aannada furan

1. **0 NPM package** = PWA keliya; ma jiro App Store/Play binary. Tani waa go'aanka hadda jira.
2. **Apple 4.2** — haddii Capacitor la go'aamiyo, wrapper "too thin" waa la diidi karaa; native features waa qasab.
3. **Session store / migration** — DB change + backup + approver.
4. **Shared rate limiting** — platform feature vs Redis (dependency cusub); go'aan gaar ah.
5. **Offline buuxa** — haddii loo baahdo, static-export architecture change; haddii kale online + cached shell.
6. **Developer accounts/signing** — mulkiilaha ayaa bixiya; lama akhriyo, lama kaydiyo.

---

## 6. Xaaladda hadda

- Faylkan waa **local, untracked/modified** — ma jiro commit/push/deploy.
- `87dab69` weli waa 1 commit oo `origin/main` ka horreeya (docs-only); riixistiisu waxay keeni doontaa deploy kale.
- Wave 1 + Wave 2: deployed, G5 ✅. Wave 3: ma bilaaban.
- Daraasaddii qoto-dheerayd waxay ahayd akhrin-keliya; wax isbeddel ah lama sameyn ilaa faylkan qorshaha ah.
