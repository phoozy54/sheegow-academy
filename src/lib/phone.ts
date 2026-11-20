/**
 * Somali mobile phone helpers.
 *
 * We store only the 9-digit national number (e.g. "634085151").
 * The "+252" country code is a display/detail derived from location —
 * it is never persisted with the user's number.
 */

export const SOMALI_COUNTRY_CODE = "+252";
export const SOMALI_PREFIXES = ["61", "63", "65"] as const;

const SOMALI_NUMBER = /^(61|63|65)\d{7}$/;

/**
 * Strip everything except digits, then remove a leading country code or
 * trunk "0" so we always end up with the 9-digit national number.
 * Examples:
 *   "+252 63 4085151" -> "634085151"
 *   "252634085151"    -> "634085151"
 *   "0634085151"      -> "634085151"
 *   "63-408-5151"     -> "634085151"
 */
export function normalizeSomaliPhone(input: string): string {
  let digits = input.replace(/\D/g, "");

  if (digits.startsWith("252")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);

  // Keep only the first 9 digits — users sometimes paste extra text.
  return digits.slice(0, 9);
}

export function isValidSomaliPhone(input: string): boolean {
  return SOMALI_NUMBER.test(normalizeSomaliPhone(input));
}

/** Display-only formatting: "634085151" -> "63 408 5151". */
export function formatSomaliPhone(input: string): string {
  const digits = normalizeSomaliPhone(input);
  if (!SOMALI_NUMBER.test(digits)) return input.trim();
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

/** Display-only, with country code: "+252 63 408 5151". */
export function formatSomaliPhoneWithCode(input: string): string {
  const digits = normalizeSomaliPhone(input);
  if (!SOMALI_NUMBER.test(digits)) return input.trim();
  return `${SOMALI_COUNTRY_CODE} ${formatSomaliPhone(digits)}`;
}

export function phonePrefix(input: string): string {
  return normalizeSomaliPhone(input).slice(0, 2);
}
