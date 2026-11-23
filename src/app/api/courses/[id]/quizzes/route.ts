import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireTeacherOrAdmin } from "@/lib/auth";
import { jsonError, handleAuthError, limitRequest, safeBody } from "@/lib/api-helpers";
import { canManageCourse } from "@/lib/content-access";

type RouteContext = { params: Promise<{ id: string }> };

const QUESTION_TYPES = new Set(["single", "multiple", "true_false", "short"]);

interface IncomingChoice {
  text?: string;
  isCorrect?: boolean;
  order?: number;
}
interface IncomingQuestion {
  type?: string;
  prompt?: string;
  points?: number;
  order?: number;
  choices?: IncomingChoice[];
}
interface CreateQuizBody {
  title?: string;
  description?: string;
  lessonId?: string;
  liveClassId?: string;
  timeLimitSec?: number;
  passScore?: number;
  maxAttempts?: number;
  randomize?: boolean;
  isLive?: boolean;
  isPublished?: boolean;
  questions?: IncomingQuestion[];
}

/** POST /api/courses/:id/quizzes — create a quiz/test with its question bank. */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const user = await requireTeacherOrAdmin();
    const { id } = await params;

    const limited = limitRequest(`content:${user.id}`, 60, 60_000);
    if (limited) return limited;

    const course = await db.course.findUnique({ where: { id } });
    if (!course) return jsonError("Course not found", 404);
    if (!canManageCourse(user, course)) return jsonError("Forbidden", 403);

    const body = await safeBody<CreateQuizBody>(req);
    const title = body?.title?.trim();
    if (!title) return jsonError("Quiz title is required", 400);

    const questions = Array.isArray(body?.questions) ? body.questions : [];
    if (questions.length === 0) return jsonError("At least one question is required", 400);
    if (questions.length > 100) return jsonError("Too many questions", 400);

    const normalized = questions.map((q, qi) => {
      const type = q.type?.trim() || "single";
      if (!QUESTION_TYPES.has(type)) throw new Error("INVALID_QUESTION_TYPE");
      const prompt = q.prompt?.trim();
      if (!prompt) throw new Error("MISSING_PROMPT");
      const choices = (Array.isArray(q.choices) ? q.choices : []).map((c, ci) => ({
        text: (c.text || "").trim().slice(0, 1000),
        isCorrect: Boolean(c.isCorrect),
        order: typeof c.order === "number" ? c.order : ci + 1,
      })).filter((c) => c.text.length > 0);

      if (type !== "short" && choices.length < 2) throw new Error("NEED_CHOICES");
      if (type !== "short" && !choices.some((c) => c.isCorrect)) {
        throw new Error("NEED_CORRECT_CHOICE");
      }

      return {
        type,
        prompt: prompt.slice(0, 4000),
        points:
          typeof q.points === "number" && Number.isFinite(q.points)
            ? Math.max(1, Math.floor(q.points))
            : 1,
        order: typeof q.order === "number" ? q.order : qi + 1,
        choices: type === "short" ? [] : choices,
      };
    });

    const passScore =
      typeof body?.passScore === "number" && Number.isFinite(body.passScore)
        ? Math.min(100, Math.max(0, Math.floor(body.passScore)))
        : 70;

    const quiz = await db.quiz.create({
      data: {
        courseId: id,
        lessonId: body?.lessonId?.trim() || null,
        liveClassId: body?.liveClassId?.trim() || null,
        title: title.slice(0, 300),
        description: body?.description?.trim().slice(0, 2000) || null,
        timeLimitSec:
          typeof body?.timeLimitSec === "number" && Number.isFinite(body.timeLimitSec)
            ? Math.max(0, Math.floor(body.timeLimitSec))
            : null,
        passScore,
        maxAttempts:
          typeof body?.maxAttempts === "number" && Number.isFinite(body.maxAttempts)
            ? Math.max(1, Math.floor(body.maxAttempts))
            : 3,
        randomize: body?.randomize ?? true,
        isLive: Boolean(body?.isLive),
        isPublished: Boolean(body?.isPublished),
        questions: {
          create: normalized.map((q) => ({
            type: q.type,
            prompt: q.prompt,
            points: q.points,
            order: q.order,
            choices: { create: q.choices },
          })),
        },
      },
      include: { questions: { include: { choices: true }, orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("INVALID_")) {
      return jsonError("Invalid question data", 400);
    }
    if (e instanceof Error && e.message === "MISSING_PROMPT") {
      return jsonError("Every question needs a prompt", 400);
    }
    if (e instanceof Error && e.message === "NEED_CHOICES") {
      return jsonError("Multiple-choice questions need at least two options", 400);
    }
    if (e instanceof Error && e.message === "NEED_CORRECT_CHOICE") {
      return jsonError("Every multiple-choice question needs a correct option", 400);
    }
    const authErr = handleAuthError(e);
    if (authErr) return authErr;
    logger.error("[quizzes/create]", "request failed", e);
    return jsonError("Internal server error", 500);
  }
}
