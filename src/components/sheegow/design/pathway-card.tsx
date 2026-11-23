import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ICON_TONES, TONE_CLASSES, type DesignTone } from "./section-heading";

export function PathwayCard({
  icon: Icon,
  title,
  desc,
  cta,
  href,
  tone = "sky",
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  cta: string;
  href: string;
  tone?: DesignTone;
  onClick?: () => void;
}) {
  return (
    <Card className="card-lift group relative flex flex-col overflow-hidden rounded-2xl p-6">
      <div
        className={cn(
          "mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
          ICON_TONES[tone]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "mt-5 inline-flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
          TONE_CLASSES[tone]
        )}
      >
        {cta}
        <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
      </Link>
    </Card>
  );
}
