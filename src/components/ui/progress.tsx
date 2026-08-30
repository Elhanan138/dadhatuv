"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Meter({
  value,
  max,
  className,
  tone = "primary",
  overflowTone = "destructive",
}: {
  value: number;
  max: number;
  className?: string;
  tone?: "primary" | "accent" | "success" | "warn";
  overflowTone?: "destructive" | "accent";
}) {
  const ratio = max > 0 ? value / max : 0;
  const filled = Math.min(1, ratio);
  const over = ratio > 1;
  const toneClass =
    tone === "accent" ? "bg-accent" : tone === "success" ? "bg-success" : tone === "warn" ? "bg-warn" : "bg-primary";
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          over ? (overflowTone === "accent" ? "bg-accent" : "bg-destructive") : toneClass,
        )}
        style={{ width: `${filled * 100}%` }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 96,
  stroke = 8,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const tone = clamped >= 85 ? "hsl(var(--success))" : clamped >= 60 ? "hsl(var(--accent))" : "hsl(var(--destructive))";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num font-display text-xl font-bold leading-none">{label}</span>
        {sublabel && <span className="mt-0.5 text-[10px] text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
