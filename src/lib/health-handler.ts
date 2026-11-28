/**
 * DEP-1 — Testable, throttled health handler factory.
 *
 * No Next.js import: returns a standard Web `Response`, which Next.js route
 * handlers accept and Bun can invoke directly in tests.
 *
 * The DB check is cached for a short TTL per serverless instance so a public
 * probe (or a scanner) cannot open a Neon connection on every request.
 */
import {
  buildHealthPayload,
  HEALTH_DB_CHECK_TTL_MS,
  HEALTH_NO_STORE,
} from "./health";

export interface HealthHandlerOptions {
  /** Resolves if the DB check passed; throws if it failed. */
  checkDb: () => Promise<unknown>;
  /** Called only when the check throws. Must not log secrets or raw errors. */
  onError?: (error: unknown) => void;
  now?: () => Date;
  ttlMs?: number;
}

interface HealthCheckCache {
  checkedAt: number;
  dbOk: boolean;
}

export function createHealthHandler(options: HealthHandlerOptions) {
  let cache: HealthCheckCache | null = null;
  const ttl = options.ttlMs ?? HEALTH_DB_CHECK_TTL_MS;

  return async function GET(): Promise<Response> {
    const now = options.now?.() ?? new Date();
    const isFresh =
      cache !== null && now.getTime() - cache.checkedAt < ttl;

    if (!isFresh) {
      let dbOk = false;
      try {
        await options.checkDb();
        dbOk = true;
      } catch (error) {
        options.onError?.(error);
      }
      cache = { checkedAt: now.getTime(), dbOk };
    }

    const current = cache as HealthCheckCache;
    const payload = buildHealthPayload(current.dbOk, new Date(current.checkedAt));
    return Response.json(payload, {
      status: current.dbOk ? 200 : 503,
      headers: { "Cache-Control": HEALTH_NO_STORE },
    });
  };
}
