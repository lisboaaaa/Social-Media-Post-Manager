interface BarItem {
  key: string;
  label: string;
  value: number;
  color?: string;
}

// Magnitude comparison — bars square at the baseline (left), rounded only at
// the data-end (right), same fixed hue unless a per-item color is given
// (only for platform, whose colors are an already-established identity, not
// an arbitrary categorical assignment).
export function BarList({ items }: { items: BarItem[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.key} className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-muted-foreground">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-md bg-muted">
            <div
              className="h-full rounded-r-[4px] bg-primary"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
