import * as React from "react";
import { cn } from "@/lib/utils";
import { Meter } from "@/components/ui/progress";

export function Stat({
  label,
  value,
  unit,
  target,
  tone = "primary",
  hint,
  className,
}: {
  label: string;
  value: number;
  unit?: string;
  target?: number;
  tone?: "primary" | "accent" | "success" | "warn";
  hint?: string;
  className?: string;
}) {
  const remaining = target != null ? Math.round(target - value) : null;
  return (
    <div className={cn("rounded-lg border bg-card p-3", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {target != null && (
          <span className="num text-[11px] text-muted-foreground">
            / {Math.round(target)}
            {unit}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num font-display text-2xl font-bold leading-none">{Math.round(value)}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {target != null && (
        <>
          <Meter value={value} max={target} className="mt-2" tone={tone} />
          <p className="num mt-1.5 text-[11px] text-muted-foreground">
            {remaining! >= 0 ? `נותרו ${remaining}${unit ?? ""}` : `חריגה של ${Math.abs(remaining!)}${unit ?? ""}`}
          </p>
        </>
      )}
      {hint && !target && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
