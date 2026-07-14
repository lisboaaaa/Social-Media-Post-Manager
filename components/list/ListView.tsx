"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpDown, CalendarDays, ChevronDown, FileText, ImageOff, Pencil, Play, Radio, Tag, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlatformBadgeGroup } from "@/components/posts/PlatformBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { Post, PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRID_COLS = "grid-cols-[48px_1fr_190px_160px_110px_160px_32px]";

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
  const { filteredPosts, profiles, categories, stages, openPreview } = useStore();
  const [collapsed, setCollapsed] = useState<Set<PostStatus>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const today = format(new Date(), "yyyy-MM-dd");

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
            <SelectValue>{(value: SortKey) => SORT_OPTIONS.find((o) => o.value === value)?.label}</SelectValue>
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

      <div className={cn("grid gap-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-foreground/70", GRID_COLS)}>
        <span />
        <span className="flex items-center gap-1"><FileText className="size-3" />Post</span>
        <span className="flex items-center gap-1"><Radio className="size-3" />Platform</span>
        <span className="flex items-center gap-1"><UserRound className="size-3" />Assignee</span>
        <span className="flex items-center gap-1"><CalendarDays className="size-3" />Date</span>
        <span className="flex items-center gap-1"><Tag className="size-3" />Category</span>
        <span />
      </div>

      {stages.map((stage) => {
        const rows = filteredPosts.filter((p) => p.status === stage.id).sort(SORTERS[sortKey]);
        const isCollapsed = collapsed.has(stage.id);

        return (
          <div key={stage.id} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => toggleCollapsed(stage.id)}
              className="flex w-fit items-center gap-1.5 text-base font-semibold"
            >
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
              {stage.label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[11px] font-medium",
                  stage.isArchiveStage
                    ? "bg-emerald-100 text-emerald-700"
                    : stage.isReviewStage
                      ? "bg-amber-100 text-amber-700"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {rows.length}
              </span>
            </button>
            {!isCollapsed && (
              <div className="flex flex-col gap-2">
                <div className="h-px bg-border" />
                <div className="overflow-hidden rounded-lg bg-background shadow-sm">
                {rows.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">No posts in this stage.</p>
                ) : (
                    rows.map((post) => {
                      const assignee = profiles.find((p) => p.id === post.assigneeId);
                      const postCategories = categories.filter((c) => post.categoryIds.includes(c.id));
                      const cover = post.images[0];
                      const isOverdue = post.targetDate !== null && post.targetDate < today && !stage.requiresPublishedUrl && !stage.locksEditing;

                      return (
                        <div
                          key={post.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openPreview(post.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openPreview(post.id);
                            }
                          }}
                          className={cn(
                            "group grid w-full cursor-pointer items-center gap-3 border-b px-4 py-2 text-left text-sm last:border-b-0 hover:bg-muted/40",
                            GRID_COLS,
                            isOverdue && "bg-red-50",
                          )}
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                            {cover ? (
                              cover.mediaType === "video" ? (
                                <span className="relative flex h-full w-full items-center justify-center bg-black/10">
                                  <Play className="size-3.5 fill-foreground/70 text-foreground/70" />
                                </span>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={cover.imageUrl} alt="" className="h-full w-full object-cover" />
                              )
                            ) : (
                              <ImageOff className="size-3.5" />
                            )}
                          </span>
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium">{post.title || "Untitled post"}</span>
                            {post.needsChanges && (
                              <span className="size-2.5 shrink-0 rounded-full bg-amber-500" title="Needs changes" />
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
                          <span className={cn(isOverdue ? "font-semibold text-red-600" : "text-muted-foreground")}>
                            {post.targetDate ? format(new Date(`${post.targetDate}T00:00:00`), "MMM d") : "—"}
                          </span>
                          <span className="truncate text-muted-foreground">
                            {postCategories.length > 0 ? postCategories.map((c) => c.name).join(", ") : "—"}
                          </span>
                          <Link
                            href={`/posts/${post.id}`}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Edit post"
                            title="Edit post"
                            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 hover:bg-background hover:text-foreground group-hover:opacity-100"
                          >
                            <Pencil className="size-3.5" />
                          </Link>
                        </div>
                      );
                    })
                )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
