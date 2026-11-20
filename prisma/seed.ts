import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

/**
 * Minimal bootstrap seed — deliberately NO demo users, courses or classes.
 *
 * There are no shared demo passwords. The only account created here is the
 * initial super admin, whose password comes from SUPER_ADMIN_PASSWORD. The
 * super admin then creates teachers through the admin panel, and teachers
 * create their own courses and live classes. Students register themselves.
 */
async function main() {
  console.log("🌱 Seeding SHEEGOW ACADEMY database...");

  const password = process.env.SUPER_ADMIN_PASSWORD?.trim() || "";
  if (!password && process.env.NODE_ENV === "production") {
    throw new Error(
      "SUPER_ADMIN_PASSWORD must be set when seeding in production"
    );
  }
  const finalPassword = password || "Sheegow@Super2026!";
  if (finalPassword.length < 12) {
    throw new Error("SUPER_ADMIN_PASSWORD must be at least 12 characters long");
  }

  await db.user.upsert({
    where: { email: "superadmin@sheegow.academy" },
    update: {
      role: "super_admin",
      isActive: true,
      fullName: "Ciise Mohamed Sheeq (SHEEGOW)",
      password: await bcrypt.hash(finalPassword, 12),
    },
    create: {
      fullName: "Ciise Mohamed Sheeq (SHEEGOW)",
      email: "superadmin@sheegow.academy",
      phone: "634085151",
      password: await bcrypt.hash(finalPassword, 12),
      role: "super_admin",
      level: "Advanced",
      bio: "Founder & general manager. English language expert educated at a university in London, with multiple language certifications and 15 years of teaching experience.",
    },
  });

  // Starter coupons only — no demo accounts or content.
  await db.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: { code: "WELCOME10", discount: 10, active: true },
  });
  await db.coupon.upsert({
    where: { code: "SHEEGOW20" },
    update: {},
    create: { code: "SHEEGOW20", discount: 20, active: true },
  });

  console.log("✅ Seed complete!");
  console.log(
    password
      ? "   Super admin password: from SUPER_ADMIN_PASSWORD."
      : "   Local dev fallback used — set SUPER_ADMIN_PASSWORD before production."
  );
  console.log(
    "   No demo accounts were created. Sign in as superadmin@sheegow.academy and add teachers."
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
