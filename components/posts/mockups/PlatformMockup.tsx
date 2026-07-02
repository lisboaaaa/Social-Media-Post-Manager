"use client";

import { useState } from "react";
import { PLATFORM_LABELS, type Platform, type Post } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Device } from "./device";
import { InstagramMockup } from "./InstagramMockup";
import { LinkedInMockup } from "./LinkedInMockup";
import { XMockup } from "./XMockup";

const DEVICES: { value: Device; label: string }[] = [
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
];

function SegmentedToggle<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex items-center gap-0.5 rounded-lg border bg-background p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === o.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PlatformMockup({ post }: { post: Post }) {
  const [device, setDevice] = useState<Device>("mobile");
  const [platform, setPlatform] = useState<Platform>(post.platforms[0]);

  const activePlatform = post.platforms.includes(platform) ? platform : post.platforms[0];
  const description = post.descriptions[activePlatform] ?? "";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {post.platforms.length > 1 && (
          <SegmentedToggle
            ariaLabel="Preview platform"
            options={post.platforms.map((p) => ({ value: p, label: PLATFORM_LABELS[p] }))}
            value={activePlatform}
            onChange={setPlatform}
          />
        )}
        <SegmentedToggle ariaLabel="Preview device" options={DEVICES} value={device} onChange={setDevice} />
      </div>

      {activePlatform === "instagram" && <InstagramMockup post={post} description={description} device={device} />}
      {activePlatform === "linkedin" && <LinkedInMockup post={post} description={description} device={device} />}
      {activePlatform === "x" && <XMockup post={post} description={description} device={device} />}
    </div>
  );
}
