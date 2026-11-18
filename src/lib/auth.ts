import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const JWT_SECRET =
  process.env.JWT_SECRET || "sheegow-academy-dev-secret-change-in-prod";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "sheegow-refresh-dev-secret-change-in-prod";

export const ACCESS_TOKEN_MAX_AGE = 60 * 15; // 15 minutes
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
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
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
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
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

/** Clear auth cookies (logout) */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("sheegow_access");
  cookieStore.delete("sheegow_refresh");
}

/** Get the currently authenticated user from cookies. Returns null if not authed. */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sheegow_access")?.value;
    const refreshToken = cookieStore.get("sheegow_refresh")?.value;

    const token = accessToken || refreshToken;
    if (!token) return null;

    let payload: TokenPayload | null = null;
    if (accessToken) {
      payload = verifyAccessToken(accessToken);
    }
    if (!payload && refreshToken) {
      payload = verifyRefreshToken(refreshToken);
    }
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

/** Require admin role */
export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/** Require teacher or admin role */
export async function requireTeacherOrAdmin() {
  const user = await requireAuth();
  if (user.role !== "teacher" && user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
