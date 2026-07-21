import type { ReactNode } from "react";

interface ShareItem {
  key: string;
  label: string;
  value: number;
  color?: string;
  icon?: ReactNode;
}

// One proportional bar (fixed height, always a single row no matter how
// many items) plus a compact wrapping legend — replaces a one-row-per-item
// list, which grew a card taller forever as more categories/devices/etc.
// got added. Caller is expected to have already capped `items` (see
// capGroups in AnalyticsView) — this renders whatever it's given as-is.
export function ShareBar({ items }: { items: ShareItem[] }) {
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {items.map((item) => (
          <div
            key={item.key}
            className="h-full bg-primary first:rounded-l-full last:rounded-r-full"
            style={{ width: `${Math.max((item.value / total) * 100, 1.5)}%`, backgroundColor: item.color }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {items.map((item) => (
          <span key={item.key} className="flex min-w-0 items-center gap-1 text-xs">
            {item.icon ? (
              <span className="flex size-3.5 shrink-0 items-center justify-center text-muted-foreground" style={{ color: item.color }}>
                {item.icon}
              </span>
            ) : (
              <span className="size-2 shrink-0 rounded-full bg-primary" style={{ backgroundColor: item.color }} />
            )}
            <span className="truncate text-muted-foreground">{item.label}</span>
            <span className="shrink-0 font-medium tabular-nums">{item.value.toLocaleString()}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
