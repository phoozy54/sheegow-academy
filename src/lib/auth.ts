import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";

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
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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
  /** Distinguishes access tokens from socket-scoped tokens. */
  purpose?: "access" | "socket";
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, purpose: "access" }, getSecret("JWT_SECRET"), {
    expiresIn: "15m",
  });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret("JWT_REFRESH_SECRET"), {
    expiresIn: "7d",
  });
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
}): string {
  return jwt.sign(
    {
      userId: user.id,
      userName: user.fullName,
      role: user.role,
      classId: user.classId,
      canBroadcast: user.canBroadcast,
      purpose: "socket",
    },
    getSecret("JWT_SECRET"),
    { expiresIn: "5m" }
  );
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, getSecret("JWT_SECRET")) as TokenPayload;
    if (payload.purpose && payload.purpose !== "access") return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(
      token,
      getSecret("JWT_REFRESH_SECRET")
    ) as TokenPayload;
    // A socket token must never be usable as a refresh credential.
    if (payload.purpose === "socket") return null;
    return payload;
  } catch {
    return null;
  }
}

/** Set auth cookies (access + refresh) on the response */
export async function setAuthCookies(payload: TokenPayload) {
  const cookieStore = await cookies();
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  cookieStore.set("sheegow_access", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set("sheegow_refresh", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

/** Clear auth cookies (logout) */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("sheegow_access");
  cookieStore.delete("sheegow_refresh");
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

    const payload = verifyAccessToken(accessToken);
    if (!payload) return null;

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        profilePicture: true,
        bio: true,
        level: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) return null;
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

/** Admins manage everything; teachers only manage their own classes. */
export function canManageLiveClass(
  actor: { id: string; role: string },
  classTeacherId: string | null
): boolean {
  return (
    isAdminRole(actor.role) || !classTeacherId || classTeacherId === actor.id
  );
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

/** Require the highest privilege level — used for financial and role changes. */
export async function requireSuperAdmin() {
  const user = await requireAuth();
  if (user.role !== "super_admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
