"use client";

import { useState, type PointerEvent } from "react";

interface Point {
  date: string;
  value: number;
}

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = { top: 10, right: 12, bottom: 22, left: 40 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

// Rounds a max value up to a clean axis ceiling (1/2/5/10 × a power of ten),
// so gridline labels read as round numbers instead of "173.4".
function niceMax(value: number): number {
  const v = Math.max(value, 1);
  const magnitude = 10 ** Math.floor(Math.log10(v));
  for (const step of [1, 2, 5, 10]) {
    if (v <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

// A single-series line chart — no legend needed (one color, and the title
// already names what's plotted), just a crosshair + tooltip on hover.
export function TrendChart({ points, label }: { points: Point[]; label: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <p className="text-xs text-muted-foreground">Not enough days of data yet to plot a trend.</p>
      </div>
    );
  }

  const max = niceMax(Math.max(...points.map((p) => p.value)));
  const xFor = (i: number) => PADDING.left + (i / (points.length - 1)) * PLOT_WIDTH;
  const yFor = (v: number) => PADDING.top + PLOT_HEIGHT - (v / max) * PLOT_HEIGHT;
  const linePoints = points.map((p, i) => `${xFor(i)},${yFor(p.value)}`).join(" ");
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));

  const handleMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = (relX - PADDING.left) / PLOT_WIDTH;
    const index = Math.round(ratio * (points.length - 1));
    setHoverIndex(Math.min(Math.max(index, 0), points.length - 1));
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full text-primary"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke="currentColor"
                className="text-muted-foreground/20"
                strokeWidth={1}
              />
              <text x={PADDING.left - 6} y={yFor(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground" fontSize={9}>
                {t.toLocaleString()}
              </text>
            </g>
          ))}
          <text x={xFor(0)} y={HEIGHT - 6} textAnchor="start" className="fill-muted-foreground" fontSize={9}>
            {points[0].date}
          </text>
          <text x={xFor(points.length - 1)} y={HEIGHT - 6} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
            {points[points.length - 1].date}
          </text>
          <polyline
            points={linePoints}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {hoverIndex !== null && hovered && (
            <>
              <line
                x1={xFor(hoverIndex)}
                x2={xFor(hoverIndex)}
                y1={PADDING.top}
                y2={HEIGHT - PADDING.bottom}
                stroke="currentColor"
                className="text-muted-foreground/40"
                strokeWidth={1}
              />
              <circle cx={xFor(hoverIndex)} cy={yFor(hovered.value)} r={4} fill="currentColor" className="stroke-background" strokeWidth={2} />
            </>
          )}
        </svg>
        {hovered && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-md"
            style={{ left: `${(xFor(hoverIndex) / WIDTH) * 100}%`, top: `${(yFor(hovered.value) / HEIGHT) * 100}%` }}
          >
            <div className="font-medium text-popover-foreground">{hovered.value.toLocaleString()}</div>
            <div className="text-muted-foreground">{hovered.date}</div>
          </div>
        )}
      </div>
    </div>
  );
}
