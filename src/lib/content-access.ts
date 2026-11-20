/**
 * Central access control for course CONTENT (lessons, materials, quizzes,
 * homework, certificates).
 *
 * The UI may hide a button, but every content API must call this helper:
 * identity always comes from the access-token cookie via requireAuth(), never
 * from a client-supplied userId. Trial payments are scoped around courses and
 * must never be treated as a full course purchase.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isAdminRole } from "@/lib/auth";
import { hasApprovedTrialForCourse, TRIAL_METHOD } from "@/lib/trial-access";

export type ContentActor = { id: string; role: string };

export type AccessDecision = {
  allowed: boolean;
  status: 200 | 402 | 403;
  reason?: string;
};

const ALLOW: AccessDecision = { allowed: true, status: 200 };
const FORBIDDEN: AccessDecision = {
  allowed: false,
  status: 403,
  reason: "You are not enrolled in this course.",
};
const PAYMENT_REQUIRED: AccessDecision = {
  allowed: false,
  status: 402,
  reason: "Complete your payment or request an approved trial.",
};

/**
 * Decide whether `actor` may read/interact with the content of `courseId`.
 *
 * - admin / super_admin: full access (they manage everything).
 * - teacher: only the owner of the course (authoring preview).
 * - student: active enrollment, not expired, plus payment for paid courses
 *   (an approved, non-expired trial counts as payment for its 7-day window).
 */
export async function decideCourseContentAccess(
  actor: ContentActor,
  courseId: string
): Promise<AccessDecision> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, price: true, teacherId: true, isActive: true },
  });
  if (!course) return { allowed: false, status: 403, reason: "Course not found." };

  if (isAdminRole(actor.role)) return ALLOW;
  if (actor.role === "teacher" && course.teacherId === actor.id) return ALLOW;
  if (actor.role !== "student") return FORBIDDEN;

  const enrollment = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId: actor.id, courseId } },
    select: { status: true, expiresAt: true },
  });
  // "completed" is a valid terminal state (all lessons done). Graduates must
  // keep read access to review material and claim/verify their certificate.
  if (!enrollment || !["active", "completed"].includes(enrollment.status)) {
    return FORBIDDEN;
  }
  if (enrollment.expiresAt && enrollment.expiresAt.getTime() <= Date.now()) {
    return FORBIDDEN;
  }

  if (course.price <= 0) return ALLOW;

  // A course-wide approved trial is time-boxed (7 days from approval).
  if (await hasApprovedTrialForCourse(actor.id, courseId)) return ALLOW;

  // A trial is a Payment row with status="completed". It must NEVER count as
  // a course purchase — hence the explicit method exclusion.
  const paid = await db.payment.findFirst({
    where: {
      studentId: actor.id,
      courseId,
      status: "completed",
      method: { not: TRIAL_METHOD },
    },
    select: { id: true },
  });
  return paid ? ALLOW : PAYMENT_REQUIRED;
}

/** Simpler boolean form for places that only need yes/no. */
export async function canAccessCourseContent(
  actor: ContentActor,
  courseId: string
): Promise<boolean> {
  return (await decideCourseContentAccess(actor, courseId)).allowed;
}

/**
 * Teachers may only mutate content of courses they own. Admins may mutate all.
 */
export function canManageCourse(actor: ContentActor, course: { teacherId: string | null }): boolean {
  if (isAdminRole(actor.role)) return true;
  return actor.role === "teacher" && course.teacherId === actor.id;
}

/**
 * Recompute the cached Enrollment.progress from real per-lesson progress.
 * Published lessons are the denominator; completed lessons are the numerator.
 * Also maintains status/completedAt so certificate logic has a reliable flag.
 */
export async function recomputeEnrollmentProgress(
  studentId: string,
  courseId: string
): Promise<{ progress: number; completedLessons: number; totalLessons: number } | null> {
  const enrollment = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId } },
    select: { id: true },
  });
  if (!enrollment) return null;

  const [totalLessons, completedLessons] = await Promise.all([
    db.lesson.count({
      where: { module: { courseId, isPublished: true }, isPublished: true },
    }),
    db.lessonProgress.count({
      where: {
        studentId,
        status: "completed",
        lesson: { module: { courseId, isPublished: true }, isPublished: true },
      },
    }),
  ]);

  const progress =
    totalLessons === 0 ? 0 : Math.min(100, Math.round((completedLessons / totalLessons) * 100));
  const completed = totalLessons > 0 && completedLessons >= totalLessons;

  await db.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progress,
      completedLessons: String(completedLessons),
      status: completed ? "completed" : "active",
      completedAt: completed ? new Date() : null,
    },
  });

  return { progress, completedLessons, totalLessons };
}

/** xAPI-friendly event ledger. Failures never break the learner's request. */
export async function recordLearningEvent(input: {
  userId: string;
  verb: string;
  objectType: string;
  objectId: string;
  courseId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.learningEvent.create({
      data: {
        userId: input.userId,
        verb: input.verb,
        objectType: input.objectType,
        objectId: input.objectId,
        courseId: input.courseId ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Analytics must be best-effort; never fail a lesson/quiz submission.
  }
}
