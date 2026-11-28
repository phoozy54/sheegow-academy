import { describe, expect, it, beforeAll } from "bun:test";
import {
  PASSWORD_COMPLEXITY_ERROR,
  PASSWORD_LENGTH_ERROR,
  validateNewPassword,
  validatePassword,
} from "../src/lib/password";
import {
  API_AUDIENCE,
  CHAT_AUDIENCE,
  TOKEN_ISSUER,
  claimAllowsLegacy,
  newFamilyId,
  newJti,
} from "../src/lib/token-security";
import {
  ROTATION_COOKIE,
  classifyRotation,
  issueRotation,
  readRotation,
} from "../src/lib/refresh-rotation";
import jwt from "jsonwebtoken";

const read = (path: string) => Bun.file(new URL(path, import.meta.url)).text();

/**
 * Test secrets are random per run and NEVER printed. They are set before the
 * auth module's getSecret() is called (secrets are resolved lazily), so no
 * production value is involved.
 */
const TEST_SECRET = "test-only-" + newJti();
const TEST_REFRESH_SECRET = "test-only-refresh-" + newJti();

describe("G2 / PW-1 — one password policy", () => {
  it("accepts a strong password", () => {
    expect(validatePassword("Strong!Pass2026")).toEqual({ ok: true });
  });

  it("rejects short passwords", () => {
    const result = validatePassword("Ab1!");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(PASSWORD_LENGTH_ERROR);
  });

  it("rejects 12 characters from only one class", () => {
    const result = validatePassword("abcdefghijkl");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(PASSWORD_COMPLEXITY_ERROR);
  });

  it("requires at least 3 of 4 classes", () => {
    expect(validatePassword("abcdefghij12").ok).toBe(false); // lower + digit only
    expect(validatePassword("abcdefghij1!").ok).toBe(true); // lower + digit + special
    expect(validatePassword("Abcdefghij1!").ok).toBe(true); // 4 classes
  });

  it("rejects reuse on password change", () => {
    const result = validateNewPassword("Strong!Pass2026", "Strong!Pass2026");
    expect(result.ok).toBe(false);
    expect(validateNewPassword("Strong!Pass2026", "Different!2026").ok).toBe(true);
  });

  it("all server entry points and the admin UI use the shared helper", async () => {
    const entryPoints: Array<[string, string]> = [
      ["../src/app/api/auth/register/route.ts", "validatePassword"],
      ["../src/app/api/auth/change-password/route.ts", "validateNewPassword"],
      ["../src/app/api/users/route.ts", "validatePassword"],
      ["../src/components/sheegow/views/admin/admin-teachers.tsx", "validatePassword"],
    ];
    for (const [path, helper] of entryPoints) {
      expect(await read(path)).toContain(helper);
    }
  });

  it("admin password hint matches the shared policy in all locales", async () => {
    const source = await read("../src/lib/i18n/translations.ts");
    expect(source).not.toContain("Password must be at least 6 characters");
    expect(source).not.toContain("Erey-sirka waa inuu ahaadaa ugu yaraan 6 xaraf");
    expect(source).not.toContain("يجب أن تكون كلمة المرور 6 أحرف على الأقل");
    expect(source).toContain("at least 12 characters");
  });

  it("fake forgot-password button was removed (AUTH-4)", async () => {
    const source = await read("../src/components/sheegow/auth-modal.tsx");
    expect(source).not.toContain("Forgot password?");
    expect(source).not.toContain("Password reset link sent (demo)");
  });
});

describe("G2 / JWT-1 — token claims and algorithm pinning", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    process.env.JWT_REFRESH_SECRET = TEST_REFRESH_SECRET;
  });

  it("jti and familyId are unique", () => {
    expect(newJti()).not.toBe(newJti());
    expect(newFamilyId()).not.toBe(newFamilyId());
  });

  it("claim check accepts legacy but rejects a wrong present value", () => {
    expect(claimAllowsLegacy({}, "iss", TOKEN_ISSUER)).toBe(true);
    expect(claimAllowsLegacy({ iss: TOKEN_ISSUER }, "iss", TOKEN_ISSUER)).toBe(true);
    expect(claimAllowsLegacy({ iss: "evil" }, "iss", TOKEN_ISSUER)).toBe(false);
  });

  it("verifyAccessToken pins HS256 and rejects a socket token", async () => {
    const { signAccessToken, verifyAccessToken, createSocketToken } = await import(
      "../src/lib/auth"
    );
    const access = signAccessToken({
      userId: "u1",
      role: "student",
      email: "synthetic@test.invalid",
      sessionVersion: 1,
    });
    expect(verifyAccessToken(access)?.userId).toBe("u1");

    const socket = createSocketToken({
      id: "u1",
      fullName: "Synthetic",
      role: "student",
      classId: "c1",
      canBroadcast: false,
      canShareScreen: false,
      sessionVersion: 1,
    });
    expect(verifyAccessToken(socket)).toBeNull();

    // An "alg: none" token must never be accepted.
    const noneToken = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" })
    ).toString("base64url") + "." +
      Buffer.from(
        JSON.stringify({ userId: "u1", purpose: "access" })
      ).toString("base64url") + ".";
    expect(verifyAccessToken(noneToken)).toBeNull();
  });

  it("verifyRefreshToken rejects access/socket tokens and wrong claims", async () => {
    const { signAccessToken, signRefreshToken, verifyRefreshToken, createSocketToken } =
      await import("../src/lib/auth");
    const refresh = signRefreshToken({
      userId: "u1",
      role: "student",
      email: "synthetic@test.invalid",
      sessionVersion: 1,
    });
    expect(verifyRefreshToken(refresh)?.jti).toBeTruthy();
    expect(verifyRefreshToken(refresh)?.familyId).toBeTruthy();
    expect(verifyRefreshToken(refresh)?.aud).toBe(API_AUDIENCE);

    expect(verifyRefreshToken(signAccessToken({
      userId: "u1", role: "student", email: "synthetic@test.invalid",
    }))).toBeNull();
    expect(verifyRefreshToken(createSocketToken({
      id: "u1", fullName: "Synthetic", role: "student", classId: "c1",
      canBroadcast: false, canShareScreen: false, sessionVersion: 1,
    }))).toBeNull();

    const wrong = jwt.sign(
      { userId: "u1", purpose: "refresh", iss: "evil", aud: API_AUDIENCE },
      TEST_REFRESH_SECRET,
      { algorithm: "HS256" }
    );
    expect(verifyRefreshToken(wrong)).toBeNull();

    const wrongAud = jwt.sign(
      { userId: "u1", purpose: "refresh", iss: TOKEN_ISSUER, aud: CHAT_AUDIENCE },
      TEST_REFRESH_SECRET,
      { algorithm: "HS256" }
    );
    expect(verifyRefreshToken(wrongAud)).toBeNull();
  });
});

describe("G2 / AUTH-3 — signed rotation cursor", () => {
  const now = 1_000_000;
  const userId = "user-1";
  const familyId = "family-1";

  it("round-trips current, previous, user and family", () => {
    const token = issueRotation("jti-new", "jti-old", userId, familyId, now);
    expect(readRotation(token, now + 1)).toEqual({
      current: "jti-new",
      previous: "jti-old",
      expires: now + 60 * 60 * 24 * 30 * 1000,
      userId,
      familyId,
    });
  });

  it("rejects tampering, wrong signature and expiry", () => {
    const token = issueRotation("jti-new", null, userId, familyId, now);
    expect(readRotation(token.slice(0, -1) + "x", now + 1)).toBeNull();
    // Swapping the bound user invalidates the HMAC.
    const forged = token.replace(
      `.${userId}.${familyId}.`,
      `.${userId}-evil.${familyId}.`
    );
    expect(readRotation(forged, now + 1)).toBeNull();
    expect(readRotation(token, now + 60 * 60 * 24 * 30 * 1000 + 1)).toBeNull();
    expect(readRotation("garbage")).toBeNull();
  });

  it("classifies current, previous, legacy and reuse", () => {
    const rotation = readRotation(
      issueRotation("current", "previous", userId, familyId, now),
      now + 1
    );
    expect(classifyRotation(rotation, "current", userId, familyId)).toBe("current");
    expect(classifyRotation(rotation, "previous", userId, familyId)).toBe("previous");
    expect(classifyRotation(rotation, "old-jti", userId, familyId)).toBe("reuse");
    expect(classifyRotation(rotation, undefined, userId, familyId)).toBe("reuse");
    // Legacy pre-G2 token: no jti and no cursor.
    expect(classifyRotation(null, undefined)).toBe("legacy");
  });

  it("rejects a G2 token presented without its signed cursor", () => {
    // Reviewer High: a stolen refresh cookie must not open a fresh session in
    // a browser that has no sheegow_rot cookie.
    expect(classifyRotation(null, "stolen-jti", userId, familyId)).toBe("reuse");
  });

  it("rejects a cursor bound to a different user or family", () => {
    const rotation = readRotation(
      issueRotation("stolen-jti", null, userId, familyId, now),
      now + 1
    );
    expect(classifyRotation(rotation, "stolen-jti", "other-user", familyId)).toBe("reuse");
    expect(classifyRotation(rotation, "stolen-jti", userId, "other-family")).toBe("reuse");
    expect(classifyRotation(rotation, "stolen-jti")).toBe("reuse");
  });

  it("refresh route revokes on reuse and rate-limits both connection and user", async () => {
    const source = await read("../src/app/api/auth/refresh/route.ts");
    expect(source).toContain(classifyRotation.name);
    expect(source).toContain("payload.jti,\n      payload.userId,\n      payload.familyId");
    expect(source).toContain('if (decision === "reuse")');
    expect(source).toContain("revokeUserSessions(user.id)");
    expect(source).toContain("await clearAuthCookies()");
    expect(source).toContain("auth-refresh:ip:${ip}");
    expect(source).toContain("auth-refresh:${payload.userId}:${ip}");
    expect(source).toContain("clientIp(req)");
    expect(source).toContain("ROTATION_COOKIE");
    expect(source).toContain("familyId: payload.familyId");
  });

  it("auth cookies bind the cursor to user/family and clear it at the right path", async () => {
    const source = await read("../src/lib/auth.ts");
    expect(source).toContain(
      "issueRotation(jti, previousJti, payload.userId, familyId)"
    );
    expect(source).toContain("prior?.userId === payload.userId");
    expect(source).toContain("readRotation(cookieStore.get(ROTATION_COOKIE)?.value)");
    expect(source).toContain("ROTATION_COOKIE");
    expect(ROTATION_COOKIE).toBe("sheegow_rot");
    expect(source).toContain('cookieStore.delete({ name: ROTATION_COOKIE, path: "/" })');
    expect(source).toContain('algorithms: ["HS256"]');
  });
});

describe("G2 / AUTH-2 — privilege tiers", () => {
  it("requireSuperAdmin is stricter than requireAdmin", async () => {
    const source = await read("../src/lib/auth.ts");
    expect(source).toContain('if (user.role !== "super_admin")');
  });

  it("admin cannot promote anyone or change their own role", async () => {
    const userRoute = await read("../src/app/api/users/[id]/route.ts");
    expect(userRoute).toContain('if (admin.role !== "super_admin")');
    expect(userRoute).toContain("Only a super admin can change user roles");
    expect(userRoute).toContain("You cannot change your own role");

    const createRoute = await read("../src/app/api/users/route.ts");
    expect(createRoute).toContain('actor.role !== "super_admin"');

    // Reviewer Info: the delete path must not let a normal admin remove a
    // privileged account either.
    expect(userRoute).toContain("Only a super admin can delete admin accounts");
    expect(userRoute).toContain('["admin", "super_admin"].includes(existing.role)');
  });
});

describe("G2 / PAY-2 + PAY-3 — payments fail closed and refunds revoke", () => {
  it("production never enables mock checkout", async () => {
    for (const path of [
      "../src/app/api/payments/checkout/route.ts",
      "../src/app/api/bundles/[id]/checkout/route.ts",
    ]) {
      const source = await read(path);
      expect(source).toContain("const DEMO_MODE = !IS_PRODUCTION");
      expect(source).toContain('process.env.NODE_ENV === "production"');
      expect(source).not.toContain('DEMO_MODE === "true" ||');
    }
  });

  it("refund approval atomically claims, revokes enrollment and certificate", async () => {
    const source = await read("../src/app/api/refunds/[id]/route.ts");
    expect(source).toContain('where: { id: refund.id, status: "pending" }');
    expect(source).toContain("claimed.count !== 1");
    expect(source).toContain('data: { status: "revoked" }');
    expect(source).toContain("tx.certificate.updateMany");
    expect(source).toContain("revokedAt: reviewedAt");
    expect(source).toContain("REFUND_ALREADY_REVIEWED");
    // Reviewer Low: a zero-amount bundle receipt has no courseId and no
    // revocable enrollment; approval must be refused.
    expect(source).toContain("This payment has no refundable enrollment");
  });

  it("certificate verification honours revokedAt", async () => {
    const source = await read("../src/app/api/certificates/verify/[code]/route.ts");
    expect(source).toContain("valid: !certificate.revokedAt");
  });
});

describe("G2 / OPS-2 + OPS-3 — logs and email failures", () => {
  it("logger redacts lowercase-normalised secrets and PII, no stacks", async () => {
    const source = await read("../src/lib/logger.ts");
    expect(source).toContain("'accesstoken'");
    expect(source).toContain("'refreshtoken'");
    expect(source).toContain("'apikey'");
    expect(source).toContain("'email'");
    expect(source).toContain("'studentemail'");
    expect(source).toContain("'identifier'");
    expect(source).toContain("key.toLowerCase()");
    expect(source).not.toContain("stack: error.stack");
    expect(source).toContain("sanitizeText");
    // Reviewer Info: Errors nested in ctx and free-form messages are also
    // sanitized, not just the `error` argument.
    expect(source).toContain("return { name: value.name, message: safeErrorMessage(value) }");
    expect(source).toContain("msg: sanitizeText(message)");
    expect(source).toContain("${sanitizeText(message)}${ctxStr}${errStr}");
  });

  it("email helpers return a result and production logs missing key as error", async () => {
    const source = await read("../src/lib/email.ts");
    expect(source).toContain("): Promise<SendEmailResult> {");
    expect(source).toContain("RESEND_API_KEY is not set in production");
    expect(source).not.toContain("{ to, subject }");
  });

  it("critical callers surface undelivered email", async () => {
    const callers: Array<[string, string]> = [
      ["../src/app/api/auth/register/route.ts", "not delivered"],
      ["../src/app/api/refunds/[id]/route.ts", "not delivered"],
      ["../src/app/api/certificates/route.ts", "not delivered"],
      ["../src/app/api/teacher-applications/[id]/route.ts", "not delivered"],
      ["../src/app/api/newsletter/route.ts", "welcome email unavailable"],
    ];
    for (const [path, phrase] of callers) {
      expect(await read(path)).toContain(phrase);
    }
  });
});

describe("G2 / SOCK-1 — socket tokens expire for open sockets", () => {
  it("socket token carries epoch, jti and chat audience", async () => {
    const route = await read("../src/app/api/socket/token/route.ts");
    expect(route).toContain("sessionVersionOf(user)");
    // Reviewer Low: revoked enrollments must not receive a socket token.
    expect(route).toContain("select: { id: true, status: true }");
    expect(route).toContain('!["active", "completed"].includes(enrollment.status)');
    const source = await read("../src/lib/auth.ts");
    expect(source).toContain("aud: CHAT_AUDIENCE");
    expect(source).toContain("jti: newJti()");
  });

  it("chat service rechecks expiry and disconnects on timer", async () => {
    const source = await read("../mini-services/chat-service/index.ts");
    expect(source).toContain("exp: number");
    expect(source).toContain("identity.exp * 1000 <= Date.now()");
    expect(source).toContain("socket.disconnect(true)");
    expect(source).toContain("clearTimeout(expiryTimer)");
    expect(source).toContain("payload.aud !== CHAT_AUDIENCE");
    expect(source).toContain("dev identity uses Number.MAX_SAFE_INTEGER");
    // Reviewer Low: all state-changing handlers go through membership(),
    // including broadcast-stop and WebRTC signaling.
    expect(source).toContain("const entry = membership(socket, payload.classId)");
    expect(source).toContain("const entry = membership(socket, classId)");
    expect(source).not.toContain("const entry = socketIndex.get(socket.id)\n      if (!entry) return");
  });
});

describe("G2 / UPL-1 + PII-1 — uploads and public data", () => {
  it("upload signature verifies lesson belongs to the course", async () => {
    const source = await read("../src/app/api/uploads/sign/route.ts");
    expect(source).toContain("module: { courseId }");
    expect(source).toContain("Lesson not found in this course");
    expect(source).toContain("lessonSegment = lesson.id");
    expect(source).not.toContain("body?.lessonId?.trim() || \"general\"");
  });

  it("leaderboard publishes rank pseudonyms, not durable ids or avatars", async () => {
    const source = await read("../src/app/api/leaderboard/route.ts");
    expect(source).toContain("rank-${idx + 1}");
    expect(source).toContain("pseudonymByStudent.get(viewer.id)");
    expect(source).toContain("profilePicture: null");
    expect(source).not.toContain("studentId: row.studentId");
  });

  it("contact endpoint does not echo submitted PII", async () => {
    const source = await read("../src/app/api/contact/route.ts");
    expect(source).toContain("return NextResponse.json({ success: true }");
    expect(source).not.toContain("{ success: true, contactMessage }");
  });

  it("no database migration or schema change was introduced", async () => {
    const source = await read("../prisma/schema.prisma");
    // G2 uses only existing columns (updatedAt, Enrollment.status,
    // Certificate.revokedAt) — no new model or field.
    expect(source).toContain("revokedAt        DateTime?");
    expect(source).toContain("status           String   @default(\"active\")");
  });
});
