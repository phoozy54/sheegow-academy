"use client";

/**
 * SHEEGOW ACADEMY — language toggle (EN / SO / AR).
 *
 * Uses the custom React-Context i18n from `@/lib/i18n`. Selecting a locale:
 *   - persists the preference to localStorage
 *   - sets <html lang> + <html dir> (rtl for Arabic) via the provider
 *
 * Desktop: Globe icon + current locale code + native label.
 * Mobile: just the Globe icon (kept compact so it fits beside the hamburger).
 */

import { Check, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LOCALE_META, LOCALES, useI18n, type Locale } from "@/lib/i18n";

interface LanguageToggleProps {
  /** When true, hide the textual label and only show the globe icon. */
  compact?: boolean;
  className?: string;
}

export function LanguageToggle({
  compact = false,
  className,
}: LanguageToggleProps) {
  const { locale, setLocale, hydrated } = useI18n();

  // Render with a stable label until hydrated so SSR + first client render
  // match (avoids hydration warnings). After mount the real locale shows.
  const displayLocale: Locale = hydrated ? locale : "en";
  const meta = LOCALE_META[displayLocale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Change language"
          className={cn(
            "gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          {!compact && (
            <span className="hidden sm:inline">{meta.nativeLabel}</span>
          )}
          <span className={cn("uppercase", compact ? "sm:inline" : "sm:hidden")}>
            {displayLocale}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Language / Luqadda / اللغة
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((loc) => {
          const m = LOCALE_META[loc];
          const active = loc === displayLocale;
          return (
            <DropdownMenuItem
              key={loc}
              onSelect={() => setLocale(loc)}
              className="cursor-pointer justify-between gap-2"
              aria-checked={active}
              role="menuitemradio"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="text-base leading-none">
                  {m.flag}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">
                    {m.nativeLabel}
                  </span>
                  <span className="text-xs text-muted-foreground leading-tight">
                    {m.label}
                  </span>
                </span>
              </span>
              {active && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
