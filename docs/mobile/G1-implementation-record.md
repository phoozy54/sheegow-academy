# G1 — Mobile-ready web app: implementation record

**Taariikhda:** 2026-11-28
**Xaaladda:** code + automated gates waa dhammaaday; **local keliya** — ma jiro commit, push, deploy, DB change, ama container la taabtay.
**Go'aanka:** PWA-first, **0 NPM package cusub** (package.json lama beddelin).

---

## 1. Waxa la beddelay

| Fayl | Isbeddelka G1 |
|---|---|
| `public/sw.js` | public-only caching; `/api/`, chat, Cloudinary bypass; `no-store`/`private`/`no-cache`/`Set-Cookie` waa la diidayaa; precache wuxuu isticmaalayaa isla guard (ma laha `addAll`); generation token + `waitUntil` → in-flight write ma burin karto logout purge; notification focus/target sax |
| `src/lib/api.ts` | `purgeAppCaches()` + `authChanging()`; `logout()` / `changePassword()` waxay nadiifiyaan cache guul ama guuldarro kadib |
| `src/lib/body-limit.ts` | **cusub** — streaming cap ( ma laha `req.text()` aan xad lahayn): Content-Length waa la hubinayaa, chunks waa la cabbirayaa, stream waa la joojinayaa marka xadka la dhaafo; `MAX_BODY_BYTES` 64 KiB, `CONTENT_BODY_BYTES` 256 KiB |
| `src/lib/consent.ts` | **cusub** — HMAC-signed, HttpOnly consent cookie; fail-closed sida `auth.ts`; `timingSafeEqual` |
| `src/app/api/consent/route.ts` | **cusub** — POST/DELETE consent cookie |
| `src/lib/api-helpers.ts` | re-export body-limit (dhammaan 50 route isla API ayay sii wataan) |
| `src/app/api/contact/route.ts`, `newsletter/route.ts` | `safeBodyChecked` → 413 cad |
| `src/app/api/analytics/route.ts` | cookie saxiixan ayuu xaqiijinayaa (ma jiro client-controlled header); rate limit 30/min; body cap |
| `src/lib/store.ts` | `setCookieConsent`/`initCookieConsent` waxay soo saaraan cookie saxiixan |
| `src/lib/analytics.ts` | ma dirayo event ilaa `cookieConsent === "accepted"`; `credentials: "same-origin"` |
| 5 content routes | `safeBody(..., CONTENT_BODY_BYTES)` — 50,000-xaraf notes/lessons si aamusan looma goynayo |
| `next.config.ts` | HSTS laga saaray; `Vary` laga saaray (proxy ayaa ku daraya) |
| `src/proxy.ts` | HSTS kaliya `production + HTTPS`; `Vary: Origin` waa la **ku daray**, Next RSC Vary lama tirtiro |
| `src/app/layout.tsx` | `viewportFit: cover`; server-ku wuxuu akhrinayaa cookie luqadda → `<html lang/dir>` + strings sax ka hor first paint |
| `src/lib/i18n/index.tsx` | `useSyncExternalStore` oo isla locale u adeegsada server/client snapshot; cookie + localStorage; storage-event sync; `currentLocale` client-keliya |
| `src/app/globals.css` | safe-area, 44px touch targets, `prefers-reduced-motion` |
| `src/components/sheegow/search-bar.tsx` | `<div onClick>` → `<Link onClick>` |
| `tests/mobile-g1.test.ts` | **cusub** — 30 imtixaan: streaming body, UTF-8 bytes, signed consent, analytics route behavior, SW source-level, locale, CSP |

---

## 2. Automated gates — natiijo

| Gate | Natiijo |
|---|---|
| `bun test` | **78 pass / 0 fail** (326 expect); 47 jir + 31 cusub |
| `bunx tsc --noEmit` | **nadiif** (0 khalad) |
| `bun run build` | **guulaystay** — 64 bog, proxy/middleware, standalone la koobiyeeyay |

---

## 3. Dib-u-eegis madax-bannaan (reviewer ≠ author)

Reviewer wuxuu helay **1 High + 6 Medium + 3 Low/Info**. Dhammaan waa la hagaajiyay ama si cad loo diiwaangeliyay:

| Finding | Xaaladda |
|---|---|
| High — body cap uu xusuusta buuxiyo kahor diidmada | **Fixed** — streaming + early abort; imtixaan chunked/forged/UTF-8 ah ayaa caddeynaya |
| Medium — consent header client-controlled | **Fixed** — HMAC HttpOnly cookie + rate limit |
| Medium — precache uu ka gudbo `Cache-Control` | **Fixed** — `addAll` la saaray, isla guard ayaa la isticmaalayaa |
| Medium — in-flight cache write uu purge buriyo | **Fixed** — generation token + `waitUntil` + `event.source` |
| Medium — 50 route si aamusan u beddelay | **Fixed** — `CONTENT_BODY_BYTES` oo content-heavy routes ah |
| Medium — English flash | **Fixed** — cookie SSR; server wuxuu render gareynayaa luqadda saxda ah |
| Medium — source-string tests been-bixin kara | **Fixed** — inta badan waa behavioral (route handlers, ReadableStream, signed cookie) |
| Low — storage-event sync / stale mirror | **Fixed** |
| Low — notification focus branch dhintay | **Fixed** |
| Low — HSTS proxy header la spoofin karo | **Documented residual** — Vercel ayaa `x-forwarded-proto` dejiya; browser-ku HSTS kama qaadanayo HTTP cad |
| Info — `Vary: Origin` clobber | **Fixed** — proxy ayaa ku daraya, ma beddelayo |

**Wareegga 2aad ee dib-u-eegista** (isla reviewer, akhrin-keliya): wuxuu helay **1 Medium oo uu hirgelintu keentay + 3 Low/Info**. Dhammaan waa la xiray:

| Finding | Xaaladda |
|---|---|
| Medium — hydration mismatch users hore (localStorage → cookie la'aan) | **Fixed** — DOM bootstrap ma akhriyo localStorage; SSR iyo client snapshots waa isku mid; migration waxay dhacdaa **hydration kadib** |
| Low — analytics rate limit oo `x-forwarded-for` lagu wareegi karo | **Fixed** — waxaa lagu cabbirayaa cookie-ga saxiixan |
| Low — SW install race + source check daciif | **Fixed** — install wuxuu maraa `putIfCurrent(generation)`; purge wuxuu u baahan yahay `clients.get(event.source.id)` |
| Info — `Secure` oo clear/locale cookie ka maqan | **Fixed** — production `Secure` waa lagu daray labadaba |

Weli la diiwaangeliyay (residual, ma laha High): `safeBody()` waxay oversized bodies u celisaa `null` → 400 halkii 413 laga heli lahaa qaar ka mid ah ~50 route (macmiilku ma aha public endpoint); proxy-ga ayaa ka booda `/api/*` iyo dotted paths, HSTS-na wuxuu aaminayaa `x-forwarded-proto` (Vercel ayaa dejiya; browser-ku HSTS kama qaadanayo HTTP cad).

---

## 4. Passive production baseline (2 GET keliya)

| Check | Natiijo |
|---|---|
| `GET /api/health` | `200` |
| HSTS (production HTTPS) | present ✅ |
| `Access-Control-Allow-Origin` | canonical origin ✅ |
| `GET /` — `<script>` tags | 27 |
| `GET /` — `nonce=` attributes | 30 (≥ scripts) ✅ |

> Production wali waa **deployed `cbb72e8`** (ka hor G1). Isbeddellada G1 lama deployin — `Vary: Origin`, consent cookie, iwm weli ma muuqdaan. Tani waa la filayo.

---

## 5. Weli la gudanayo

1. **Browser device-matrix smoke** — 34 bog × 320/375/414/768 px, RTL `so`/`ar`, VoiceOver/TalkBack. Wuxuu u baahan yahay staging environment si cad loo habeeyay; sir lama akhriyo.
2. **G2 go/no-go** — `AUTH-2`, `PAY-3`, `NET-1`, `PAY-2`, `OPS-2/3`, `SOCK-1`, `AUTH-3`, `JWT-1`, `PW-1`, `UPL-1`, `PII-1` **ma bilaabayo** ogolaansho gaar ah la'aan; qaar waxay u baahan yihiin DB migration + backup.
3. **Commit/push/deploy** — ma la samaynayo ilaa ogolaansho cad la helo.

---

## 6. Xaaladda git

- Faylasha kore waa **modified/untracked local**.
- `87dab69` weli waa 1 commit oo `origin/main` ka horreeya; **lama riixin**.
- Ma jiro commit, push, ama deploy oo la sameeyay.
