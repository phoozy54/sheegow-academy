import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ICON_TONES, type DesignTone } from "./section-heading";

export function FeatureTile({
  icon: Icon,
  title,
  desc,
  tone = "emerald",
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  tone?: DesignTone;
}) {
  return (
    <Card className="card-lift group relative overflow-hidden rounded-2xl p-6">
      <div
        className={cn(
          "mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
          ICON_TONES[tone]
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
    </Card>
  );
}
