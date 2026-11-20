/**
 * Lightweight, privacy-friendly country detection.
 *
 * Server: Vercel/Cloudflare inject the visitor country in request headers.
 * Client: browser locale and timezone are used as a fallback — no GPS
 * permission and no third-party geolocation service required.
 *
 * The result is only used to pre-fill the display country code (+252).
 * It is never stored together with the user's phone number.
 */

export type CountrySource = "ip" | "locale" | "timezone" | "default";

export type CountryGuess = {
  /** ISO 3166-1 alpha-2, e.g. "SO". */
  country: string;
  source: CountrySource;
};

const COUNTRY_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
  "x-geo-country",
];

export function countryFromHeaders(headers: Headers): string | null {
  for (const name of COUNTRY_HEADERS) {
    const value = headers.get(name)?.trim().toUpperCase();
    if (value && value !== "XX" && /^[A-Z]{2}$/.test(value)) return value;
  }
  return null;
}

export function countryFromLocale(locale: string): string | null {
  // "so-SO", "en-SO", "so" etc.
  const match = locale.match(/[_-]([A-Za-z]{2})$/);
  if (match) return match[1].toUpperCase();
  if (/^so$/i.test(locale.trim())) return "SO";
  return null;
}

export function countryFromTimeZone(timeZone: string): string | null {
  if (/Africa\/Mogadishu/i.test(timeZone)) return "SO";
  return null;
}

/** Calling codes we support. Extend this when adding countries. */
export const CALLING_CODES: Record<string, string> = {
  SO: "+252",
};

export function callingCodeFor(country: string | null | undefined): string | null {
  if (!country) return null;
  return CALLING_CODES[country.toUpperCase()] ?? null;
}
