import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  decorative?: boolean;
};

function paths() {
  return (
    <>
      <path d="M24 46 L24 66 C24 74 38 80 50 80 C62 80 76 74 76 66 L76 46 L50 58 Z" fill="var(--sg-cap)" />
      <polygon
        points="50,14 96,34 50,54 4,34"
        fill="var(--sg-cap)"
        stroke="var(--sg-sep)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <polygon points="45,27 45,41 57,34" fill="var(--sg-play)" />
      <path d="M90 37 L90 62" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
      <circle cx="90" cy="67" r="5" fill="#F59E0B" />
    </>
  );
}

/** Icon-only mark. */
export function BrandMark({ className, decorative = true }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 8 100 76"
      aria-hidden={decorative}
      aria-label={decorative ? undefined : "SHEEGOW ACADEMY"}
      role={decorative ? "presentation" : "img"}
      focusable="false"
      className={cn("h-10 w-auto shrink-0", className)}
      style={
        {
          "--sg-cap": "#ffffff",
          "--sg-sep": "#4F46E5",
          "--sg-play": "#4F46E5",
        } as React.CSSProperties
      }
    >
      {paths()}
    </svg>
  );
}

export function BrandLockup({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl shadow-lg",
          onDark
            ? "bg-white/10 ring-1 ring-white/15 shadow-none"
            : "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/30"
        )}
      >
        <BrandMark
          className="h-[1.55rem] w-[1.55rem]"
          decorative
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-lg font-extrabold tracking-tight",
            onDark ? "text-white" : "text-foreground"
          )}
        >
          SHEEGOW
        </span>
        <span
          className={cn(
            "text-[10px] font-semibold tracking-[0.2em]",
            onDark ? "text-emerald-200" : "text-emerald-700 dark:text-emerald-300"
          )}
        >
          ACADEMY
        </span>
      </span>
    </span>
  );
}
