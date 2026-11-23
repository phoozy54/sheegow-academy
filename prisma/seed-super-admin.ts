import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

/**
 * Creates or restores ONLY the super-admin account. Safe to run against an
 * existing database: it does not seed courses, reviews or live classes.
 *
 *   bun run db:superadmin
 *
 * SUPER_ADMIN_PASSWORD is required in every environment — there is no
 * hardcoded fallback password. Running this script also rotates the password
 * of an existing super admin, so a leaked default can be fixed with one command.
 */
async function main() {
  const email = "superadmin@sheegow.academy";
  const password = process.env.SUPER_ADMIN_PASSWORD?.trim() || "";
  if (!password) {
    throw new Error("SUPER_ADMIN_PASSWORD must be set before seeding");
  }
  const finalPassword = password;
  if (finalPassword.length < 12) {
    throw new Error("SUPER_ADMIN_PASSWORD must be at least 12 characters long");
  }

  const user = await db.user.upsert({
    where: { email },
    update: {
      role: "super_admin",
      isActive: true,
      fullName: "Ciise Mohamed Sheeq (SHEEGOW)",
      password: await bcrypt.hash(finalPassword, 12),
    },
    create: {
      fullName: "Ciise Mohamed Sheeq (SHEEGOW)",
      email,
      phone: "634085151",
      password: await bcrypt.hash(finalPassword, 12),
      role: "super_admin",
      level: "Advanced",
      bio: "Founder & general manager. English language expert with a university degree, multiple language certifications and 15 years of teaching experience.",
    },
    select: { id: true, email: true, role: true },
  });

  console.log("Super admin ready:", user.email, `(${user.role})`);
  console.log(
    password
      ? "Password: from SUPER_ADMIN_PASSWORD environment variable."
      : "Password: local demo default — set SUPER_ADMIN_PASSWORD before production."
  );
}

main()
  .catch((error) => {
    console.error("Failed to create super admin:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
