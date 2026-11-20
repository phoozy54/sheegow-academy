import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { jsonError, handleAuthError, limitRequest } from "@/lib/api-helpers";
import { clientIp } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ code: string }> };

/**
 * GET /api/certificates/verify/:code
 * Deliberately public and minimal: name, course, serial, issue date, status.
 * No email, phone, payment or enrollment data is ever exposed here.
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const limited = limitRequest(`cert-verify:${clientIp(req)}`, 30, 60_000);
    if (limited) return limited;

    const { code } = await params;
    const certificate = await db.certificate.findUnique({
      where: { verificationCode: code.trim() },
      select: {
        serial: true,
        issuedAt: true,
        revokedAt: true,
        student: { select: { fullName: true } },
        course: {
          select: {
            title: true,
            teacher: { select: { fullName: true } },
          },
        },
      },
    });
    if (!certificate) return jsonError("Certificate not found", 404);

    return NextResponse.json({
      valid: !certificate.revokedAt,
      serial: certificate.serial,
      issuedAt: certificate.issuedAt,
      revokedAt: certificate.revokedAt,
      holderName: certificate.student.fullName,
      courseTitle: certificate.course.title,
      issuerName: certificate.course.teacher?.fullName || "SHEEGOW ACADEMY",
      academy: "SHEEGOW ACADEMY",
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[certificates/verify]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
