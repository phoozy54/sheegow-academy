import { db } from "../src/lib/db";
import { backfillUsernames } from "../src/lib/username";

/**
 * One-off maintenance command (also available to super admins through
 * POST /api/admin/username-migration):
 *
 *   bun run db:usernames
 *
 * Adds usernames to every existing account that lacks one. Privileged role
 * handles are assigned first so the founder gets @superadmin and the first
 * admin gets @admin; everyone else gets a handle from their full name plus a
 * short id suffix.
 */
async function main() {
  const assigned = await backfillUsernames();
  for (const item of assigned) {
    console.log(`  ${item.email.padEnd(36)} -> @${item.username}`);
  }
  console.log(`\nDone. Assigned ${assigned.length} username(s).`);
}

main()
  .catch((error) => {
    console.error("Username backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
