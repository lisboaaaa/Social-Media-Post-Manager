"use client";

import { useState } from "react";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Device } from "./device";
import { InstagramMockup } from "./InstagramMockup";
import { LinkedInMockup } from "./LinkedInMockup";
import { XMockup } from "./XMockup";

const DEVICES: { value: Device; label: string }[] = [
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
];

export function PlatformMockup({ post }: { post: Post }) {
  const [device, setDevice] = useState<Device>("mobile");

  return (
    <div className="flex flex-col items-center gap-3">
      <div role="tablist" aria-label="Preview device" className="inline-flex items-center gap-0.5 rounded-lg border bg-background p-1">
        {DEVICES.map((d) => (
          <button
            key={d.value}
            type="button"
            role="tab"
            aria-selected={device === d.value}
            onClick={() => setDevice(d.value)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              device === d.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {post.platform === "instagram" && <InstagramMockup post={post} device={device} />}
      {post.platform === "linkedin" && <LinkedInMockup post={post} device={device} />}
      {post.platform === "x" && <XMockup post={post} device={device} />}
    </div>
  );
}
