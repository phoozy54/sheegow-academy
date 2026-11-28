"use client";

/**
 * SHEEGOW ACADEMY — lightweight i18n via React Context.
 *
 * Why custom and not next-intl routing?
 *   The task spec asked us NOT to restructure routes (no [locale] segments),
 *   so we keep locale state client-side (localStorage + <html lang/dir>) and
 *   expose a simple `t(key)` helper via Context. next-intl is installed but
 *   unused for routing — we only use the React Context pattern.
 *
 * SSR safety (G1):
 *   - layout.tsx reads the `sheegow_locale` cookie and renders the whole tree
 *     in that locale, so there is no English flash and no RTL layout flip.
 *   - A nonce'd inline script keeps <html lang/dir/data-locale> in sync before
 *     first paint.
 *   - The provider uses useSyncExternalStore with the cookie-derived locale
 *     as BOTH the server and initial client snapshot — hydration matches.
 *   - The non-React `t` helper reads a module-level `currentLocale` that is
 *     initialised from the cookie on the client only (never on the server,
 *     where a module-level value would leak across requests).
 */

import * as React from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_META,
  translations,
  type Locale,
} from "./translations";

/* ------------------------------------------------------------------ */
/*  Module-level current locale                                        */
/* ------------------------------------------------------------------ */

/**
 * Module-level mirror of the active locale. Kept in sync by the provider
 * on the client so the standalone `t` helper can read it from outside
 * React (e.g. inside utility functions that are not hooks).
 *
 * On the server this stays at the default locale forever, which is fine
 * because the server always renders the default-locale strings.
 */
let currentLocale: Locale = DEFAULT_LOCALE;

/**
 * Translate a key for the *current* locale. Usable anywhere — inside or
 * outside React components. Falls back to English, then to the key itself.
 *
 * An optional `params` map performs simple `{placeholder}` substitution:
 *   t("greet", { name: "Asha" }) with "greet": "Hi {name}" → "Hi Asha".
 * Missing placeholders are left untouched; non-string values are stringified.
 *
 * NOTE: on the server this always returns the English string. Components
 * that need to render with a specific locale should use the `useT()` hook
 * from a client component instead, which respects the user's preference.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  return applyParams(translate(currentLocale, key), params);
}

/** Replace `{name}` placeholders with values from `params`. */
function applyParams(
  str: string,
  params?: Record<string, string | number>
): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(params, name)) {
      return String(params[name]);
    }
    return match;
  });
}

/** Internal lookup with English fallback + key fallback. */
function translate(locale: Locale, key: string): string {
  return (
    translations[locale]?.[key] ??
    translations[DEFAULT_LOCALE]?.[key] ??
    key
  );
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface I18nContextValue {
  /** Active locale. Always a valid Locale. */
  locale: Locale;
  /** Switch the active locale (also persists to localStorage + sets <html lang/dir>). */
  setLocale: (locale: Locale) => void;
  /** Translation function bound to the active locale.
   *  Accepts optional `{placeholder: value}` params for simple substitution. */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** True until the provider has read localStorage on the client. */
  hydrated: boolean;
  /** Whether the current locale renders RTL. */
  isRtl: boolean;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "sheegow.locale";
const COOKIE_KEY = "sheegow_locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const LOCALE_EVENT = "sheegow:locale";

function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (value === "en" || value === "so" || value === "ar")
  );
}

/** Read locale from localStorage if present and valid; otherwise default. */
function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* localStorage may be disabled (private mode, SSR safety, etc.) */
  }
  return DEFAULT_LOCALE;
}

/**
 * The inline bootstrap script in layout.tsx sets data-locale from the cookie
 * before first paint. useSyncExternalStore uses that attribute as the client
 * snapshot; the server snapshot is the same cookie-derived locale.
 */
function getClientLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const fromDom = document.documentElement.getAttribute("data-locale");
  if (isLocale(fromDom)) return fromDom;
  // Fallback when the bootstrap script was blocked: read the cookie directly.
  try {
    const part = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${COOKIE_KEY}=`));
    const fromCookie = part?.slice(COOKIE_KEY.length + 1);
    if (isLocale(fromCookie)) return fromCookie;
  } catch {
    /* cookie access disabled */
  }
  // Deliberately NO localStorage fallback: SSR used the cookie (or English),
  // so the client snapshot must match it. Legacy localStorage preferences are
  // migrated to the cookie after hydration in the provider's mount effect.
  return DEFAULT_LOCALE;
}

function subscribeLocale(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    // Another tab changed the preference. The DOM attribute is our store's
    // snapshot — update it BEFORE notifying React so the value actually changes.
    if (event.key === STORAGE_KEY && isLocale(event.newValue)) {
      document.documentElement.setAttribute("data-locale", event.newValue);
    }
    onChange();
  };
  window.addEventListener(LOCALE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LOCALE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Persist locale and update <html lang> + <html dir> + data-locale. */
function applyLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof document === "undefined") return;
  const meta = LOCALE_META[locale];
  document.documentElement.lang = locale;
  document.documentElement.dir = meta.dir;
  document.documentElement.setAttribute("data-locale", locale);
}

function publishLocale() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(LOCALE_EVENT));
  }
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  // Both snapshots start from the cookie-derived locale supplied by the
  // server, so hydration renders identical markup and strings.
  const locale = React.useSyncExternalStore(
    subscribeLocale,
    getClientLocale,
    () => initialLocale,
  );
  const [hydrated, setHydrated] = React.useState(false);

  // Client-only initialisation of the standalone t() mirror. Never do this
  // on the server: a module-level value would leak across requests.
  const initialised = React.useRef(false);
  if (!initialised.current && typeof window !== "undefined") {
    initialised.current = true;
    currentLocale = initialLocale;
  }

  const setLocale = React.useCallback((next: Locale) => {
    applyLocale(next);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next);
        // The cookie is what the server reads on the next request. Non-sensitive
        // preference only — no HttpOnly needed here.
        const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
        document.cookie = `${COOKIE_KEY}=${next}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
      }
    } catch {
      /* ignore quota / privacy errors */
    }
    publishLocale();
  }, []);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    // Safe to apply unconditionally: the inline script already set the same
    // lang/dir, and this also keeps the standalone t() mirror in sync.
    applyLocale(locale);
  }, [locale]);

  React.useEffect(() => {
    // One-time migration for users who chose a locale before the cookie
    // existed. Doing this AFTER hydration avoids a mismatch: SSR rendered
    // English, the first client render matches English, then we switch.
    if (typeof window === "undefined") return;
    const hasCookie = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .some((entry) => entry.startsWith(`${COOKIE_KEY}=`));
    if (hasCookie) return;
    const stored = readStoredLocale();
    if (stored !== DEFAULT_LOCALE) setLocale(stored);
  }, [setLocale]);

  const value = React.useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: string, params?: Record<string, string | number>) =>
        applyParams(translate(locale, key), params),
      hydrated,
      isRtl: LOCALE_META[locale].dir === "rtl",
    }),
    [locale, setLocale, hydrated],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/** Full i18n context: locale, setLocale, t, hydrated, isRtl. */
export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside an <I18nProvider>");
  }
  return ctx;
}

/** Convenience hook that returns just the `t` function bound to the active locale. */
export function useT(): (key: string, params?: Record<string, string | number>) => string {
  return useI18n().t;
}

/* ------------------------------------------------------------------ */
/*  Re-exports                                                         */
/* ------------------------------------------------------------------ */

export {
  DEFAULT_LOCALE,
  LOCALE_META,
  LOCALES,
  translations,
  type Locale,
} from "./translations";
