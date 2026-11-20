import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ICON_TONES, type DesignTone } from "./section-heading";

export function ContactCard({
  icon: Icon,
  title,
  tone = "indigo",
  children,
}: {
  icon: LucideIcon;
  title: string;
  tone?: DesignTone;
  children: ReactNode;
}) {
  return (
    <Card className="card-lift flex flex-col rounded-2xl p-6">
      <span
        className={cn(
          "mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
          ICON_TONES[tone]
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <div className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </Card>
  );
}
