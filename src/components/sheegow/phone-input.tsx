"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import {
  callingCodeFor,
  countryFromLocale,
  countryFromTimeZone,
} from "@/lib/location";
import {
  isValidSomaliPhone,
  normalizeSomaliPhone,
  SOMALI_COUNTRY_CODE,
} from "@/lib/phone";
import { cn } from "@/lib/ui";

interface PhoneInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
  onBlur?: () => void;
  required?: boolean;
}

/**
 * Somali phone field with an auto-detected country calling code.
 *
 * The +252 prefix is display-only: onChange always emits the normalized
 * 9-digit national number, which is what we persist. Location is detected
 * from edge headers, then browser locale/timezone, with a safe default.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  placeholder = "63 408 5151",
  disabled,
  autoComplete = "tel",
  className,
  onBlur,
  required,
}: PhoneInputProps) {
  const [source, setSource] = useState<"ip" | "locale" | "default">("default");

  useEffect(() => {
    let active = true;
    api
      .location()
      .then((result) => {
        if (!active) return;
        const localeCountry = countryFromLocale(navigator.language);
        const timeZoneCountry = countryFromTimeZone(
          Intl.DateTimeFormat().resolvedOptions().timeZone
        );
        // Only Somalia is supported; callingCodeFor guards future countries.
        const detected =
          result.country || localeCountry || timeZoneCountry || "SO";
        if (callingCodeFor(detected) === SOMALI_COUNTRY_CODE) {
          setSource(result.country ? "ip" : localeCountry ? "locale" : "default");
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Only flag a wrong prefix early; don't show red while the user is still
  // typing the first digit.
  const prefix = value.slice(0, 2);
  const invalid =
    (prefix.length === 2 && !/^(61|63|65)$/.test(prefix)) ||
    (value.length === 9 && !isValidSomaliPhone(value));

  const sourceLabel =
    source === "ip"
      ? "detected from your location"
      : source === "locale"
        ? "from your browser"
        : "default for Somalia";

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center gap-1 rounded-l-md border-r border-input bg-muted/50 px-2.5 text-xs font-semibold text-foreground">
          <span aria-hidden>🇸🇴</span>
          <span>{SOMALI_COUNTRY_CODE}</span>
        </div>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(normalizeSomaliPhone(e.target.value))}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          maxLength={20}
          className={cn("pl-[84px]", invalid && "border-red-400", className)}
        />
      </div>
      {invalid ? (
        <p className="text-xs text-red-600">
          Number must start with 61, 63 or 65 and have 9 digits.
        </p>
      ) : (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {SOMALI_COUNTRY_CODE} {sourceLabel} · saved without the code
        </p>
      )}
    </div>
  );
}
