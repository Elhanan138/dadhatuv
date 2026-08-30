"use client";

import * as React from "react";
import {
  Area,
  ComposedChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShort } from "@/lib/utils";

const AXIS = { fontSize: 11, fill: "hsl(var(--muted-foreground))" } as const;

function TooltipBox({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div dir="rtl" className="rounded-md border bg-popover px-3 py-2 text-xs shadow-lg">
      {label != null && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="num flex items-center gap-2" style={{ color: p.color }}>
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-semibold">
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
            {suffix}
          </span>
        </p>
      ))}
    </div>
  );
}

export interface WeightPoint {
  date: string;
  weight: number | null;
  avg: number | null;
}

export function WeightChart({ data, target }: { data: WeightPoint[]; target?: number }) {
  const rows = data.map((d) => ({ ...d, label: formatShort(d.date) }));
  const values = data.flatMap((d) => [d.weight, d.avg]).filter((v): v is number => v != null);
  const min = values.length ? Math.floor(Math.min(...values, target ?? Infinity) - 1) : 0;
  const max = values.length ? Math.ceil(Math.max(...values, target ?? -Infinity) + 1) : 100;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" reversed tick={AXIS} tickLine={false} axisLine={false} minTickGap={18} />
        <YAxis
          orientation="right"
          domain={[min, max]}
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={38}
        />
        <Tooltip content={<TooltipBox suffix=" ק״ג" />} />
        {target != null && (
          <ReferenceLine
            y={target}
            stroke="hsl(var(--accent))"
            strokeDasharray="6 4"
            label={{ value: "יעד", position: "insideTopRight", fontSize: 11, fill: "hsl(var(--accent))" }}
          />
        )}
        <Area
          type="monotone"
          dataKey="weight"
          name="שקילה"
          stroke="hsl(var(--primary))"
          strokeWidth={1}
          strokeOpacity={0.45}
          fill="url(#weightFill)"
          connectNulls
          dot={{ r: 2, strokeWidth: 0, fill: "hsl(var(--primary))" }}
        />
        <Line
          type="monotone"
          dataKey="avg"
          name="ממוצע נע"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function MacroSplit({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const data = [
    { name: "חלבון", value: Math.round(protein * 4), color: "hsl(var(--primary))" },
    { name: "פחמימות", value: Math.round(carbs * 4), color: "hsl(var(--accent))" },
    { name: "שומן", value: Math.round(fat * 9), color: "hsl(var(--muted-foreground))" },
  ].filter((d) => d.value > 0);

  if (!data.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">אין נתונים להצגה עדיין.</p>;
  }

  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
      <ResponsiveContainer width={180} height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox suffix=" קק״ל" />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="w-full max-w-[220px] space-y-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="num text-muted-foreground">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface AdherencePoint {
  date: string;
  score: number;
}

export function AdherenceChart({ data }: { data: AdherencePoint[] }) {
  const rows = data.map((d) => ({ ...d, label: formatShort(d.date) }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" reversed tick={AXIS} tickLine={false} axisLine={false} minTickGap={12} />
        <YAxis orientation="right" domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} width={32} />
        <Tooltip content={<TooltipBox suffix="%" />} cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar dataKey="score" name="היצמדות" radius={[4, 4, 0, 0]}>
          {rows.map((r) => (
            <Cell
              key={r.date}
              fill={
                r.score >= 85
                  ? "hsl(var(--success))"
                  : r.score >= 60
                    ? "hsl(var(--accent))"
                    : "hsl(var(--destructive))"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function IntakeChart({
  data,
  target,
}: {
  data: { date: string; kcal: number }[];
  target: number;
}) {
  const rows = data.map((d) => ({ ...d, label: formatShort(d.date) }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" reversed tick={AXIS} tickLine={false} axisLine={false} minTickGap={12} />
        <YAxis orientation="right" tick={AXIS} tickLine={false} axisLine={false} width={42} />
        <Tooltip content={<TooltipBox suffix=" קק״ל" />} cursor={{ fill: "hsl(var(--muted))" }} />
        <ReferenceLine y={target} stroke="hsl(var(--accent))" strokeDasharray="6 4" />
        <Bar dataKey="kcal" name="צריכה" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
