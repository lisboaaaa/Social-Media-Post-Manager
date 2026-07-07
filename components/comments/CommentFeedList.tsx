"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlatformBadgeGroup } from "@/components/posts/PlatformBadge";
import { isCommentUnread, useStore } from "@/lib/store";
import type { Comment } from "@/lib/types";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CommentFeedList({
  comments,
  emptyMessage,
  onOpenPost,
  unreadSince,
}: {
  comments: Comment[];
  emptyMessage: string;
  onOpenPost: (postId: string) => void;
  unreadSince?: string | null;
}) {
  const { posts, profiles, currentUser } = useStore();

  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {comments.map((comment) => {
        const post = posts.find((p) => p.id === comment.postId);
        const author = profiles.find((p) => p.id === comment.authorId);
        if (!post) return null;
        const isUnread = unreadSince !== undefined && isCommentUnread(comment, currentUser.id, unreadSince);

        return (
          <button
            key={comment.id}
            onClick={() => onOpenPost(post.id)}
            className="flex flex-col gap-1.5 rounded-md p-2 text-left hover:bg-muted"
          >
            <div className="flex items-center gap-1.5">
              <PlatformBadgeGroup platforms={post.platforms} />
              <span className="truncate text-xs text-muted-foreground">{post.title}</span>
            </div>
            <div className="flex gap-2">
              <Avatar size="sm" className="mt-0.5">
                <AvatarFallback className="text-[9px]">{author?.initials ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  {isUnread && <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-label="Unread" />}
                  <span className="text-sm font-medium">{author?.fullName ?? "Unknown"}</span>
                  <span className="font-mono text-[10.5px] text-muted-foreground">{formatWhen(comment.createdAt)}</span>
                </div>
                <p className="line-clamp-2 text-sm text-foreground/90">{comment.body}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
