interface BarListRow {
  key: string;
  label: string;
  count: number;
}

interface BarListChartProps {
  rows: BarListRow[];
  color: string;
  emptyMessage?: string;
  ranked?: boolean;
}

// A horizontal bar list: track in --muted, fill in the given accent hue,
// value as a tinted pill at the tip. No legend needed — every row carries
// its own text label, so color never has to do identity work on its own.
export function BarListChart({ rows, color, emptyMessage = "No data yet", ranked = false }: BarListChartProps) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  if (rows.length === 0) {
    return <div className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="flex flex-col gap-3.5">
      {rows.map((row, i) => {
        const pct = (row.count / max) * 100;
        return (
          <div key={row.key} className="flex items-center gap-3">
            {ranked && (
              <div
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ backgroundColor: `${color}1f`, color }}
              >
                {i + 1}
              </div>
            )}
            <div className="w-24 shrink-0 truncate text-sm font-medium text-foreground/80" title={row.label}>
              {row.label}
            </div>
            <div className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <div
              className="min-w-8 shrink-0 rounded-full px-2 py-0.5 text-center text-sm font-semibold tabular-nums"
              style={{ backgroundColor: `${color}1f`, color }}
            >
              {row.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
