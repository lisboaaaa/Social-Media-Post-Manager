import { PLATFORM_LIMITS, type Platform } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CharacterCounter({ platform, length }: { platform: Platform; length: number }) {
  const limit = PLATFORM_LIMITS[platform];
  const over = length > limit;

  return (
    <span className={cn("font-mono text-[11px] tabular-nums text-muted-foreground", over && "text-destructive font-semibold")}>
      {length} / {limit}
      {over && " — over limit"}
    </span>
  );
}
