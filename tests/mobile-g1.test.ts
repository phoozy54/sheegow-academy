import { beforeAll, describe, expect, it } from "bun:test";
import {
  CONTENT_BODY_BYTES,
  MAX_BODY_BYTES,
  readBodyWithLimit,
  safeBodyChecked,
} from "../src/lib/body-limit";
import {
  CONSENT_COOKIE,
  consentCookie,
  readConsentFromCookieHeader,
  signConsent,
  verifyConsent,
} from "../src/lib/consent";
import { POST as analyticsPost } from "../src/app/api/analytics/route";
import { POST as consentPost } from "../src/app/api/consent/route";

const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text();
const URL_TEST = "https://www.sheegowacademy.com/api/test";

function post(body: string, headers?: Record<string, string>): Request {
  return new Request(URL_TEST, { method: "POST", headers, body });
}

/** Chunked body (no Content-Length) — the case the old req.text() could not bound. */
function streamedPost(
  body: string,
  declaredLength?: number,
  onRead?: () => void
): Request {
  const bytes = new TextEncoder().encode(body);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const chunk = Math.max(1, Math.ceil(bytes.length / 4));
      for (let i = 0; i < bytes.length; i += chunk) {
        controller.enqueue(bytes.slice(i, i + chunk));
      }
      controller.close();
    },
    pull() {
      onRead?.();
    },
  });
  const headers =
    declaredLength === undefined
      ? undefined
      : { "content-length": String(declaredLength) };
  return new Request(URL_TEST, {
    method: "POST",
    headers,
    body: stream,
    duplex: "half",
  } as RequestInit);
}

describe("G1 — streaming body size limit (64 KiB)", () => {
  it("accepts a small JSON body", async () => {
    const result = await safeBodyChecked<{ name: string }>(
      post(JSON.stringify({ name: "synthetic" }))
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe("synthetic");
  });

  it("accepts a body exactly at the cap", async () => {
    const exact = "x".repeat(MAX_BODY_BYTES);
    const limited = await readBodyWithLimit(post(exact));
    expect(limited.tooLarge).toBe(false);
    expect(limited.text?.length).toBe(MAX_BODY_BYTES);
  });

  it("rejects an oversized Content-Length before reading anything", async () => {
    let reads = 0;
    const req = streamedPost("x", MAX_BODY_BYTES + 999, () => reads++);
    const limited = await readBodyWithLimit(req);
    expect(limited.tooLarge).toBe(true);
    expect(limited.text).toBeNull();
    expect(reads).toBe(0); // stream was cancelled, never pulled
  });

  it("rejects a chunked 1 MiB body with no Content-Length", async () => {
    const limited = await readBodyWithLimit(streamedPost("x".repeat(1024 * 1024)));
    expect(limited.tooLarge).toBe(true);
    expect(limited.text).toBeNull();
  });

  it("rejects a forged short Content-Length with a large body", async () => {
    const limited = await readBodyWithLimit(streamedPost("x".repeat(MAX_BODY_BYTES + 10), 2));
    expect(limited.tooLarge).toBe(true);
    expect(limited.text).toBeNull();
  });

  it("counts UTF-8 bytes, not characters", async () => {
    // 3-byte characters: under the cap in chars, over it in bytes.
    const over = "你".repeat(Math.floor(MAX_BODY_BYTES / 3) + 10);
    expect((await readBodyWithLimit(post(over))).tooLarge).toBe(true);

    const under = "你".repeat(100);
    const limited = await readBodyWithLimit(post(under));
    expect(limited.tooLarge).toBe(false);
    expect(limited.text).toBe(under); // decoded, not mangled
  });

  it("returns 400 (not 413) for an empty body", async () => {
    expect(await safeBodyChecked(post(""))).toEqual({ ok: false, status: 400 });
  });

  it("raises the cap for authenticated content-heavy routes", async () => {
    const body = JSON.stringify({ content: "س".repeat(50_000) }); // ~150 KiB
    expect((await safeBodyChecked(post(body))).status).toBe(413);
    const result = await safeBodyChecked(post(body), CONTENT_BODY_BYTES);
    expect(result.ok).toBe(true);
  });
});

describe("G1 — signed consent cookie (CONSENT-1)", () => {
  it("signs, verifies and rejects tampered / expired tokens", () => {
    const token = signConsent("accepted", 1_000_000);
    expect(verifyConsent(token, 1_000_001)).toBe("accepted");
    expect(verifyConsent(token.slice(0, -1) + "x", 1_000_001)).toBeNull();
    expect(
      verifyConsent(token, 1_000_000 + 365 * 24 * 60 * 60 * 1000 + 1)
    ).toBeNull();
    expect(verifyConsent("accepted.1.forged")).toBeNull();
    expect(verifyConsent(null)).toBeNull();
  });

  it("issues an HttpOnly cookie from the consent endpoint", async () => {
    const res = await consentPost(
      post(JSON.stringify({ consent: "accepted" }))
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${CONSENT_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    const token = setCookie.split(";")[0].split("=")[1];
    expect(verifyConsent(token)).toBe("accepted");
  });

  it("rejects an invalid consent value", async () => {
    const res = await consentPost(post(JSON.stringify({ consent: "maybe" })));
    expect(res.status).toBe(400);
  });

  it("cookie header parsing tolerates other cookies", () => {
    const header = `other=1; ${consentCookie("accepted").split(";")[0]}; last=2`;
    expect(readConsentFromCookieHeader(header)).toBe("accepted");
  });

  it("analytics drops events with no consent cookie", async () => {
    const res = await analyticsPost(post(JSON.stringify({ event: "not_on_allow_list" })));
    expect(res.status).toBe(204); // silently dropped before validation
  });

  it("analytics drops events with a forged consent cookie", async () => {
    const req = post(JSON.stringify({ event: "not_on_allow_list" }), {
      cookie: `${CONSENT_COOKIE}=accepted.1.forged`,
    });
    expect((await analyticsPost(req)).status).toBe(204);
  });

  it("analytics accepts a signed cookie and then validates the event", async () => {
    const req = post(JSON.stringify({ event: "not_on_allow_list" }), {
      cookie: consentCookie("accepted").split(";")[0],
    });
    expect((await analyticsPost(req)).status).toBe(400);
  });

  it("keys the rate limit on the signed token, not a spoofable IP header", async () => {
    const source = await read("../src/app/api/analytics/route.ts");
    expect(source).not.toContain("clientIp");
    expect(source).toContain("CONSENT_COOKIE.length + 1");
  });

  it("rate-limits even consented clients", async () => {
    const cookie = consentCookie("accepted").split(";")[0];
    let last = 204;
    for (let i = 0; i < 31; i++) {
      const res = await analyticsPost(
        post(JSON.stringify({ event: "not_on_allow_list" }), { cookie })
      );
      last = res.status;
    }
    expect(last).toBe(429);
  });
});

describe("G1 — service worker never caches private content", () => {
  let sw = "";
  beforeAll(async () => {
    sw = await read("../public/sw.js");
  });

  it("only caches an explicit public allow-list", () => {
    expect(sw).toContain("PUBLIC_PAGES");
    expect(sw).toContain("isPublicPage(url.pathname)");
  });

  it("bypasses /api/, chat and Cloudinary entirely", () => {
    expect(sw).toContain('url.pathname.startsWith("/api/")');
    expect(sw).toContain("sheegow-chat");
    expect(sw).toContain("cloudinary");
  });

  it("refuses no-store, private, no-cache and Set-Cookie responses", () => {
    expect(sw).toContain("no-store|private|no-cache");
    expect(sw).toContain('response.headers.has("set-cookie")');
  });

  it("precache uses the same guard, not unconditional addAll", () => {
    expect(sw).not.toContain("cache.addAll");
    expect(sw).toContain("await putIfCurrent(asset, response.clone(), generation)");
  });

  it("in-flight writes cannot undo a logout purge", () => {
    expect(sw).toContain("cacheGeneration");
    expect(sw).toContain("putIfCurrent");
    expect(sw).toContain("event.waitUntil(putIfCurrent");
    expect(sw).toContain('event.source.type !== "window"');
    expect(sw).toContain("clients.get(event.source.id)");
  });

  it("confines notification targets to our own origin", () => {
    expect(sw).toContain("url.origin !== self.location.origin");
    expect(sw).toContain("clientUrl.origin === self.location.origin");
  });

  it("client triggers purge after logout and change-password", async () => {
    const source = await read("../src/lib/api.ts");
    expect(source).toContain("purgeAppCaches");
    expect(source).toContain('type: "CACHE_PURGE"');
    expect(source).toContain("authChanging");
  });
});

describe("G1 — HSTS only on production HTTPS", () => {
  it("next.config.ts does not send HSTS unconditionally", async () => {
    expect(await read("../next.config.ts")).not.toContain(
      "Strict-Transport-Security"
    );
  });

  it("proxy.ts gates HSTS on production + HTTPS", async () => {
    const source = await read("../src/proxy.ts");
    expect(source).toContain("Strict-Transport-Security");
    expect(source).toContain('process.env.NODE_ENV === "production"');
    expect(source).toContain("isHttps");
  });
});

describe("G1 — PWA manifest + pre-paint locale", () => {
  it("manifest is installable with required icons", async () => {
    const manifest = JSON.parse(await read("../public/manifest.json"));
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.some((i: { sizes: string }) => i.sizes === "192x192")).toBe(true);
    expect(manifest.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true);
  });

  it("server renders the cookie locale so there is no English flash", async () => {
    const source = await read("../src/app/layout.tsx");
    expect(source).toContain("await cookies()");
    expect(source).toContain("initialLocale");
    expect(source).toContain("lang={initialLocale}");
    expect(source).toContain("dir={LOCALE_META[initialLocale].dir}");
    expect(source).toContain("sheegow_locale");
    // The DOM bootstrap must not override SSR with localStorage — that was
    // the hydration-mismatch regression found in review.
    const bootstrap = source.slice(
      source.indexOf("keep lang/dir/data-locale"),
      source.indexOf("PWA / iOS")
    );
    expect(bootstrap).not.toContain("localStorage");
  });

  it("provider uses the same locale for both snapshots", async () => {
    const source = await read("../src/lib/i18n/index.tsx");
    expect(source).toContain("initialLocale");
    expect(source).toContain("() => initialLocale");
    expect(source).toContain("document.cookie");
    expect(source).toContain("event.key === STORAGE_KEY");
    expect(source).toContain("readStoredLocale()"); // post-hydration migration
    expect(source).toContain('SameSite=Lax${secure}'); // Secure in production
  });

  it("viewport enables safe-area insets", async () => {
    const source = await read("../src/app/layout.tsx");
    expect(source).toContain('viewportFit: "cover"');
  });
});

describe("G1 — search results are keyboard reachable", () => {
  it("no non-interactive div handles click in the results list", async () => {
    const source = await read("../src/components/sheegow/search-bar.tsx");
    expect(source).not.toMatch(/<div\b[^>]*onClick=/);
    expect(source).toContain("onNavigate={onPick}");
  });
});
