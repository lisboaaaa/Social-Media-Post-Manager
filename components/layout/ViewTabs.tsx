"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/board", label: "Board" },
  { href: "/calendar", label: "Calendar" },
  { href: "/archive", label: "Archive" },
];

export function ViewTabs() {
  const pathname = usePathname();

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
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
