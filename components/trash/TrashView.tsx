"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PlatformBadgeGroup } from "@/components/posts/PlatformBadge";
import { useStore } from "@/lib/store";

export function TrashView() {
  const { posts, profiles, openPreview, restorePost } = useStore();
  const trashed = posts
    .filter((p) => p.deletedAt)
    .sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));

  if (trashed.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Trash is empty.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {trashed.length} post{trashed.length === 1 ? "" : "s"} in Trash
      </p>

      {trashed.map((post) => {
        const deletedBy = profiles.find((p) => p.id === post.deletedBy);
        return (
          <div key={post.id} className="flex flex-col gap-2 rounded-lg border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={() => openPreview(post.id)} className="flex flex-col gap-1.5 text-left">
                <div className="flex items-center gap-1.5">
                  <PlatformBadgeGroup platforms={post.platforms} />
                  <span className="font-medium">{post.title || "Untitled post"}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Deleted by {deletedBy?.fullName ?? "Unknown"}
                  {post.deletedAt && ` · ${format(new Date(post.deletedAt), "MMM d, yyyy 'at' HH:mm")}`}
                </p>
              </button>
              <Button type="button" variant="outline" size="lg" onClick={() => restorePost(post.id)}>
                Restore
              </Button>
            </div>
            {post.deleteReason && (
              <p className="rounded-md bg-muted/50 p-2.5 text-sm text-foreground/90">{post.deleteReason}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
