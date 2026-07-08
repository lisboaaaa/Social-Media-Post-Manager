"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { POST_STATUSES } from "@/lib/types";
import { CommentThread } from "@/components/comments/CommentThread";
import { DeleteReasonDialog } from "./DeleteReasonDialog";
import { PlatformBadgeGroup } from "./PlatformBadge";
import { PlatformMockup } from "./mockups/PlatformMockup";

export function PostPreviewModal() {
  const router = useRouter();
  const { previewPostId, closePreview, getPostById, addPost, deletePost, profiles, categories } = useStore();
  const post = previewPostId ? getPostById(previewPostId) : undefined;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const open = Boolean(post);
  const assignee = post ? profiles.find((p) => p.id === post.assigneeId) : undefined;
  const statusLabel = post ? POST_STATUSES.find((s) => s.value === post.status)?.label : undefined;
  const postCategories = post ? categories.filter((c) => post.categoryIds.includes(c.id)) : [];

  const handleDuplicate = () => {
    if (!post) return;
    const duplicate = addPost({
      platforms: post.platforms,
      title: post.title ? `${post.title} (copy)` : "",
      descriptions: post.descriptions,
      status: "backlog",
      targetDate: null,
      needsChanges: false,
      publishedUrl: null,
      assigneeId: null,
      requestedById: null,
      categoryIds: post.categoryIds,
      images: post.images.map((img) => ({ ...img, id: crypto.randomUUID(), postId: "" })),
    });
    closePreview();
    toast.success("Post duplicated — tweak it and save when ready");
    router.push(`/posts/${duplicate.id}`);
  };

  const handleDeleteConfirm = (reason: string) => {
    if (!post) return;
    deletePost(post.id, reason);
    setDeleteDialogOpen(false);
    closePreview();
    toast.success("Post moved to Trash");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && closePreview()}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        {post && (
          <>
            <DialogHeader>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 pr-8">
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
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={handleDuplicate}>
                    <Copy className="size-3.5" />
                    Duplicate
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                  <Link href={`/posts/${post.id}`} onClick={closePreview} className={buttonVariants({ size: "default" })}>
                    Edit post
                  </Link>
                </div>
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
                <div className="mt-1 font-medium">
                  {post.targetDate ? (
                    format(new Date(`${post.targetDate}T00:00:00`), "MMM d, yyyy")
                  ) : (
                    <span className="font-normal text-muted-foreground">No date</span>
                  )}
                </div>
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
    <DeleteReasonDialog open={deleteDialogOpen} onCancel={() => setDeleteDialogOpen(false)} onConfirm={handleDeleteConfirm} />
    </>
  );
}
