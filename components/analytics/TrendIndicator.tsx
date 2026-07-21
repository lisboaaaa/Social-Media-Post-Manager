import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Week-over-week change — a jump from zero would be a meaningless "∞%", so
// with no prior-week activity to compare against this shows a plain dash
// (matching the "—" used elsewhere for N/A) instead of silently rendering
// nothing, which reads as "broken" rather than "no baseline yet".
export function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-xs text-muted-foreground">—</span>;

  const change = ((current - previous) / previous) * 100;
  const isFlat = Math.abs(change) < 1;
  const isUp = change > 0;

  if (isFlat) return <span className="text-xs text-muted-foreground">flat</span>;

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", isUp ? "text-emerald-600" : "text-red-600")}>
      {isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(change).toFixed(0)}%
    </span>
  );
}
