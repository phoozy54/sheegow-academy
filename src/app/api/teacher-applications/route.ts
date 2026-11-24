import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, isAdminRole, isTeachingRole } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  handleAuthError,
  jsonError,
  limitRequest,
  safeBody,
} from "@/lib/api-helpers";

/* ─── Validation constants ─────────────────────────────── */

const ENGLISH_LEVELS = new Set([
  "Beginner",
  "Intermediate",
  "Advanced",
  "Native",
]);
const EXPERIENCE_BUCKETS = new Set(["0", "1-3", "3-5", "5-10", "10+"]);
const MAX_BIO = 2000;
const MAX_TEXT = 2000;
const MAX_URL = 500;
const URL_RE = /^https?:\/\/[^\s]+$/i;

interface CreateBody {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  city?: unknown;
  country?: unknown;
  nativeLanguage?: unknown;
  englishLevel?: unknown;
  teachingExperience?: unknown;
  certifications?: unknown;
  bio?: unknown;
  teachingPhilosophy?: unknown;
  sampleLesson?: unknown;
  linkedinUrl?: unknown;
  resumeUrl?: unknown;
  preferredCourses?: unknown;
  availability?: unknown;
  consent?: unknown;
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Trim + clamp a long string to a max length, returning null when empty. */
function optStr(value: unknown, max = MAX_TEXT): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

function optUrl(value: unknown): string | null {
  const v = optStr(value, MAX_URL);
  if (!v) return null;
  // Reject obviously-invalid URLs. We never store or fetch the resource; we
  // only need a syntactically valid link the admin can review later.
  if (!URL_RE.test(v)) return null;
  return v;
}

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

/* ─── GET /api/teacher-applications ────────────────────── */

/**
 * List teacher applications.
 * - Students see only their own applications.
 * - Admins / super admins see every application, with the applicant's profile
 *   included so the admin console can render the full review queue.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const isAdmin = isAdminRole(user.role);

    const apps = await db.teacherApplication.findMany({
      where: isAdmin ? {} : { applicantId: user.id },
      include: isAdmin
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
            reviewer: {
              select: { id: true, fullName: true },
            },
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      applications: apps.map((a) => {
        // The Prisma `include` shape varies by role; pull out the optional
        // nested fields defensively so the serialize helper stays simple.
        const withRelations = a as typeof a & {
          applicant?: ApplicantInfo | null;
          reviewer?: ReviewerInfo | null;
        };
        return serialize({
          id: a.id,
          applicantId: a.applicantId,
          fullName: a.fullName,
          email: a.email,
          phone: a.phone,
          city: a.city,
          country: a.country,
          nativeLanguage: a.nativeLanguage,
          englishLevel: a.englishLevel,
          teachingExperience: a.teachingExperience,
          certifications: a.certifications,
          bio: a.bio,
          teachingPhilosophy: a.teachingPhilosophy,
          sampleLesson: a.sampleLesson,
          linkedinUrl: a.linkedinUrl,
          resumeUrl: a.resumeUrl,
          preferredCourses: a.preferredCourses,
          availability: a.availability,
          status: a.status,
          adminNote: a.adminNote,
          reviewedBy: a.reviewedBy,
          reviewedAt: a.reviewedAt,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          applicant: withRelations.applicant ?? null,
          reviewer: withRelations.reviewer ?? null,
        });
      }),
    });
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[teacher-applications/list]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}

/* ─── POST /api/teacher-applications ───────────────────── */

/**
 * Submit a new teacher application.
 * - Only students may apply. Existing teachers / admins are rejected with a
 *   friendly message ("you are already a teacher/admin").
 * - A student may only have one pending / under_review application at a time.
 *   Re-submitting after a rejection reuses the existing row so the queue stays
 *   clean (mirrors the refund request pattern).
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    // Teaching staff cannot apply — they are already approved instructors.
    if (isTeachingRole(user.role)) {
      return jsonError(
        "You are already a teacher or admin — no application is needed.",
        409
      );
    }

    // Per-student rate limit so the queue cannot be spammed.
    const limited = limitRequest(
      `teacher-app:${user.id}`,
      5,
      10 * 60 * 1000
    );
    if (limited) return limited;

    const body = await safeBody<CreateBody>(req);
    if (!body) return jsonError("Invalid request body", 400);

    const fullName = isNonEmpty(body.fullName) ? body.fullName.trim() : "";
    const email = isNonEmpty(body.email) ? body.email.trim().toLowerCase() : "";
    const phone = isNonEmpty(body.phone) ? body.phone.trim() : "";
    const city = isNonEmpty(body.city) ? body.city.trim() : "";
    const country = isNonEmpty(body.country) ? body.country.trim() : "";
    const nativeLanguage = isNonEmpty(body.nativeLanguage)
      ? body.nativeLanguage.trim()
      : "";
    const englishLevel = isNonEmpty(body.englishLevel)
      ? body.englishLevel.trim()
      : "";
    const teachingExperience = isNonEmpty(body.teachingExperience)
      ? body.teachingExperience.trim()
      : "";
    const bio = isNonEmpty(body.bio) ? body.bio.trim() : "";
    const availability = isNonEmpty(body.availability)
      ? body.availability.trim()
      : "";
    const certifications = optStr(body.certifications);
    const teachingPhilosophy = optStr(body.teachingPhilosophy);
    const sampleLesson = optUrl(body.sampleLesson);
    const linkedinUrl = optUrl(body.linkedinUrl);
    const resumeUrl = optUrl(body.resumeUrl);
    const preferredCourses = optStr(body.preferredCourses);
    // Background check consent must be explicitly ticked (truthy).
    const consent = body.consent === true || body.consent === "true";

    if (!fullName) return jsonError("Full name is required", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return jsonError("A valid email is required", 400);
    if (!phone) return jsonError("Phone number is required", 400);
    if (!city) return jsonError("City is required", 400);
    if (!country) return jsonError("Country is required", 400);
    if (!nativeLanguage)
      return jsonError("Native language is required", 400);
    if (!ENGLISH_LEVELS.has(englishLevel))
      return jsonError(
        "English level must be Beginner, Intermediate, Advanced or Native",
        400
      );
    if (!EXPERIENCE_BUCKETS.has(teachingExperience))
      return jsonError(
        "Teaching experience must be one of: 0, 1-3, 3-5, 5-10, 10+",
        400
      );
    if (!bio) return jsonError("A professional bio is required", 400);
    if (bio.length > MAX_BIO)
      return jsonError(`Bio is too long (max ${MAX_BIO} characters)`, 400);
    if (!availability) return jsonError("Availability is required", 400);
    if (!consent)
      return jsonError(
        "You must consent to a background check to apply",
        400
      );

    // Block a duplicate pending/under_review application. A previously-rejected
    // application is reused so the queue stays clean (same pattern as refunds).
    const existing = await db.teacherApplication.findFirst({
      where: { applicantId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
    if (
      existing &&
      (existing.status === "pending" || existing.status === "under_review")
    ) {
      return jsonError(
        "You already have an application under review. We will notify you when a decision is made.",
        409
      );
    }

    const data = {
      applicantId: user.id,
      fullName,
      email,
      phone,
      city,
      country,
      nativeLanguage,
      englishLevel,
      teachingExperience,
      certifications,
      bio,
      teachingPhilosophy,
      sampleLesson,
      linkedinUrl,
      resumeUrl,
      preferredCourses,
      availability,
      status: "pending" as const,
      adminNote: null,
      reviewedBy: null,
      reviewedAt: null,
    };

    const app = existing
      ? await db.teacherApplication.update({
          where: { id: existing.id },
          data,
        })
      : await db.teacherApplication.create({ data });

    logger.info("[teacher-applications/create]", "application submitted", {
      applicationId: app.id,
      applicantId: user.id,
    });

    return NextResponse.json(
      { application: serialize({ ...app, applicant: null, reviewer: null }) },
      { status: 201 }
    );
  } catch (e) {
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[teacher-applications/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
