"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlatformBadgeGroup } from "@/components/posts/PlatformBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { POST_STATUSES, type Post, type PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRID_COLS = "grid-cols-[1fr_190px_160px_110px_160px]";

const SORT_OPTIONS = [
  { value: "default", label: "Default order" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "targetDate", label: "Publish date" },
  { value: "createdAt", label: "Created on" },
  { value: "updatedAt", label: "Last modified" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];

const SORTERS: Record<SortKey, (a: Post, b: Post) => number> = {
  default: () => 0,
  alphabetical: (a, b) => (a.title || "Untitled post").localeCompare(b.title || "Untitled post"),
  targetDate: (a, b) => (a.targetDate ?? "9999-99-99").localeCompare(b.targetDate ?? "9999-99-99"),
  createdAt: (a, b) => a.createdAt.localeCompare(b.createdAt),
  updatedAt: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
};

export function ListView() {
  const { filteredPosts, profiles, categories, openPreview } = useStore();
  const [collapsed, setCollapsed] = useState<Set<PostStatus>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("default");

  const toggleCollapsed = (status: PostStatus) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  if (filteredPosts.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No posts match these filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 self-end">
        <ArrowUpDown className="size-3.5 text-muted-foreground" />
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger size="sm" className="min-w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {POST_STATUSES.map(({ value, label }) => {
        const rows = filteredPosts.filter((p) => p.status === value).sort(SORTERS[sortKey]);
        if (rows.length === 0) return null;
        const isCollapsed = collapsed.has(value);

        return (
          <div key={value} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => toggleCollapsed(value)}
              className="flex w-fit items-center gap-1.5 text-base font-semibold"
            >
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
              {label}
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                {rows.length}
              </span>
            </button>
            {!isCollapsed && (
              <div className="overflow-hidden rounded-lg bg-background shadow-sm">
                <div className={cn("grid gap-3 border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground", GRID_COLS)}>
                  <span>Post</span>
                  <span>Platform</span>
                  <span>Assignee</span>
                  <span>Date</span>
                  <span>Category</span>
                </div>
                {rows.map((post) => {
                  const assignee = profiles.find((p) => p.id === post.assigneeId);
                  const postCategories = categories.filter((c) => post.categoryIds.includes(c.id));
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => openPreview(post.id)}
                      className={cn("grid w-full items-center gap-3 border-b px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted/40", GRID_COLS)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{post.title || "Untitled post"}</span>
                        {post.needsChanges && (
                          <span className="size-1.5 shrink-0 rounded-full bg-amber-500" title="Needs changes" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <PlatformBadgeGroup platforms={post.platforms} />
                      </span>
                      <span className="flex items-center gap-1.5 truncate text-muted-foreground">
                        {assignee ? (
                          <>
                            <Avatar size="sm" title={assignee.fullName}>
                              <AvatarFallback className="text-[9px]">{assignee.initials}</AvatarFallback>
                            </Avatar>
                            <span className="truncate">{assignee.fullName}</span>
                          </>
                        ) : (
                          "Unassigned"
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {post.targetDate ? format(new Date(`${post.targetDate}T00:00:00`), "MMM d") : "—"}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {postCategories.length > 0 ? postCategories.map((c) => c.name).join(", ") : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
