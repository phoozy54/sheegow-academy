import { db } from "@/lib/db";
import { isValidSomaliPhone, normalizeSomaliPhone } from "@/lib/phone";

let normalizationPromise: Promise<number> | null = null;

/**
 * One-time data guard for legacy phone rows.
 *
 * The invariant is that phones are stored as 9 national digits, but older
 * accounts were saved with the display form (e.g. "+252 63 4085151"). Rewrite
 * those rows once per server instance so every lookup can rely on the
 * canonical value. Login also matches display variants, so a failure here is
 * never fatal — it is only data cleanup.
 */
export function ensurePhoneNormalization(): Promise<number> {
  if (!normalizationPromise) {
    normalizationPromise = (async () => {
      const users = await db.user.findMany({
        where: { phone: { not: null } },
        select: { id: true, phone: true },
      });

      let updated = 0;
      for (const user of users) {
        if (!user.phone) continue;
        const normalized = normalizeSomaliPhone(user.phone);
        if (!isValidSomaliPhone(normalized) || normalized === user.phone) continue;
        await db.user.update({
          where: { id: user.id },
          data: { phone: normalized },
        });
        updated += 1;
      }
      return updated;
    })().catch((error) => {
      // Allow a retry on the next request if this attempt failed.
      normalizationPromise = null;
      throw error;
    });
  }
  return normalizationPromise;
}
