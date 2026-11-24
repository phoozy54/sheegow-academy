import { db } from "@/lib/db";
import { isValidSomaliPhone, normalizeSomaliPhone } from "@/lib/phone";

/**
 * Username rules shared by registration, admin user creation, profile updates
 * and login. Usernames are case-insensitive and stored in lowercase.
 */
const RESERVED = new Set([
  "admin",
  "superadmin",
  "super-admin",
  "super_admin",
  "root",
  "teacher",
  "student",
  "support",
  "help",
  "info",
  "contact",
  "www",
  "api",
  "me",
  "login",
  "register",
  "dashboard",
]);

export function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 30);
}

export function isValidUsername(input: string): boolean {
  const value = normalizeUsername(input);
  return (
    value.length >= 3 &&
    value.length <= 30 &&
    /^[a-z0-9][a-z0-9._]*[a-z0-9]$/.test(value) &&
    !RESERVED.has(value)
  );
}

export type IdentifierKind = "email" | "phone" | "username" | "invalid";

function isUsernameShape(raw: string): boolean {
  const trimmed = raw.trim().replace(/^@/, "");
  if (!trimmed) return false;
  if (/^\d+$/.test(trimmed)) return false;
  const normalized = normalizeUsername(trimmed);
  return normalized.length >= 3 && /^[a-z0-9][a-z0-9._]*[a-z0-9]$/.test(normalized);
}

/**
 * Login accepts one identifier field. Emails are detected by '@', Somali
 * phones by their normalized 9-digit national form, everything else is a
 * username. Reserved usernames are allowed here so existing accounts like
 * "superadmin" can log in; creation/rename still uses isValidUsername().
 */
export function classifyIdentifier(input: string): IdentifierKind {
  const raw = input.trim();
  if (!raw) return "invalid";

  if (raw.startsWith("@")) {
    return isUsernameShape(raw) ? "username" : "invalid";
  }

  if (raw.includes("@")) return "email";
  if (isValidSomaliPhone(raw) || isValidSomaliPhone(normalizeSomaliPhone(raw))) {
    return "phone";
  }
  if (isUsernameShape(raw)) return "username";
  return "invalid";
}

function baseFromFullName(fullName: string, role: string): string {
  if (role === "super_admin") return "superadmin";
  const cleaned = fullName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(".")
    .toLowerCase();
  const base = normalizeUsername(cleaned || (role === "teacher" ? "teacher" : "student"));
  return base.length >= 3 ? base : `${base}user`;
}

/**
 * Return a free username. A preferred handle is used as-is (or rejected by the
 * caller when taken); generated handles get a short id suffix so two people
 * with the same name can never collide.
 */
export async function allocateUsername({
  fullName,
  role,
  preferred,
  userId,
}: {
  fullName: string;
  role: string;
  preferred?: string | null;
  userId?: string;
}): Promise<string> {
  if (preferred) {
    const value = normalizeUsername(preferred);
    if (!isValidUsername(value)) {
      throw new UsernameError("Username must be 3-30 characters: a-z, 0-9, . or _");
    }
    const taken = await db.user.findUnique({ where: { username: value } });
    if (taken && taken.id !== userId) {
      throw new UsernameError("Username already taken", 409);
    }
    return value;
  }

  // Role handles are reserved for humans on purpose: only the allocator may
  // assign them, never a user picking their own handle.
  if (role === "super_admin" || role === "admin") {
    const roleHandle = role === "super_admin" ? "superadmin" : "admin";
    const taken = await db.user.findUnique({ where: { username: roleHandle } });
    if (!taken || taken.id === userId) return roleHandle;
  }

  const base = baseFromFullName(fullName, role).slice(0, 24);
  const suffix = (userId || "").replace(/[^a-z0-9]/gi, "").slice(-5).toLowerCase() || "1";
  const candidates = [`${base}.${suffix}`, `${base}${suffix}`, `${base}.${suffix}2`];

  for (const candidate of candidates) {
    const value = normalizeUsername(candidate);
    if (!isValidUsername(value)) continue;
    const taken = await db.user.findUnique({ where: { username: value } });
    if (!taken || taken.id === userId) return value;
  }

  // Extremely unlikely: fall back to a role-based handle with a random suffix.
  for (let i = 0; i < 10; i++) {
    const value = normalizeUsername(`${role}.${Date.now().toString(36)}${i}`);
    const taken = await db.user.findUnique({ where: { username: value } });
    if (!taken || taken.id === userId) return value;
  }
  throw new UsernameError("Could not allocate a unique username", 500);
}

export class UsernameError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Map UsernameError to an API error response where needed. */
export function usernameErrorResponse(error: unknown): { message: string; status: number } | null {
  if (error instanceof UsernameError) {
    return { message: error.message, status: error.status };
  }
  return null;
}

/**
 * One-time, idempotent schema guard. The production database is managed by
 * Vercel, so this makes the username column available before the first query
 * that needs it (and is a no-op on subsequent requests/instances).
 */
let schemaPromise: Promise<void> | null = null;

export function ensureUsernameSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await db.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT`;
      await db.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`;
    })().catch((error) => {
      // Allow a retry on the next request if this attempt failed.
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

const BACKFILL_ROLE_ORDER = ["super_admin", "admin", "teacher", "student"];

/**
 * Assign usernames to every account that still lacks one. Privileged role
 * handles are handled first so @superadmin and @admin go to the right people.
 */
export async function backfillUsernames(): Promise<
  Array<{ email: string; username: string }>
> {
  await ensureUsernameSchema();

  const users = await db.user.findMany({
    where: { OR: [{ username: null }, { username: "" }] },
    orderBy: { createdAt: "asc" },
  });

  const ordered = BACKFILL_ROLE_ORDER.flatMap((role) =>
    users.filter((user) => user.role === role)
  );
  ordered.push(...users.filter((user) => !BACKFILL_ROLE_ORDER.includes(user.role)));

  const assigned: Array<{ email: string; username: string }> = [];
  for (const user of ordered) {
    const username = await allocateUsername({
      fullName: user.fullName,
      role: user.role,
      userId: user.id,
    });
    await db.user.update({
      where: { id: user.id },
      data: { username },
    });
    assigned.push({ email: user.email, username });
  }
  return assigned;
}
