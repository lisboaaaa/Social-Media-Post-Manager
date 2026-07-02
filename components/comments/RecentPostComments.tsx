"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlatformBadgeGroup } from "@/components/posts/PlatformBadge";
import { isCommentUnread, useStore } from "@/lib/store";

const MAX_RECENT = 8;

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentPostComments({
  onOpenPost,
  unreadSince,
}: {
  onOpenPost: (postId: string) => void;
  unreadSince?: string | null;
}) {
  const { comments, posts, profiles, currentUser } = useStore();

  const recent = comments
    .filter((c) => c.postId !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_RECENT);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Latest comments on posts
      </h3>
      {recent.length === 0 && <p className="text-sm text-muted-foreground">No comments on any post yet.</p>}
      <div className="flex flex-col gap-1">
        {recent.map((comment) => {
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
    </div>
  );
}
