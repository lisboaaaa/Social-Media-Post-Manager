import { useId } from "react";
import type { WeeklyActivityPoint } from "@/lib/stats";

interface WeeklyTrendChartProps {
  points: WeeklyActivityPoint[];
  color: string;
}

const WIDTH = 440;
const HEIGHT = 140;
const PAD_X = 10;
const PAD_TOP = 24;
const PLOT_HEIGHT = 72;
const BASELINE_Y = PAD_TOP + PLOT_HEIGHT;

// A minimal line + area trend, single series so no legend is needed. Each
// point carries an invisible larger hit target with a native <title> tooltip
// — enough interactivity for a small in-modal chart without custom JS state.
export function WeeklyTrendChart({ points, color }: WeeklyTrendChartProps) {
  const gradientId = useId();
  if (points.length === 0) return null;

  const max = Math.max(1, ...points.map((p) => p.count));
  const plotWidth = WIDTH - PAD_X * 2;
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    ...p,
    x: PAD_X + i * stepX,
    y: BASELINE_Y - (p.count / max) * PLOT_HEIGHT,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const lastCoord = coords[coords.length - 1];
  const firstCoord = coords[0];
  const areaPath = `${linePath} L ${lastCoord.x.toFixed(1)} ${BASELINE_Y} L ${firstCoord.x.toFixed(1)} ${BASELINE_Y} Z`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Posts created per week, last 10 weeks">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0.5, 1].map((frac) => (
        <line
          key={frac}
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={BASELINE_Y - PLOT_HEIGHT * frac}
          y2={BASELINE_Y - PLOT_HEIGHT * frac}
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      <line x1={PAD_X} y1={BASELINE_Y} x2={WIDTH - PAD_X} y2={BASELINE_Y} stroke="var(--muted-foreground)" strokeOpacity={0.4} strokeWidth={1} />
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c) => (
        <g key={c.weekStart}>
          <circle cx={c.x} cy={c.y} r={12} fill="transparent">
            <title>{`${c.label}: ${c.count} post${c.count === 1 ? "" : "s"}`}</title>
          </circle>
          {c === lastCoord && <circle cx={c.x} cy={c.y} r={4.5} fill={color} stroke="var(--card)" strokeWidth={2.5} />}
        </g>
      ))}
      <text x={lastCoord.x} y={lastCoord.y - 12} textAnchor="end" fontSize={14} fontWeight={700} style={{ fill: "var(--foreground)" }}>
        {lastCoord.count}
      </text>
      <text x={PAD_X} y={HEIGHT - 4} textAnchor="start" fontSize={11} style={{ fill: "var(--foreground)", opacity: 0.6 }}>
        {firstCoord.label}
      </text>
      <text x={WIDTH - PAD_X} y={HEIGHT - 4} textAnchor="end" fontSize={11} style={{ fill: "var(--foreground)", opacity: 0.6 }}>
        {lastCoord.label}
      </text>
    </svg>
  );
}
