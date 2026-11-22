import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DesignTone = "indigo" | "amber" | "emerald" | "sky" | "rose";

export const TONE_CLASSES: Record<DesignTone, string> = {
  indigo:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
};

export const ICON_TONES: Record<DesignTone, string> = {
  indigo: "from-indigo-500 to-indigo-700 shadow-indigo-500/25",
  amber: "from-amber-400 to-orange-600 shadow-amber-500/25",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/25",
  sky: "from-sky-500 to-blue-600 shadow-sky-500/25",
  rose: "from-rose-500 to-pink-600 shadow-rose-500/25",
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  icon: Icon,
  tone = "indigo",
  align = "center",
  id,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: DesignTone;
  align?: "center" | "left";
  id?: string;
  className?: string;
}) {
  return (
    <div
      id={id}
      className={cn(
        "mb-12",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        className
      )}
    >
      {eyebrow ? (
        <Badge
          variant="outline"
          className={cn(
            "mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            TONE_CLASSES[tone]
          )}
        >
          {Icon ? <Icon className="h-3 w-3" /> : null}
          {eyebrow}
        </Badge>
      ) : null}
      <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
