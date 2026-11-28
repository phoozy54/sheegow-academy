# G0 Threat Note — CSP-1: nonce / hydration / iframe

**Nooca:** 1.1 · **Taariikhda:** 2026-11-28 · **Gate:** G0 → G1 → G2 dhammeeyay (pending independent review)

```
Feature / endpoint:
  Every HTML page: src/proxy.ts → src/app/layout.tsx → SeoShell / contact map

Asset affected:
  Page availability + React hydration + SW registration + SEO structured data
  (the security control itself can break the site if applied incorrectly)

Trust boundary crossed:
  Edge/proxy → Next.js render → browser CSP enforcement

Worst-case breakage:
  x-nonce is set on the RESPONSE, not on the forwarded REQUEST, so
  headers().get("x-nonce") in layout is null. The inline SW-registration
  script and SeoShell JSON-LD scripts are unnonced; with strict-dynamic
  they are blocked. The Maps iframe is blocked because frame-src is absent.

Primary control + test:
  Put the nonce on the request headers passed to NextResponse.next();
  nonce ALL inline script elements (layout + SeoShell + SW register);
  add frame-src for the Google Maps embed host; move dev-only unsafe-eval
  INSIDE script-src (currently a malformed standalone directive).
  Tests assert: nonce reaches request+response, no unnonced inline script,
  iframe host present, no unsafe-inline in script-src.

Rollback / kill switch:
  No schema, no migration, no env var, no infra change. If UI regresses,
  flip the header to Content-Security-Policy-Report-Only while fixing, then
  re-enforce. No production data touched.
```

## Waxa la xaqiijiyay (akhrin-kaliya)

| Fayl | Xaqiijin |
|---|---|
| `src/proxy.ts:76-84` | `NextResponse.next({request:{headers:new Headers(request.headers)}})` — nonce-ka laguma daro request headers; waxaa lagu daraa response headers kaliya. |
| `src/app/layout.tsx:112` | `headers().get("x-nonce")` → `null`, marka JSON-LD `nonce={undefined}`. |
| `src/app/layout.tsx:133-137` | SW registration inline script: **nonce ma laha**. |
| `src/components/sheegow/seo/seo-shell.tsx:17-22` | JSON-LD inline script: **nonce ma laha**. |
| `src/proxy.ts:67` | `script-src 'self' 'nonce-…' 'strict-dynamic'` → inline script aan nonne lahayn waa la xannibay. |
| `src/proxy.ts:70-72` | `'unsafe-eval'` waa directive gooni ah (malformed); waa inuu ku jiraa `script-src` dev-kaliya. |
| `src/components/sheegow/views/contact-view.tsx:334-341` | iframe `https://www.google.com/maps` — `frame-src` ma jiro, `default-src 'self'` ayaa xannibaya. |
| `src/components/ui/chart.tsx:82` | `<style dangerouslySetInnerHTML>` — `style-src 'unsafe-inline'` wuu u oggol yahay; ma aha script, lama taabanayo CSP-1. |

**G1 ee la sameeyay:**
- `src/lib/csp.ts` — builder saafi ah: nonce + strict-dynamic, `frame-src` Google Maps, `'unsafe-eval'` gudaha `script-src` (dev keliya), `style-src 'unsafe-inline'` waa ula kac.
- `src/proxy.ts` — nonce waa la dhigay **request headers** (`new Headers` + `requestHeaders.set`), ma aha response kaliya; `Buffer` waa la saaray (Edge-safe).
- `src/app/layout.tsx` — SW registration script wuxuu helay `nonce={nonce}`; `ThemeProvider` (next-themes) sidoo kale wuxuu helay `nonce={nonce}` si uu inline theme script-ku u noqdo mid CSP-valid ah.
- `src/components/sheegow/seo/seo-shell.tsx` — server component async ah; JSON-LD script wuxuu helay `nonce={nonce}`.
- `tests/csp.test.ts` — 8 tests: builder + "script tag kasta nonce ayuu leeyahay" + ThemeProvider nonce + proxy request-header propagation.

**Post-deploy check:** `/` HTML-da 27 `<script>` ayay lahayd; markii `ThemeProvider` nonce helay, dhammaantood waa nonced. `Content-Security-Policy`: `script-src` nonce + strict-dynamic, `unsafe-inline` ma jiro, `frame-src` Maps wuu jiraa. `/api/health` → `200 {"status":"ok","checks":{"db":"ok"}}`.

**Xusuusin:** Ma jiro schema/env/migration/package change; deploy waa la ogolaaday oo la sameeyay (commit `5608526` + nonce follow-up).
