"use client";

import { GraduationCap, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/ui";

export interface SampleCertificateProps {
  courseTitle: string;
  studentName?: string;
  showSampleWatermark?: boolean;
}

/* Deterministic verification ID derived from the course title so the
   certificate renders identically on the server and the client (avoids
   any hydration mismatch). */
function makeVerificationId(courseTitle: string): string {
  let h = 0;
  for (let i = 0; i < courseTitle.length; i++) {
    h = (h * 31 + courseTitle.charCodeAt(i)) >>> 0;
  }
  const part = (h % 100000).toString().padStart(5, "0");
  return `SA-2024-${part}`;
}

/* Decorative corner flourish used on the inner gold border. */
function Corner({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={cn(
        "absolute h-6 w-6 text-amber-500 sm:h-9 sm:w-9",
        className,
      )}
      fill="none"
    >
      <path
        d="M3 37 L3 14 Q3 3 14 3 L37 3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="3.5" cy="37" r="2" fill="currentColor" />
      <circle cx="37" cy="3.5" r="2" fill="currentColor" />
    </svg>
  );
}

/**
 * SHEEGOW ACADEMY sample certificate preview.
 *
 * Rendered as pure HTML/CSS (no image file) so it stays crisp at any size.
 * Landscape certificate, ~3:2 on desktop, slightly taller on mobile so the
 * text breathes.
 */
export function SampleCertificate({
  courseTitle,
  studentName = "Your Name",
  showSampleWatermark = true,
}: SampleCertificateProps) {
  const verificationId = makeVerificationId(courseTitle);
  const completionDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="card-lift relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5">
      {/* Certificate body — landscape on desktop, slightly taller on mobile */}
      <div className="relative aspect-[4/3] w-full p-2.5 sm:aspect-[3/2] sm:p-4">
        {/* Outer indigo→amber gradient frame */}
        <div className="absolute inset-2.5 rounded-lg bg-gradient-to-br from-indigo-600 via-indigo-500 to-amber-500 p-[3px] sm:inset-4 sm:p-[4px]">
          <div className="relative h-full w-full rounded-md bg-white">
            {/* Inner thin gold border */}
            <div className="absolute inset-1.5 rounded-md border border-amber-300/80 sm:inset-2.5" />

            {/* Corner flourishes */}
            <Corner className="left-2 top-2 sm:left-3 sm:top-3" />
            <Corner className="right-2 top-2 scale-x-[-1] sm:right-3 sm:top-3" />
            <Corner className="left-2 bottom-2 scale-y-[-1] sm:left-3 sm:bottom-3" />
            <Corner className="right-2 bottom-2 scale-[-1] sm:right-3 sm:bottom-3" />

            {/* SAMPLE watermark */}
            {showSampleWatermark && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rotate-[-24deg] text-4xl font-black tracking-[0.25em] text-slate-300/40 sm:text-7xl">
                  SAMPLE
                </span>
              </div>
            )}

            {/* Content */}
            <div className="relative flex h-full flex-col items-center justify-between px-4 py-4 sm:px-10 sm:py-7">
              {/* Header — brand */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-md sm:h-12 sm:w-12">
                  <GraduationCap className="h-4 w-4 text-white sm:h-6 sm:w-6" />
                </div>
                <div className="text-center leading-none">
                  <div className="text-xs font-extrabold tracking-[0.25em] text-slate-800 sm:text-base">
                    SHEEGOW
                  </div>
                  <div className="text-[7px] font-semibold tracking-[0.35em] text-indigo-600 sm:text-[10px]">
                    ACADEMY
                  </div>
                </div>
              </div>

              {/* Main certificate text */}
              <div className="flex flex-col items-center text-center">
                <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-600 sm:text-xs">
                  Certificate of Completion
                </p>
                <p className="mt-2 text-[9px] text-slate-500 sm:mt-3 sm:text-xs">
                  This is to certify that
                </p>
                <p className="mt-0.5 font-serif text-base font-bold italic text-indigo-700 sm:mt-2 sm:text-3xl">
                  {studentName}
                </p>

                {/* Decorative divider */}
                <div className="mt-2 flex items-center gap-2 sm:mt-3">
                  <span className="h-px w-6 bg-amber-400 sm:w-10" />
                  <Sparkles className="h-3 w-3 text-amber-500 sm:h-4 sm:w-4" />
                  <span className="h-px w-6 bg-amber-400 sm:w-10" />
                </div>

                <p className="mt-1.5 text-[9px] text-slate-500 sm:mt-3 sm:text-xs">
                  has successfully completed
                </p>
                <p className="mt-0.5 max-w-[90%] text-xs font-bold leading-snug text-slate-900 sm:mt-1 sm:text-lg sm:leading-tight">
                  &ldquo;{courseTitle}&rdquo;
                </p>
              </div>

              {/* Footer — date / seal / signature */}
              <div className="grid w-full grid-cols-3 items-end gap-1.5 sm:gap-4">
                {/* Date */}
                <div className="text-left">
                  <div className="h-px bg-slate-300" />
                  <p className="mt-1 text-[7px] uppercase tracking-wide text-slate-500 sm:text-[10px]">
                    Date
                  </p>
                  <p className="text-[9px] font-semibold text-slate-800 sm:text-sm">
                    {completionDate}
                  </p>
                </div>

                {/* Official seal */}
                <div className="flex flex-col items-center">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg ring-2 ring-white sm:h-16 sm:w-16">
                    <GraduationCap className="h-5 w-5 text-white sm:h-8 sm:w-8" />
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow">
                      <ShieldCheck className="h-3 w-3 text-indigo-600 sm:h-4 sm:w-4" />
                    </span>
                  </div>
                  <p className="mt-1 text-[6px] font-semibold uppercase tracking-wider text-amber-700 sm:text-[9px]">
                    Official Seal
                  </p>
                </div>

                {/* Authorised by */}
                <div className="text-right">
                  <div className="h-px bg-slate-300" />
                  <p className="mt-1 text-[7px] uppercase tracking-wide text-slate-500 sm:text-[10px]">
                    Authorised by
                  </p>
                  <p className="text-[9px] font-semibold text-slate-800 sm:text-sm">
                    SHEEGOW ACADEMY
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification footer bar */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-3 py-2 sm:px-6 sm:py-3">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
          <span className="text-[10px] font-medium text-slate-600 sm:text-xs">
            Verifiable certificate
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-500 sm:text-xs">
          ID: {verificationId}
        </span>
      </div>
    </div>
  );
}

export default SampleCertificate;
