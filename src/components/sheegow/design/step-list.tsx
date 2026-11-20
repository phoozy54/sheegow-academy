import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ICON_TONES, type DesignTone } from "./section-heading";

/** Numbered process steps. Server-rendered, no JavaScript. */
export function StepList({
  steps,
}: {
  steps: Array<{ title: string; desc: string; tone?: DesignTone }>;
}) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2">
      {steps.map((step, index) => (
        <li key={step.title}>
          <Card className="card-lift relative h-full overflow-hidden rounded-2xl p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-md",
                  ICON_TONES[step.tone ?? "indigo"]
                )}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-foreground">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ol>
  );
}
