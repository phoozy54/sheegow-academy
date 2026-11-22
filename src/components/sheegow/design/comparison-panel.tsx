import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ComparisonPanel({
  title,
  items,
  highlighted = false,
}: {
  title: string;
  items: string[];
  highlighted?: boolean;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        highlighted
          ? "border-indigo-200 bg-card shadow-lg shadow-indigo-500/10"
          : "bg-muted/40"
      )}
    >
      {highlighted ? (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-400" />
      ) : null}
      <h3
        className={cn(
          "text-lg font-bold",
          highlighted ? "text-indigo-600" : "text-foreground"
        )}
      >
        {title}
      </h3>
      <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            {highlighted ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <span className="mt-0.5 shrink-0 text-muted-foreground">—</span>
            )}
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}
