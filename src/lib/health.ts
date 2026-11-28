/**
 * DEP-1 — Pure health payload helper.
 *
 * No Next.js, no Prisma, no env access. The response deliberately exposes no
 * hostnames, versions, connection strings or error details.
 */

export interface HealthPayload {
  status: "ok" | "degraded";
  checks: { db: "ok" | "unavailable" };
  timestamp: string;
}

export function buildHealthPayload(dbOk: boolean, now: Date = new Date()): HealthPayload {
  return {
    status: dbOk ? "ok" : "degraded",
    checks: { db: dbOk ? "ok" : "unavailable" },
    timestamp: now.toISOString(),
  };
}

export const HEALTH_NO_STORE = "no-store";

/**
 * A public probe must not open a DB connection on every request. One check per
 * instance per 10 seconds is enough for monitoring; probe every 30–60s.
 */
export const HEALTH_DB_CHECK_TTL_MS = 10_000;
