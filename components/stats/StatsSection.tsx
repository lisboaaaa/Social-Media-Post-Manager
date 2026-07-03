import type { ReactNode } from "react";

interface StatsSectionProps {
  title: string;
  color: string;
  children: ReactNode;
}

// Shared card chrome for every chart block — the colored dot next to the
// title keys the chart's single hue, standing in for a legend (one series
// per chart, so a legend box would just restate the title).
export function StatsSection({ title, color, children }: StatsSectionProps) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h3 className="mb-3 flex items-center gap-2 text-base font-medium">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
        {title}
      </h3>
      {children}
    </div>
  );
}
