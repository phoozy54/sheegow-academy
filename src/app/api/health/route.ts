import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createHealthHandler } from "@/lib/health-handler";

/** Public, read-only liveness + DB check. Never expose connection details. */
export const dynamic = "force-dynamic";

export const GET = createHealthHandler({
  checkDb: async () => {
    await db.$queryRaw`SELECT 1`;
  },
  onError: () => {
    // No error object, message or host is logged from this public endpoint.
    logger.error("[health]", "database check failed");
  },
});
