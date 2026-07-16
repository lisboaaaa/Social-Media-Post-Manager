"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Copy, Share2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { getShareTemplate, renderShareTemplate } from "@/lib/shareTemplate";
import { CommentThread } from "@/components/comments/CommentThread";
import { DeleteReasonDialog } from "./DeleteReasonDialog";
import { PostHistoryList } from "./PostHistoryList";
import { ShareDialog } from "./ShareDialog";
import { PlatformBadge, PlatformBadgeGroup } from "./PlatformBadge";
import { PlatformMockup } from "./mockups/PlatformMockup";

export function PostPreviewModal() {
  const router = useRouter();
  const { previewPostId, openPreview, closePreview, getPostById, addPost, deletePost, profiles, categories, stages, postHistory } = useStore();
  const post = previewPostId ? getPostById(previewPostId) : undefined;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Lets a shared link (?post=<id>) open straight into this post's preview,
  // instead of only being able to link to the full edit page.
  useEffect(() => {
    const sharedPostId = new URLSearchParams(window.location.search).get("post");
    if (!sharedPostId) return;
    openPreview(sharedPostId);
    const url = new URL(window.location.href);
    url.searchParams.delete("post");
    window.history.replaceState({}, "", url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = Boolean(post);
  const assignee = post ? profiles.find((p) => p.id === post.assigneeId) : undefined;
  const statusLabel = post ? stages.find((s) => s.id === post.status)?.label : undefined;
  const postCategories = post ? categories.filter((c) => post.categoryIds.includes(c.id)) : [];

  const handleDuplicate = () => {
    if (!post) return;
    const duplicate = addPost({
      platforms: post.platforms,
      title: post.title ? `${post.title} (copy)` : "",
      descriptions: post.descriptions,
      status: stages.find((s) => s.isDefaultNewPostStage)?.id ?? stages[0]?.id ?? "backlog",
      targetDate: null,
      needsChanges: false,
      keepMedia: post.keepMedia,
      publishedUrls: { linkedin: null, instagram: null, x: null },
      assigneeId: null,
      requestedById: null,
      categoryIds: post.categoryIds,
      images: post.images.map((img) => ({ ...img, id: crypto.randomUUID(), postId: "" })),
    });
    closePreview();
    toast.success("Post duplicated — tweak it and save when ready");
    router.push(`/posts/${duplicate.id}`);
  };

  const shareMessage = (() => {
    if (!post) return "";
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/board?post=${post.id}`;
    return renderShareTemplate(getShareTemplate(), { title: post.title || "Untitled post", link });
  })();

  const handleShareCopy = (message: string) => {
    navigator.clipboard.writeText(message);
    setShareDialogOpen(false);
    toast.success("Copied! Paste it wherever you want (Slack, email…)");
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
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShareDialogOpen(true)}
                    aria-label="Share"
                    title="Copy a shareable message with a link to this post"
                  >
                    <Share2 className="size-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={handleDuplicate} aria-label="Duplicate" title="Duplicate">
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => setDeleteDialogOpen(true)}
                    aria-label="Delete"
                    title="Delete"
                  >
                    <Trash2 className="size-3.5" />
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
              {post.platforms.some((p) => post.publishedUrls[p]) && (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">
                    {post.platforms.filter((p) => post.publishedUrls[p]).length > 1 ? "Published URLs" : "Published URL"}
                  </div>
                  <div className="mt-1 flex flex-col gap-1">
                    {post.platforms
                      .filter((p) => post.publishedUrls[p])
                      .map((p) => (
                        <div key={p} className="flex min-w-0 items-center gap-1.5">
                          {post.platforms.length > 1 && <PlatformBadge platform={p} className="shrink-0" />}
                          <a
                            href={post.publishedUrls[p]!}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-primary underline underline-offset-2"
                          >
                            {post.publishedUrls[p]}
                          </a>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <CommentThread postId={post.id} />

            {postHistory.some((h) => h.postId === post.id) && (
              <>
                <Separator />
                <PostHistoryList postId={post.id} />
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
    <DeleteReasonDialog open={deleteDialogOpen} onCancel={() => setDeleteDialogOpen(false)} onConfirm={handleDeleteConfirm} />
    <ShareDialog
      open={shareDialogOpen}
      defaultMessage={shareMessage}
      onCancel={() => setShareDialogOpen(false)}
      onCopy={handleShareCopy}
    />
    </>
  );
}
