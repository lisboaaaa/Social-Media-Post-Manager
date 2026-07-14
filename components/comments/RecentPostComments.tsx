"use client";

import { CommentFeedList } from "@/components/comments/CommentFeedList";
import { findRootId } from "@/lib/commentGroups";
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

  // Ranked by whichever thread has the most recent activity (a reply counts,
  // not just the root comment itself), but only the root card is shown —
  // replies live collapsed under it in CommentFeedList.
  const postComments = comments.filter((c) => c.postId !== null);
  const byId = new Map(postComments.map((c) => [c.id, c]));
  const latestByRoot = new Map<string, string>();
  for (const c of postComments) {
    const rootId = findRootId(c, byId);
    const current = latestByRoot.get(rootId);
    if (!current || c.createdAt > current) latestByRoot.set(rootId, c.createdAt);
  }

  const recent = postComments
    .filter((c) => c.parentId === null)
    .sort((a, b) => (latestByRoot.get(b.id) ?? b.createdAt).localeCompare(latestByRoot.get(a.id) ?? a.createdAt))
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
