"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const TABS = [
  { href: "/board", label: "Board" },
  { href: "/list", label: "List" },
  { href: "/calendar", label: "Calendar" },
  { href: "/archive", label: "Archive" },
  { href: "/inbox", label: "Suggestions" },
  { href: "/trash", label: "Trash" },
];

export function ViewTabs() {
  const pathname = usePathname();
  const { suggestions } = useStore();
  const hasNewSuggestions = suggestions.some((s) => s.status === "new");
  const activeIndex = TABS.findIndex((tab) => tab.href === pathname);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const el = activeIndex >= 0 ? tabRefs.current[activeIndex] : null;
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeIndex]);

  return (
    <div role="tablist" aria-label="View" className="relative inline-flex items-center gap-0.5 rounded-lg bg-muted/50 p-1 shadow-sm">
      {indicator && (
        <div
          className="absolute inset-y-1 rounded-md bg-primary transition-[left,width] duration-300 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {TABS.map((tab, index) => {
        const active = index === activeIndex;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            aria-selected={active}
            className={cn(
              "relative z-10 inline-flex items-center rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.href === "/inbox" && hasNewSuggestions && (
              <span className="ml-1.5 size-1.5 shrink-0 rounded-full bg-destructive" aria-label="New suggestions" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
