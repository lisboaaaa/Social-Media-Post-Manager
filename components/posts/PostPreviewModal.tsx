"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { POST_STATUSES } from "@/lib/types";
import { CommentThread } from "@/components/comments/CommentThread";
import { PlatformBadgeGroup } from "./PlatformBadge";
import { PlatformMockup } from "./mockups/PlatformMockup";

export function PostPreviewModal() {
  const { previewPostId, closePreview, getPostById, profiles, categories } = useStore();
  const post = previewPostId ? getPostById(previewPostId) : undefined;

  const open = Boolean(post);
  const assignee = post ? profiles.find((p) => p.id === post.assigneeId) : undefined;
  const statusLabel = post ? POST_STATUSES.find((s) => s.value === post.status)?.label : undefined;
  const postCategories = post ? categories.filter((c) => post.categoryIds.includes(c.id)) : [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closePreview()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        {post && (
          <>
            <DialogHeader>
              <div className="mb-1 flex items-center justify-between gap-2 pr-8">
                <div className="flex items-center gap-2">
                  <PlatformBadgeGroup platforms={post.platforms} />
                  {post.needsChanges && (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 font-mono text-[10px] uppercase tracking-wide">
                      Needs changes
                    </Badge>
                  )}
                  <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wide">
                    {statusLabel}
                  </Badge>
                </div>
                <Link href={`/posts/${post.id}`} onClick={closePreview} className={buttonVariants({ size: "default" })}>
                  Edit post
                </Link>
              </div>
              <DialogTitle>{post.title || "Untitled post"}</DialogTitle>
            </DialogHeader>

            <PlatformMockup post={post} />

            {postCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {postCategories.map((c) => (
                  <Badge key={c.id} variant="outline" className="text-xs font-normal">
                    {c.name}
                  </Badge>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Assignee</div>
                <div className="flex items-center gap-1.5 mt-1">
                  {assignee ? (
                    <>
                      <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px]">{assignee.initials}</AvatarFallback></Avatar>
                      {assignee.fullName}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Target date</div>
                <div className="font-mono mt-1">{post.targetDate ?? <span className="font-sans text-muted-foreground">no date</span>}</div>
              </div>
              {post.publishedUrl && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Published URL</div>
                  <div className="mt-1 truncate">
                    <a href={post.publishedUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                      {post.publishedUrl}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <CommentThread postId={post.id} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
