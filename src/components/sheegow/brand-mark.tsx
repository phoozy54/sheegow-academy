import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  decorative?: boolean;
};

/** Icon-only mark — graduation cap + play button + amber tassel. */
export function BrandMark({ className, decorative = true }: BrandMarkProps) {
  return (
    <img
      src="/icon.svg"
      alt={decorative ? "" : "SHEEGOW ACADEMY"}
      aria-hidden={decorative}
      role={decorative ? "presentation" : "img"}
      className={cn("h-10 w-10 shrink-0 rounded-xl object-cover pointer-events-none select-none", className)}
      draggable={false}
    />
  );
}

/**
 * Full brand lockup: icon + "SHEEGOW ACADEMY" text.
 * Clicking anywhere on it (icon or text) navigates to home.
 * The entire component is wrapped in a Link by the parent (navbar/footer),
 * but we also make the icon clickable directly via pointer-events-none on
 * the img so the parent Link receives the click.
 */
export function BrandLockup({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5 cursor-pointer select-none", className)}>
      <img
        src="/icon.svg"
        alt=""
        aria-hidden="true"
        className="h-10 w-10 shrink-0 rounded-xl shadow-lg object-cover pointer-events-none"
        draggable={false}
      />
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
            onDark ? "text-indigo-200" : "text-indigo-700 dark:text-indigo-300"
          )}
        >
          ACADEMY
        </span>
      </span>
    </span>
  );
}
