"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Archive, BarChart3, Calendar, Columns3, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const TABS = [
  { href: "/board", label: "Board", icon: Columns3 },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/inbox", label: "Suggestions", icon: Inbox },
];

export function ViewTabs() {
  const pathname = usePathname();
  const { suggestions, lastReadSuggestionsAt } = useStore();
  const hasNewSuggestions = suggestions.some(
    (s) => s.status === "new" && (lastReadSuggestionsAt === null || s.createdAt > lastReadSuggestionsAt),
  );
  const activeIndex = TABS.findIndex((tab) => tab.href === pathname);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const el = activeIndex >= 0 ? tabRefs.current[activeIndex] : null;
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeIndex]);

  return (
    <div
      role="tablist"
      aria-label="View"
      className="scrollbar-hide relative flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted/50 p-1 shadow-sm"
    >
      {indicator && (
        <div
          className="absolute inset-y-1 rounded-md bg-primary transition-[left,width] duration-300 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {TABS.map((tab, index) => {
        const active = index === activeIndex;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            aria-selected={active}
            title={tab.label}
            className={cn(
              "relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3.5",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4 sm:hidden" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.href === "/inbox" && hasNewSuggestions && (
              <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-label="New suggestions" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
