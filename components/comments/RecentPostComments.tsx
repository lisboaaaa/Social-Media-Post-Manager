"use client";

import { CommentFeedList } from "@/components/comments/CommentFeedList";
import { useStore } from "@/lib/store";

const MAX_RECENT = 8;

export function RecentPostComments({
  onOpenPost,
  unreadSince,
}: {
  onOpenPost: (postId: string) => void;
  unreadSince?: string | null;
}) {
  const { comments } = useStore();

  const recent = comments
    .filter((c) => c.postId !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_RECENT);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Latest comments on posts
      </h3>
      <CommentFeedList
        comments={recent}
        emptyMessage="No comments on any post yet."
        onOpenPost={onOpenPost}
        unreadSince={unreadSince}
      />
    </div>
  );
}
