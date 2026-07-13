"use client";

import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlatformBadgeGroup } from "@/components/posts/PlatformBadge";
import { useStore } from "@/lib/store";
import { POST_STATUSES } from "@/lib/types";

export function ListView() {
  const { filteredPosts, profiles, categories, openPreview } = useStore();

  if (filteredPosts.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No posts match these filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {POST_STATUSES.map(({ value, label }) => {
        const rows = filteredPosts.filter((p) => p.status === value);
        if (rows.length === 0) return null;

        return (
          <div key={value} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              {label}
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                {rows.length}
              </span>
            </h2>
            <div className="overflow-hidden rounded-lg bg-background shadow-sm">
              <div className="grid grid-cols-[1fr_160px_110px_160px] gap-3 border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Post</span>
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
                    className="grid w-full grid-cols-[1fr_160px_110px_160px] items-center gap-3 border-b px-4 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted/40"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <PlatformBadgeGroup platforms={post.platforms} />
                      <span className="truncate font-medium">{post.title || "Untitled post"}</span>
                      {post.needsChanges && (
                        <span className="size-1.5 shrink-0 rounded-full bg-amber-500" title="Needs changes" />
                      )}
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
          </div>
        );
      })}
    </div>
  );
}
