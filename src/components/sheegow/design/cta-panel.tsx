import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CtaPanel({
  eyebrow = "Live classes",
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("pb-16 lg:pb-24", className)}>
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 px-6 py-10 text-center shadow-2xl shadow-emerald-500/30 sm:px-12 sm:py-14 lg:px-16 lg:py-16">
        <div className="hero-mesh absolute inset-0 opacity-40" />
        <div className="relative">
          <Badge
            variant="outline"
            className="mb-4 inline-flex items-center gap-1.5 border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur"
          >
            <Sparkles className="h-3 w-3" /> {eyebrow}
          </Badge>
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="mx-auto mt-4 max-w-xl text-emerald-100">
              {description}
            </p>
          ) : null}
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
