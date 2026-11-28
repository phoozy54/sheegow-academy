import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { ensureUsernameSchema } from "@/lib/username";
import {
  isCurrentSession,
  nextSessionVersion,
  sessionVersionOf,
} from "@/lib/session";
import {
  API_AUDIENCE,
  CHAT_AUDIENCE,
  TOKEN_ISSUER,
  claimAllowsLegacy,
  newFamilyId,
  newJti,
} from "@/lib/token-security";
import {
  ROTATION_COOKIE,
  ROTATION_MAX_AGE,
  issueRotation,
  readRotation,
} from "@/lib/refresh-rotation";

export {
  isCurrentSession,
  nextSessionVersion,
  sessionVersionOf,
} from "@/lib/session";

/**
 * Secrets are resolved lazily so `next build` doesn't require them, but any
 * real signing/verifying fails closed in production when they are missing.
 * There is deliberately NO production fallback secret.
 */
const devSecret = randomBytes(32).toString("hex");

function getSecret(name: "JWT_SECRET" | "JWT_REFRESH_SECRET"): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be set in production. Generate one with: openssl rand -hex 32`);
  }
  return devSecret;
}

export const ACCESS_TOKEN_MAX_AGE = 60 * 15; // 15 minutes
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(
  password: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

export interface TokenPayload {
  userId: string;
  role: string;
  email: string;
  /** Distinguishes access, refresh and socket-scoped tokens. */
  purpose?: "access" | "refresh" | "socket";
  /**
   * Session epoch (User.updatedAt in ms) captured when the token was issued.
   * Refresh and getCurrentUser compare it with the current DB value so that
   * logout / password change invalidate every token issued before them.
   * Uses an existing column — no schema or migration change.
   */
  sessionVersion?: number;
  /** G2/JWT-1: unique token id — single-use refresh + reuse detection. */
  jti?: string;
  /** G2/JWT-1: all refresh tokens from one login share a family id. */
  familyId?: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

/**
 * Invalidate all tokens issued before now for this user by advancing their
 * session epoch. Called by logout and change-password. Fail closed: a bad
 * userId bubbles up to the route's normal error handler.
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { updatedAt: true },
  });
  if (!user) return;
  // Strictly greater than the previous epoch, even within one millisecond.
  await db.user.update({
    where: { id: userId },
    data: { updatedAt: new Date(nextSessionVersion(user.updatedAt.getTime())) },
  });
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    {
      ...payload,
      purpose: "access",
      iss: TOKEN_ISSUER,
      aud: API_AUDIENCE,
    },
    getSecret("JWT_SECRET"),
    { expiresIn: "15m", algorithm: "HS256" }
  );
}

export function signRefreshToken(payload: TokenPayload): string {
  const jti = payload.jti ?? newJti();
  const familyId = payload.familyId ?? newFamilyId();
  return jwt.sign(
    {
      ...payload,
      jti,
      familyId,
      purpose: "refresh",
      iss: TOKEN_ISSUER,
      aud: API_AUDIENCE,
    },
    getSecret("JWT_REFRESH_SECRET"),
    { expiresIn: "30d", algorithm: "HS256" }
  );
}

/**
 * Short-lived token used only by the Socket.io chat/WebRTC service.
 * Signed with the same JWT_SECRET as access tokens, but scope-limited and
 * valid for 5 minutes. The chat service rejects any token without
 * purpose === "socket".
 */
export function createSocketToken(user: {
  id: string;
  fullName: string;
  role: string;
  classId: string;
  canBroadcast: boolean;
  canShareScreen: boolean;
  sessionVersion: number;
}): string {
  return jwt.sign(
    {
      userId: user.id,
      userName: user.fullName,
      role: user.role,
      classId: user.classId,
      canBroadcast: user.canBroadcast,
      canShareScreen: user.canShareScreen,
      purpose: "socket",
      // G2/SOCK-1: ties the short-lived socket credential to the login epoch
      // and gives it a unique id. The chat service enforces exp and audience;
      // jti/sessionVersion are carried for later server-side revocation.
      sessionVersion: user.sessionVersion,
      jti: newJti(),
      iss: TOKEN_ISSUER,
      aud: CHAT_AUDIENCE,
    },
    getSecret("JWT_SECRET"),
    { expiresIn: "5m", algorithm: "HS256" }
  );
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    // Algorithm is pinned — an attacker must never be able to select "none".
    const payload = jwt.verify(token, getSecret("JWT_SECRET"), {
      algorithms: ["HS256"],
    }) as TokenPayload;
    if (payload.purpose !== "access") return null;
    if (!claimAllowsLegacy(payload, "iss", TOKEN_ISSUER)) return null;
    if (!claimAllowsLegacy(payload, "aud", API_AUDIENCE)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, getSecret("JWT_REFRESH_SECRET"), {
      algorithms: ["HS256"],
    }) as TokenPayload;
    // A socket token or access token must never be a refresh credential.
    // Tokens without `purpose` are pre-G2 legacy tokens, accepted once so the
    // next rotation can issue a hardened replacement.
    if (payload.purpose && payload.purpose !== "refresh") return null;
    if (!claimAllowsLegacy(payload, "iss", TOKEN_ISSUER)) return null;
    if (!claimAllowsLegacy(payload, "aud", API_AUDIENCE)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Set auth cookies (access + refresh + signed rotation cursor). */
export async function setAuthCookies(payload: TokenPayload) {
  const cookieStore = await cookies();

  // Every call mints a brand-new refresh jti (single-use token). The family id
  // is carried forward so a refresh chain remains traceable. Reading the prior
  // state BEFORE overwriting it lets all callers (login, register, refresh,
  // change-password, profile edit) rotate automatically.
  //
  // The refresh cookie is scoped to /api/auth, but the signed cursor is scoped
  // to "/" so setAuthCookies() can also read it from routes such as
  // /api/users/me. That preserves the family across a profile edit.
  const priorToken = cookieStore.get("sheegow_refresh")?.value;
  const prior = priorToken ? verifyRefreshToken(priorToken) : null;
  const priorRotation = readRotation(cookieStore.get(ROTATION_COOKIE)?.value);
  // Never carry a rotation family across accounts. A prior cookie can belong
  // to a different user when one browser switches accounts; treating it as
  // "previous" would let that stale token be accepted in the new account's
  // family. Restrict continuity to the same authenticated user.
  const sameUser = prior?.userId === payload.userId;
  const sameRotationUser = priorRotation?.userId === payload.userId;
  const familyId =
    payload.familyId ??
    (sameUser ? prior?.familyId : undefined) ??
    (sameRotationUser && priorRotation ? priorRotation.familyId : undefined) ??
    newFamilyId();
  const previousJti =
    (sameUser ? prior?.jti : undefined) ??
    (sameRotationUser && priorRotation ? priorRotation.current : null);
  const jti = newJti();
  const next: TokenPayload = { ...payload, familyId, jti };

  const accessToken = signAccessToken(next);
  const refreshToken = signRefreshToken(next);
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set("sheegow_access", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set("sheegow_refresh", refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  // Signed cursor for reuse detection. HttpOnly, opaque and scoped to "/" so
  // every route that calls setAuthCookies() can read and rotate it.
  cookieStore.set(
    ROTATION_COOKIE,
    issueRotation(jti, previousJti, payload.userId, familyId),
    {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge: ROTATION_MAX_AGE,
    }
  );
}

/** Clear auth cookies (logout). Each cookie must be deleted with the exact
 * path it was set with, otherwise it survives logout and can be replayed. */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("sheegow_access");
  cookieStore.delete({ name: "sheegow_refresh", path: "/api/auth" });
  cookieStore.delete({ name: ROTATION_COOKIE, path: "/" });
}

/**
 * Get the currently authenticated user from cookies.
 * ONLY the short-lived access token is accepted here. The refresh token is
 * intentionally NOT a general credential — it is only usable at
 * /api/auth/refresh, which rotates the session.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sheegow_access")?.value;
    if (!accessToken) return null;

    // Self-healing guard: the production DB may not have the username column
    // yet during the first deploy. Idempotent and cached per server instance.
    await ensureUsernameSchema();

    const payload = verifyAccessToken(accessToken);
    if (!payload) return null;

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        profilePicture: true,
        bio: true,
        level: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) return null;
    // Session revocation (logout / password change) advances updatedAt.
    // Reject stale access tokens immediately instead of waiting for expiry.
    if (!isCurrentSession(payload, user)) return null;
    return user;
  } catch {
    return null;
  }
}

/** Require authentication, throw if not authed */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

/** Roles with full administrative access. */
export const ADMIN_ROLES = new Set(["admin", "super_admin"]);
/** Roles allowed to create and manage live classes. */
export const TEACHING_ROLES = new Set(["teacher", "admin", "super_admin"]);

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

export function isTeachingRole(role: string): boolean {
  return TEACHING_ROLES.has(role);
}

/** Admins manage everything; teachers only manage classes explicitly assigned
 * to them. A class without a teacher is NOT up for grabs — fail closed. */
export function canManageLiveClass(
  actor: { id: string; role: string },
  classTeacherId: string | null
): boolean {
  return isAdminRole(actor.role) || classTeacherId === actor.id;
}

/** Require admin or super-admin role. */
export async function requireAdmin() {
  const user = await requireAuth();
  if (!isAdminRole(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/** Require teacher, admin, or super-admin role. */
export async function requireTeacherOrAdmin() {
  const user = await requireAuth();
  if (!isTeachingRole(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/**
 * Highest-privilege actions. G2/AUTH-2: a normal admin is NOT a super admin.
 * Previously this check was identical to requireAdmin(), so any admin could
 * reach super-admin-only routes and promote themselves to super_admin.
 */
export async function requireSuperAdmin() {
  const user = await requireAuth();
  if (user.role !== "super_admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
