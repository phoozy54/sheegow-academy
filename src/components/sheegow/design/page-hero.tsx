import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TONE_CLASSES, type DesignTone } from "./section-heading";

/** Shared marketing page hero. Always renders exactly one H1. */
export function PageHero({
  eyebrow,
  title,
  lead,
  icon: Icon,
  tone = "emerald",
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  icon?: LucideIcon;
  tone?: DesignTone;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-emerald-50/70 to-background dark:from-emerald-950/30">
      <div className="hero-mesh absolute inset-0 opacity-70" />
      <div className="relative mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        {eyebrow ? (
          <Badge
            variant="outline"
            className={cn(
              "mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              TONE_CLASSES[tone]
            )}
          >
            {Icon ? <Icon className="h-3 w-3" /> : null}
            {eyebrow}
          </Badge>
        ) : null}
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        {lead ? (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {lead}
          </p>
        ) : null}
        {children ? (
          <div className="mt-8 flex flex-wrap items-center gap-3">{children}</div>
        ) : null}
      </div>
    </section>
  );
}

export function ContentSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-12">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}
