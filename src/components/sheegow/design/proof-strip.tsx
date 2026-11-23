import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICON_TONES, type DesignTone } from "./section-heading";

/**
 * Honest proof strip — only claims the school can support. No invented counts,
 * ratings or learner numbers are rendered here.
 */
export function ProofStrip({
  items,
}: {
  items: Array<{
    icon: LucideIcon;
    label: string;
    detail: string;
    tone?: DesignTone;
  }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex items-center gap-4 rounded-2xl border bg-card/80 px-5 py-4 shadow-sm backdrop-blur"
          >
            <span
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
                ICON_TONES[item.tone ?? "indigo"]
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground">
                {item.label}
              </span>
              <span className="block text-xs text-muted-foreground">
                {item.detail}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
