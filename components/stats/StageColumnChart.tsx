interface StageColumnRow {
  key: string;
  label: string;
  shortLabel: string;
  count: number;
}

interface StageColumnChartProps {
  rows: StageColumnRow[];
  color: string;
}

const WIDTH = 440;
const HEIGHT = 180;
const PAD_X = 12;
const PAD_TOP = 26;
const PAD_BOTTOM = 34;

// Top-rounded, square-baseline column path (mark spec: 4px rounded data-end,
// square at the baseline) — an SVG <rect rx> would round all four corners.
function topRoundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  const radius = Math.max(0, Math.min(r, w / 2, h));
  if (radius === 0) return `M ${x} ${y + h} L ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} Z`;
  return `M ${x} ${y + h} L ${x} ${y + radius} Q ${x} ${y} ${x + radius} ${y} L ${x + w - radius} ${y} Q ${x + w} ${y} ${x + w} ${y + radius} L ${x + w} ${y + h} Z`;
}

// A vertical column chart for the workflow stages — deliberately a different
// shape from the ranked bar list used for categories, so the two charts read
// as distinct rather than the same widget repeated with a new color.
export function StageColumnChart({ rows, color }: StageColumnChartProps) {
  const baseline = HEIGHT - PAD_BOTTOM;
  const plotHeight = baseline - PAD_TOP;
  const max = Math.max(1, ...rows.map((r) => r.count));
  const slotWidth = (WIDTH - PAD_X * 2) / rows.length;
  const barWidth = Math.min(30, slotWidth * 0.5);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Posts by workflow stage">
      {[0.5, 1].map((frac) => (
        <line
          key={frac}
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={baseline - plotHeight * frac}
          y2={baseline - plotHeight * frac}
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      <line x1={PAD_X} x2={WIDTH - PAD_X} y1={baseline} y2={baseline} stroke="var(--muted-foreground)" strokeOpacity={0.4} strokeWidth={1} />
      {rows.map((row, i) => {
        const centerX = PAD_X + slotWidth * (i + 0.5);
        const hasValue = row.count > 0;
        const barHeight = hasValue ? Math.max(4, (row.count / max) * plotHeight) : 2;
        const x = centerX - barWidth / 2;
        const y = baseline - barHeight;
        return (
          <g key={row.key}>
            <title>{`${row.label}: ${row.count} post${row.count === 1 ? "" : "s"}`}</title>
            <path d={topRoundedRectPath(x, y, barWidth, barHeight, 4)} fill={color} opacity={hasValue ? 1 : 0.3} />
            <text x={centerX} y={y - 8} textAnchor="middle" fontSize={13} fontWeight={700} style={{ fill: "var(--foreground)" }}>
              {row.count}
            </text>
            <text x={centerX} y={baseline + 19} textAnchor="middle" fontSize={12} style={{ fill: "var(--foreground)", opacity: 0.75 }}>
              {row.shortLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
