import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin, isAdminRole } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { logger } from "@/lib/logger";
import { handleAuthError, jsonError, safeBody } from "@/lib/api-helpers";

type RouteContext = { params: Promise<{ id: string }> };

interface DecideBody {
  status?: unknown;
  adminNote?: unknown;
}

const VALID_DECISIONS = new Set([
  "under_review",
  "approved",
  "rejected",
]);
const MAX_NOTE = 2000;

type ApplicantInfo = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  profilePicture: string | null;
  role: string;
};

type ReviewerInfo = { id: string; fullName: string };

function serialize(app: {
  id: string;
  applicantId: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  nativeLanguage: string;
  englishLevel: string;
  teachingExperience: string;
  certifications: string | null;
  bio: string;
  teachingPhilosophy: string | null;
  sampleLesson: string | null;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  preferredCourses: string | null;
  availability: string;
  status: string;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  applicant?: ApplicantInfo | null;
  reviewer?: ReviewerInfo | null;
}) {
  return {
    id: app.id,
    applicantId: app.applicantId,
    fullName: app.fullName,
    email: app.email,
    phone: app.phone,
    city: app.city,
    country: app.country,
    nativeLanguage: app.nativeLanguage,
    englishLevel: app.englishLevel,
    teachingExperience: app.teachingExperience,
    certifications: app.certifications,
    bio: app.bio,
    teachingPhilosophy: app.teachingPhilosophy,
    sampleLesson: app.sampleLesson,
    linkedinUrl: app.linkedinUrl,
    resumeUrl: app.resumeUrl,
    preferredCourses: app.preferredCourses,
    availability: app.availability,
    status: app.status,
    adminNote: app.adminNote,
    reviewedBy: app.reviewedBy,
    reviewedAt: app.reviewedAt?.toISOString() ?? null,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    applicant: app.applicant ?? null,
    reviewer: app.reviewer ?? null,
  };
}

/* ─── GET /api/teacher-applications/:id ───────────────── */

/**
 * Fetch a single teacher application. Students may only fetch their own;
 * admins / super admins may fetch any.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const app = await db.teacherApplication.findUnique({
      where: { id },
      include: isAdminRole(user.role)
        ? {
            applicant: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                profilePicture: true,
                role: true,
              },
            },
            reviewer: { select: { id: true, fullName: true } },
          }
        : {},
    });
    if (!app) return jsonError("Application not found", 404);

    if (!isAdminRole(user.role) && app.applicantId !== user.id) {
      return jsonError("Forbidden", 403);
    }

    const withRelations = app as typeof app & {
      applicant?: ApplicantInfo | null;
      reviewer?: ReviewerInfo | null;
    };

    return NextResponse.json({
      application: serialize({
        id: app.id,
        applicantId: app.applicantId,
        fullName: app.fullName,
        email: app.email,
        phone: app.phone,
        city: app.city,
        country: app.country,
        nativeLanguage: app.nativeLanguage,
        englishLevel: app.englishLevel,
        teachingExperience: app.teachingExperience,
        certifications: app.certifications,
        bio: app.bio,
        teachingPhilosophy: app.teachingPhilosophy,
        sampleLesson: app.sampleLesson,
        linkedinUrl: app.linkedinUrl,
        resumeUrl: app.resumeUrl,
        preferredCourses: app.preferredCourses,
        availability: app.availability,
        status: app.status,
        adminNote: app.adminNote,
        reviewedBy: app.reviewedBy,
        reviewedAt: app.reviewedAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        applicant: withRelations.applicant ?? null,
        reviewer: withRelations.reviewer ?? null,
      }),
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[teacher-applications/get]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/* ─── PATCH /api/teacher-applications/:id ─────────────── */

/**
 * Admin / super admin updates an application's status. Valid transitions:
 *   pending → under_review | approved | rejected
 *   under_review → approved | rejected | under_review (re-note)
 *
 * Approving upgrades the applicant's user.role to "teacher" (so they can
 * immediately create live classes and content) and notifies them. Rejecting
 * notifies them with the admin note as the reason. Marking under_review just
 * records the admin's note without changing the applicant's account.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await safeBody<DecideBody>(req);
    const status = typeof body?.status === "string" ? body.status.trim() : "";
    const adminNote =
      typeof body?.adminNote === "string" ? body.adminNote.trim() : "";

    if (!VALID_DECISIONS.has(status)) {
      return jsonError(
        "status must be 'under_review', 'approved' or 'rejected'",
        400
      );
    }
    if (adminNote.length > MAX_NOTE) {
      return jsonError(`Admin note is too long (max ${MAX_NOTE} characters)`, 400);
    }

    const app = await db.teacherApplication.findUnique({
      where: { id },
      select: {
        id: true,
        applicantId: true,
        fullName: true,
        email: true,
        status: true,
      },
    });
    if (!app) return jsonError("Application not found", 404);

    // Approved/rejected are terminal — block re-decisions to avoid surprises
    // (e.g. re-approving an already-approved application, which would re-run
    // the role upgrade).
    if (app.status === "approved" || app.status === "rejected") {
      return jsonError(
        `This application has already been ${app.status}`,
        409
      );
    }

    const reviewedAt = new Date();

    // Use a transaction so the role upgrade + status update are atomic when
    // approving. The notification is sent outside the transaction (best-effort).
    const updated = await db.$transaction(async (tx) => {
      const row = await tx.teacherApplication.update({
        where: { id: app.id },
        data: {
          status,
          adminNote: adminNote || null,
          reviewedBy: admin.id,
          reviewedAt,
        },
        include: {
          applicant: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              profilePicture: true,
              role: true,
            },
          },
          reviewer: { select: { id: true, fullName: true } },
        },
      });

      // Promote the applicant to "teacher" on approval. We don't downgrade
      // admins/super_admins even if they somehow applied — their existing
      // role is strictly more privileged.
      if (status === "approved" && row.applicant) {
        if (
          row.applicant.role !== "teacher" &&
          row.applicant.role !== "admin" &&
          row.applicant.role !== "super_admin"
        ) {
          await tx.user.update({
            where: { id: row.applicant.id },
            data: { role: "teacher" },
          });
        }
      }

      return row;
    });

    // Notify the applicant. Best-effort: notify() swallows its own errors so a
    // notification failure never aborts the decision.
    if (status === "approved") {
      await notify(
        app.applicantId,
        "system",
        "Teacher application approved",
        `Congratulations ${app.fullName}! Your teacher application has been approved. You can now create live classes and build courses from your dashboard.${
          adminNote ? ` Note: ${adminNote}` : ""
        }`,
        "/dashboard"
      );
    } else if (status === "rejected") {
      await notify(
        app.applicantId,
        "system",
        "Teacher application update",
        `Your teacher application was not approved at this time.${
          adminNote ? ` Reason: ${adminNote}` : ""
        } You are welcome to re-apply in the future.`,
        "/teach"
      );
    } else if (status === "under_review") {
      await notify(
        app.applicantId,
        "system",
        "Application under review",
        `Your teacher application is now under review by our team.${
          adminNote ? ` Note: ${adminNote}` : ""
        }`,
        "/teach"
      );
    }

    logger.info(
      "[teacher-applications/decide]",
      `application ${status}`,
      {
        applicationId: app.id,
        applicantId: app.applicantId,
        adminId: admin.id,
      }
    );

    return NextResponse.json({
      application: serialize({
        id: updated.id,
        applicantId: updated.applicantId,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        city: updated.city,
        country: updated.country,
        nativeLanguage: updated.nativeLanguage,
        englishLevel: updated.englishLevel,
        teachingExperience: updated.teachingExperience,
        certifications: updated.certifications,
        bio: updated.bio,
        teachingPhilosophy: updated.teachingPhilosophy,
        sampleLesson: updated.sampleLesson,
        linkedinUrl: updated.linkedinUrl,
        resumeUrl: updated.resumeUrl,
        preferredCourses: updated.preferredCourses,
        availability: updated.availability,
        status: updated.status,
        adminNote: updated.adminNote,
        reviewedBy: updated.reviewedBy,
        reviewedAt: updated.reviewedAt,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        applicant: updated.applicant,
        reviewer: updated.reviewer,
      }),
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[teacher-applications/decide]", "failed", e);
    return jsonError("Internal server error", 500);
  }
}
