import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { TrafficLight } from "@/lib/types";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground",
        green: "border-transparent bg-success/12 text-success",
        yellow: "border-transparent bg-warn/15 text-warn",
        red: "border-transparent bg-destructive/12 text-destructive",
        outline: "text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

const LIGHT_TEXT: Record<TrafficLight, string> = { green: "ירוק", yellow: "צהוב", red: "אדום" };

export function LightDot({ light, className }: { light: TrafficLight; className?: string }) {
  return (
    <span
      title={LIGHT_TEXT[light]}
      aria-label={`קטגוריה ${LIGHT_TEXT[light]}`}
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        light === "green" && "bg-success",
        light === "yellow" && "bg-warn",
        light === "red" && "bg-destructive",
        className,
      )}
    />
  );
}

export function LightBadge({ light }: { light: TrafficLight }) {
  return <Badge variant={light}>{LIGHT_TEXT[light]}</Badge>;
}
