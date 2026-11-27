import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  decorative?: boolean;
};

/** Icon-only mark — uses the uploaded logo image. */
export function BrandMark({ className, decorative = true }: BrandMarkProps) {
  return (
    <img
      src="/logo.jpeg"
      alt={decorative ? "" : "SHEEGOW ACADEMY"}
      aria-hidden={decorative}
      role={decorative ? "presentation" : "img"}
      className={cn("h-10 w-auto shrink-0 object-contain", className)}
    />
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
          "flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-lg",
          onDark
            ? "bg-white/10 ring-1 ring-white/15 shadow-none"
            : "bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-500/30"
        )}
      >
        <img
          src="/logo.jpeg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
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
            onDark ? "text-indigo-200" : "text-indigo-700 dark:text-indigo-300"
          )}
        >
          ACADEMY
        </span>
      </span>
    </span>
  );
}
