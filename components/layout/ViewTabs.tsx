"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const TABS = [
  { href: "/board", label: "Board" },
  { href: "/calendar", label: "Calendar" },
  { href: "/archive", label: "Archive" },
  { href: "/inbox", label: "Suggestions" },
];

export function ViewTabs() {
  const pathname = usePathname();
  const { suggestions } = useStore();
  const hasNewSuggestions = suggestions.some((s) => s.status === "new");

  return (
    <div role="tablist" aria-label="View" className="inline-flex items-center gap-0.5 rounded-lg border bg-background p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex items-center rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
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
