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
 * SSR safety:
 *   - On the server we always render with the default locale ("en") and
 *     default dir ("ltr"); we render the same on the first client render to
 *     avoid hydration mismatches, then switch after `useEffect` reads
 *     localStorage.
 *   - The non-React `t` helper below reads from a module-level variable
 *     (`currentLocale`) that the provider keeps in sync on the client. On
 *     the server it always returns the English (or key) string.
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

/** Persist locale and update <html lang> + <html dir>. */
function applyLocale(locale: Locale) {
  currentLocale = locale;
  if (typeof document === "undefined") return;
  const meta = LOCALE_META[locale];
  document.documentElement.lang = locale;
  document.documentElement.dir = meta.dir;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Always render the default locale on the server and on the first client
  // render to avoid hydration mismatches; we switch to the stored locale
  // inside useEffect below.
  const [locale, setLocaleState] = React.useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = React.useState(false);

  // On mount (client only), read the stored preference and apply it.
  React.useEffect(() => {
    const stored = readStoredLocale();
    if (stored !== DEFAULT_LOCALE) {
      setLocaleState(stored);
    }
    applyLocale(stored);
    setHydrated(true);
  }, []);

  // Keep <html lang/dir> + module-level `currentLocale` in sync whenever
  // locale changes after hydration.
  React.useEffect(() => {
    if (!hydrated) return;
    applyLocale(locale);
  }, [locale, hydrated]);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      /* ignore quota / privacy errors */
    }
    applyLocale(next);
  }, []);

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
