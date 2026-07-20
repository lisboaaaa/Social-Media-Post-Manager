import { cn } from "@/lib/utils";
import { PLATFORM_LABELS, type Platform } from "@/lib/types";

const PLATFORM_STYLES: Record<Platform, string> = {
  linkedin: "text-[#0A66C2] bg-[#EAF2FC]",
  instagram: "text-[#C2185B] bg-[#FDEAF2]",
  x: "text-neutral-900 bg-neutral-200",
};

// Background-only, for tinting a larger area (e.g. a calendar entry) by
// platform rather than just the small text badge itself.
export const PLATFORM_BG_CLASSES: Record<Platform, string> = {
  linkedin: "bg-[#EAF2FC]",
  instagram: "bg-[#FDEAF2]",
  x: "bg-neutral-200",
};

// The saturated brand hue itself (matches PLATFORM_STYLES' text color above)
// — for a chart mark, which needs a solid fill rather than the pale badge tint.
export const PLATFORM_ACCENT_HEX: Record<Platform, string> = {
  linkedin: "#0A66C2",
  instagram: "#C2185B",
  x: "#171717",
};

export function PlatformBadge({
  platform,
  className,
  labelClassName,
}: {
  platform: Platform;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
        PLATFORM_STYLES[platform],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className={labelClassName}>{PLATFORM_LABELS[platform]}</span>
    </span>
  );
}

export function PlatformBadgeGroup({
  platforms,
  className,
  badgeClassName,
}: {
  platforms: Platform[];
  className?: string;
  badgeClassName?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {platforms.map((platform) => (
        <PlatformBadge key={platform} platform={platform} className={badgeClassName} />
      ))}
    </div>
  );
}
