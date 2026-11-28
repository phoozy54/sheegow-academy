import { describe, expect, it } from "bun:test";
import { buildContentSecurityPolicy } from "../src/lib/csp";

const nonce = "0123456789abcdef0123456789abcdef";

function directive(csp: string, name: string): string {
  return (
    csp
      .split("; ")
      .find((entry) => entry.startsWith(`${name} `)) ?? ""
  );
}

describe("CSP-1 — strict CSP builder", () => {
  it("script-src uses the nonce, strict-dynamic and NO unsafe-inline", () => {
    const csp = buildContentSecurityPolicy({
      nonce,
      connectSources: [],
      isDevelopment: false,
    });

    const scriptSrc = directive(csp, "script-src");
    expect(scriptSrc).toContain(`'nonce-${nonce}'`);
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    // style-src keeps 'unsafe-inline' deliberately; script-src must not.
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it("dev unsafe-eval stays INSIDE script-src, never a standalone directive", () => {
    const csp = buildContentSecurityPolicy({
      nonce,
      connectSources: [],
      isDevelopment: true,
    });

    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(csp.split("; ")).not.toContain("'unsafe-eval'");
  });

  it("frame-src allows the Google Maps embed on the contact page", () => {
    const csp = buildContentSecurityPolicy({
      nonce,
      connectSources: [],
      isDevelopment: false,
    });
    const frameSrc = directive(csp, "frame-src");
    expect(frameSrc).toContain("https://www.google.com");
    expect(frameSrc).toContain("https://www.google.com/maps");
  });

  it("connect-src dedupes self and includes chat/cloudinary origins once", () => {
    const csp = buildContentSecurityPolicy({
      nonce,
      connectSources: [
        "'self'",
        "https://chat.example.com",
        "wss://chat.example.com",
        "https://api.cloudinary.com",
      ],
      isDevelopment: false,
    });
    const connectSrc = directive(csp, "connect-src");
    expect(connectSrc.match(/'self'/g)).toHaveLength(1);
    expect(connectSrc).toContain("https://chat.example.com");
    expect(connectSrc).toContain("wss://chat.example.com");
    expect(connectSrc).toContain("https://api.cloudinary.com");
  });
});

describe("CSP-1 — every inline script must carry the nonce", () => {
  const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text();

  it("layout.tsx: every literal script tag carries the nonce", async () => {
    const source = await read("../src/app/layout.tsx");
    const scripts = source.match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    for (const tag of scripts) {
      expect(tag).toContain("nonce={nonce}");
    }
  });

  it("seo-shell.tsx: JSON-LD script has the nonce", async () => {
    const source = await read("../src/components/sheegow/seo/seo-shell.tsx");
    const scripts = (source.match(/<script\b/g) ?? []).length;
    const nonces = (source.match(/nonce=/g) ?? []).length;
    expect(scripts).toBeGreaterThan(0);
    expect(nonces).toBe(scripts);
  });

  it("layout.tsx: next-themes inline theme script receives the nonce", async () => {
    const source = await read("../src/app/layout.tsx");
    expect(source).toMatch(/<ThemeProvider[\s\S]*?nonce=\{nonce\}/);
  });

  it("proxy.ts forwards the nonce on REQUEST headers, not just the response", async () => {
    const source = await read("../src/proxy.ts");
    expect(source).toContain('requestHeaders.set("x-nonce", nonce)');
    expect(source).toContain("request: { headers: requestHeaders }");
    expect(source).toContain('response.headers.set("Content-Security-Policy", csp)');
    // 16 random bytes, not a UUID with fixed version/variant bits.
    expect(source).toContain("crypto.getRandomValues(new Uint8Array(16))");
  });
});
