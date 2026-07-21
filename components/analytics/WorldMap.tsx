"use client";

import { useMemo, useState } from "react";
import worldDotMap from "@/lib/analytics/worldDotMap.json";
import { COUNTRY_COORDINATES } from "@/lib/analytics/countryCoordinates";

const { width: MAP_WIDTH, height: MAP_HEIGHT, dots } = worldDotMap as { width: number; height: number; dots: [number, number][] };

// Same plain equirectangular formula scripts/generate-world-dot-map.mjs used
// to project the background dots — markers have to land in the same space.
function project(lat: number, lon: number): [number, number] {
  return [((lon + 180) / 360) * MAP_WIDTH, ((90 - lat) / 180) * MAP_HEIGHT];
}

interface CountryGroup {
  key: string;
  label: string;
  sessions: number;
  users: number;
}

const MIN_MARKER_RADIUS = 3;
const MAX_MARKER_RADIUS = 15;
// A single country would otherwise zoom to a sliver — floor the viewport at
// roughly a small-region size, and always keep the base 2:1 aspect ratio
// (matching the projection) so nothing looks stretched.
const MIN_VIEW_WIDTH = 220;
const VIEW_PADDING = 60;

// Sessions encode by area (sqrt of value), not radius directly — the usual
// proportional-symbol-map convention, since radius-linear scaling makes the
// bigger dots visually dominate far more than their actual share.
function radiusFor(sessions: number, maxSessions: number): number {
  return MIN_MARKER_RADIUS + (MAX_MARKER_RADIUS - MIN_MARKER_RADIUS) * Math.sqrt(sessions / maxSessions);
}

export function WorldMap({ groups }: { groups: CountryGroup[] }) {
  const [hovered, setHovered] = useState<{ x: number; y: number; label: string; sessions: number } | null>(null);

  const markers = useMemo(() => {
    return groups
      .map((g) => {
        const coords = COUNTRY_COORDINATES[g.label];
        if (!coords) return null;
        const [x, y] = project(coords[0], coords[1]);
        return { ...g, x, y };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [groups]);

  const maxSessions = Math.max(1, ...markers.map((m) => m.sessions));

  const view = useMemo(() => {
    if (markers.length === 0) return { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT };

    const xs = markers.map((m) => m.x);
    const ys = markers.map((m) => m.y);
    let x0 = Math.min(...xs) - VIEW_PADDING;
    let y0 = Math.min(...ys) - VIEW_PADDING;
    let w = Math.max(...xs) - Math.min(...xs) + VIEW_PADDING * 2;
    let h = Math.max(...ys) - Math.min(...ys) + VIEW_PADDING * 2;

    if (w < MIN_VIEW_WIDTH) {
      x0 -= (MIN_VIEW_WIDTH - w) / 2;
      w = MIN_VIEW_WIDTH;
    }
    const minH = MIN_VIEW_WIDTH / 2;
    if (h < minH) {
      y0 -= (minH - h) / 2;
      h = minH;
    }

    // Grow the shorter side to keep a 2:1 ratio rather than cropping/stretching.
    if (w / h > 2) {
      const targetH = w / 2;
      y0 -= (targetH - h) / 2;
      h = targetH;
    } else if (w / h < 2) {
      const targetW = h * 2;
      x0 -= (targetW - w) / 2;
      w = targetW;
    }

    // Don't pan past the map's own edges.
    x0 = Math.max(0, Math.min(x0, MAP_WIDTH - w));
    y0 = Math.max(0, Math.min(y0, MAP_HEIGHT - h));

    return { x: x0, y: y0, w, h };
  }, [markers]);

  if (markers.length === 0) return null;

  return (
    <div className="rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where sessions come from</span>
        <span className="text-[10px] text-muted-foreground">bigger dot = more sessions</span>
      </div>
      <div className="relative">
        <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} className="w-full" style={{ aspectRatio: "2 / 1" }}>
          <g className="fill-primary/25">
            {dots.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={0.9} />
            ))}
          </g>
          {markers.map((m) => (
            <circle
              key={m.key}
              cx={m.x}
              cy={m.y}
              r={radiusFor(m.sessions, maxSessions)}
              className="cursor-pointer fill-[var(--chart-5)] stroke-background transition-opacity"
              strokeWidth={1}
              fillOpacity={hovered?.label === m.label ? 1 : 0.85}
              onPointerEnter={() => setHovered({ x: m.x, y: m.y, label: m.label, sessions: m.sessions })}
              onPointerLeave={() => setHovered(null)}
            >
              <title>
                {m.label}: {m.sessions} sessions
              </title>
            </circle>
          ))}
        </svg>
        {hovered && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-md"
            style={{ left: `${((hovered.x - view.x) / view.w) * 100}%`, top: `${((hovered.y - view.y) / view.h) * 100}%` }}
          >
            <div className="font-medium text-popover-foreground">{hovered.label}</div>
            <div className="text-muted-foreground">{hovered.sessions} sessions</div>
          </div>
        )}
      </div>
    </div>
  );
}
