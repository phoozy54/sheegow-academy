/**
 * G2 / PW-1 — single source of truth for password policy.
 *
 * Pure module (no DB, no cookies, no secrets) so it can be unit-tested and
 * shared by every server route and the admin client. Previously four different
 * rules existed (12+complexity, 12 only, 6 only) which allowed weak passwords.
 */

export const MIN_PASSWORD_LENGTH = 12;

export type PasswordCheck = { ok: true } | { ok: false; error: string };

export const PASSWORD_LENGTH_ERROR =
  "Password must be at least 12 characters";
export const PASSWORD_COMPLEXITY_ERROR =
  "Password must include at least 3 of: uppercase, lowercase, numbers, and special characters";

/** Length 12 + at least 3 of: upper, lower, digit, special. */
export function validatePassword(password: string): PasswordCheck {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: PASSWORD_LENGTH_ERROR };
  }
  let classes = 0;
  if (/[A-Z]/.test(password)) classes++;
  if (/[a-z]/.test(password)) classes++;
  if (/[0-9]/.test(password)) classes++;
  if (/[^A-Za-z0-9]/.test(password)) classes++;
  if (classes < 3) return { ok: false, error: PASSWORD_COMPLEXITY_ERROR };
  return { ok: true };
}

/** Reuse check for an authenticated password change. */
export function validateNewPassword(
  currentPassword: string,
  newPassword: string
): PasswordCheck {
  if (newPassword === currentPassword) {
    return {
      ok: false,
      error: "New password must be different from the current one",
    };
  }
  return validatePassword(newPassword);
}
