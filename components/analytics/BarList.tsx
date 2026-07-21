import type { ReactNode } from "react";

interface BarItem {
  key: string;
  label: string;
  value: number;
  color?: string;
  icon?: ReactNode;
}

// Magnitude comparison — a fully-rounded pill (not a squared-off corporate
// bar), same fixed hue unless a per-item color is given (only for platform,
// whose colors are an already-established identity, not an arbitrary
// categorical assignment). An optional icon gives each row a bit of
// identity without touching the encoding itself.
export function BarList({ items }: { items: BarItem[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              {item.icon && (
                <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground" style={{ color: item.color }}>
                  {item.icon}
                </span>
              )}
              {item.label}
            </span>
            <span className="shrink-0 font-medium tabular-nums text-muted-foreground">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-3.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((item.value / max) * 100, 4)}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
