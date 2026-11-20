import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { jsonError, safeBody } from "@/lib/api-helpers";

/**
 * TEMPORARY break-glass endpoint used to rotate the bootstrap super admin
 * password from production, where Vercel injects DATABASE_URL at runtime.
 * Removed immediately after the rotation is verified.
 */
const ROTATION_SECRET =
  "eeff0deeaa6c510d7e42a692b2d29211bc0a2c0e5fea2984cf3673428d2f9c46";

const SUPER_ADMIN_EMAIL = "superadmin@sheegow.academy";

interface RotateBody {
  newPassword?: string;
}

export async function POST(req: Request) {
  if (req.headers.get("x-rotation-secret") !== ROTATION_SECRET) {
    return jsonError("Unauthorized", 401);
  }

  const body = await safeBody<RotateBody>(req);
  const newPassword = body?.newPassword || "";
  if (newPassword.length < 12) {
    return jsonError("New password must be at least 12 characters", 400);
  }

  const password = await bcrypt.hash(newPassword, 12);
  const user = await db.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: { password, role: "super_admin", isActive: true },
    create: {
      email: SUPER_ADMIN_EMAIL,
      fullName: "Ciise Mohamed Sheeq (SHEEGOW)",
      phone: "+252 63 4085151",
      password,
      role: "super_admin",
      level: "Advanced",
      isActive: true,
      bio: "Founder & general manager. English language expert educated at a university in London, with multiple language certifications and 15 years of teaching experience.",
    },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({ success: true, email: user.email, role: user.role });
}
