#!/usr/bin/env node
/**
 * DEP-1 / F1+F2 — safe initial database bootstrap.
 *
 * - dotenv.config() WITHOUT override: an exported DATABASE_URL wins over .env.
 * - Refuses a non-empty database: `db:push` is for an EMPTY DB only.
 * - Never prints the URL, host, credentials, or raw driver error.
 * - Delegates the actual push to `prisma db push` without any loss-accepting flag.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";

config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Set it in the environment or .env (name only shown).");
  process.exit(1);
}
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
  console.error("DATABASE_URL must be a PostgreSQL connection string. No SQLite/other provider is canonical.");
  process.exit(1);
}

const prisma = new PrismaClient();
let tableCount = -1;
try {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
  `;
  tableCount = Number(rows?.[0]?.count ?? 0);
} catch {
  // Deliberately generic — driver errors can contain hostnames.
  console.error("Could not inspect the target database. Refusing to push. Check DATABASE_URL and connectivity.");
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

if (tableCount !== 0) {
  console.error(
    "Refusing to push: the target database is not empty. " +
      "For real data, take a snapshot and use reviewed migrations (bun run db:deploy).",
  );
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "db", "push"], {
  shell: false,
  stdio: ["ignore", "pipe", "pipe"],
  encoding: "utf8",
  env: process.env,
});
if (result.error || result.status !== 0) {
  // Captured stdout/stderr is deliberately discarded: Prisma errors may contain
  // hostnames or connection-string fragments.
  console.error(
    "Schema push failed. Check DATABASE_URL and connectivity; no driver details are printed here.",
  );
  process.exit(1);
}
console.log("Schema bootstrap complete. Continue with seeding.");
