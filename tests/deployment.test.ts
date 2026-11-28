import { describe, expect, it } from "bun:test";
import { buildHealthPayload, HEALTH_NO_STORE } from "../src/lib/health";
import { createHealthHandler } from "../src/lib/health-handler";

const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text();
const FIXED_NOW = new Date("2026-11-28T10:00:00.000Z");

describe("DEP-1 — canonical Vercel + Neon + Render(chat) architecture", () => {
  it("canonical_architecture_documented", async () => {
    const deployment = await read("../DEPLOYMENT.md");
    const readme = await read("../README.md");

    expect(deployment).toContain("Vercel");
    expect(deployment).toContain("Neon");
    expect(deployment).toContain("Render");
    expect(deployment).toContain("/api/health");
    expect(deployment).toContain("ARCHIVED — NON-CANONICAL");

    expect(readme).toContain("Canonical architecture (DEP-1)");
    expect(readme).toContain("Neon Postgres");
    expect(readme).not.toContain("SQLite locally");
    expect(readme).not.toContain("Render/Railway on port 3003");
    expect(readme).toContain("PORT=10000");
  });

  it("no_accept_data_loss_and_no_env_override", async () => {
    const pkg = JSON.parse(await read("../package.json"));
    const dbScripts = Object.entries(pkg.scripts).filter(([name]) =>
      name.startsWith("db:"),
    );

    expect(dbScripts.length).toBeGreaterThan(0);
    for (const [, command] of dbScripts) {
      expect(command).not.toContain("override:true");
      expect(command).not.toContain("--accept-data-loss");
    }
    expect(pkg.scripts["db:push"]).toContain("scripts/db-bootstrap.mjs");
    expect(pkg.scripts["db:deploy"]).toContain("prisma migrate deploy");
    expect(pkg.scripts["db:migrate"]).toContain("prisma migrate dev");

    const bootstrap = await read("../scripts/db-bootstrap.mjs");
    expect(bootstrap).toContain("config();");
    expect(bootstrap).not.toContain("config({");
    expect(bootstrap).not.toContain("override:true");
    expect(bootstrap).toContain("pg_catalog.pg_tables");
    expect(bootstrap).toContain('spawnSync(process.execPath, [prismaCli, "db", "push"]');
    expect(bootstrap).toContain('"prisma",\n  "build",\n  "index.js"');
    expect(bootstrap).toContain("shell: false");
    expect(bootstrap).toContain('stdio: ["ignore", "pipe", "pipe"]');
    expect(bootstrap).not.toContain('spawnSync("npx"');
    expect(bootstrap).not.toContain('stdio: "inherit"');
    expect(bootstrap).not.toContain("result.stdout");
    expect(bootstrap).not.toContain("result.stderr");
    expect(bootstrap).not.toContain("--accept-data-loss");
    expect(bootstrap).toContain("Refusing to push");
    expect(bootstrap).toContain("no driver details are printed here");
  });

  it("render_yaml_chat_only", async () => {
    const render = await read("../render.yaml");
    expect((render.match(/^\s*- type:/gm) ?? []).length).toBe(1);
    expect(render).toContain("name: sheegow-chat");
    expect(render).toContain("rootDir: mini-services/chat-service");
    expect(render).not.toContain("provider: sqlite");
  });

  it("schema_provider_postgresql", async () => {
    const schema = await read("../prisma/schema.prisma");
    expect(schema).toContain('provider = "postgresql"');
    expect(schema).not.toContain('provider = "sqlite"');
  });

  it("archived_self_host_marked", async () => {
    const files = [
      "../Caddyfile",
      "../.zscripts/ARCHIVED.md",
      "../.zscripts/build.sh",
      "../.zscripts/database-runtime-build.sh",
      "../.zscripts/dev.sh",
      "../.zscripts/start.sh",
      "../tests/database-runtime-build.sh",
      "../.env.example",
      "../src/lib/socket.ts",
    ];
    for (const file of files) {
      expect(await read(file)).toContain("ARCHIVED — NON-CANONICAL");
    }
    const archived = await read("../.zscripts/ARCHIVED.md");
    expect(archived).toContain("Neon Postgres");
    expect(archived).toContain("sheegow-chat");
    expect(archived).toContain("MUST NOT");
  });
});

describe("DEP-1 — public /api/health is read-only, leak-free and throttled", () => {
  it("health_payload_shape", () => {
    expect(buildHealthPayload(true, FIXED_NOW)).toEqual({
      status: "ok",
      checks: { db: "ok" },
      timestamp: "2026-11-28T10:00:00.000Z",
    });
    expect(buildHealthPayload(false, FIXED_NOW)).toEqual({
      status: "degraded",
      checks: { db: "unavailable" },
      timestamp: "2026-11-28T10:00:00.000Z",
    });
    expect(HEALTH_NO_STORE).toBe("no-store");
  });

  it("health_route_no_leak", async () => {
    const route = await read("../src/app/api/health/route.ts");
    expect(route).toContain('export const dynamic = "force-dynamic"');
    expect(route).toContain("createHealthHandler");
    expect(route).toContain('db.$queryRaw`SELECT 1`');
    expect(route).not.toContain("DATABASE_URL");
    expect(route).not.toContain("e.message");
    expect(route).not.toContain("JSON.stringify(");

    const payload = JSON.stringify(buildHealthPayload(false));
    for (const needle of [
      "DATABASE_URL",
      "neon.tech",
      "password",
      "stack",
      "PrismaClient",
    ]) {
      expect(payload).not.toContain(needle);
    }
  });

  it("health_probe_is_throttled_and_no_store", async () => {
    let clock = FIXED_NOW.getTime();
    let calls = 0;
    const handler = createHealthHandler({
      checkDb: async () => {
        calls += 1;
      },
      now: () => new Date(clock),
      ttlMs: 1_000,
    });

    const ok = await handler();
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(await ok.json()).toEqual(buildHealthPayload(true, FIXED_NOW));

    clock += 500;
    const cached = await handler();
    expect(cached.status).toBe(200);
    expect(cached.headers.get("cache-control")).toBe("no-store");
    expect(calls).toBe(1);

    clock += 600;
    await handler();
    expect(calls).toBe(2);
  });

  it("health_failure_returns_503_without_exposing_the_error", async () => {
    const seen: unknown[] = [];
    const handler = createHealthHandler({
      checkDb: async () => {
        throw new Error("secret-host:5432/password");
      },
      onError: (error) => seen.push(error),
      now: () => FIXED_NOW,
    });

    const res = await handler();
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const text = await res.text();
    expect(text).toContain('"status":"degraded"');
    expect(text).toContain('"db":"unavailable"');
    expect(text).not.toContain("secret-host");
    expect(text).not.toContain("password");
    expect(seen).toHaveLength(1);
  });
});
