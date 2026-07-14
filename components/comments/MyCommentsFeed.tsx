"use client";

import { CommentFeedList } from "@/components/comments/CommentFeedList";
import { findRootId } from "@/lib/commentGroups";
import { mentionsProfile } from "@/lib/mentions";
import { useStore } from "@/lib/store";

export function MyCommentsFeed({
  onOpenPost,
  unreadSince,
}: {
  onOpenPost: (postId: string) => void;
  unreadSince?: string | null;
}) {
  const { comments, posts, currentUser } = useStore();

  const postComments = comments.filter((c) => c.postId !== null);
  const byId = new Map(postComments.map((c) => [c.id, c]));

  // A mention or an assigned-post reply still surfaces the whole thread,
  // anchored at its root — the mention itself may be several replies deep.
  const matches = postComments.filter((c) => {
    if (c.authorId === currentUser.id) return false;
    const post = posts.find((p) => p.id === c.postId);
    const mentionsMe = mentionsProfile(c.body, currentUser.fullName);
    const onMyPost = post?.assigneeId === currentUser.id;
    return mentionsMe || onMyPost;
  });

  const latestMatchByRoot = new Map<string, string>();
  for (const c of matches) {
    const rootId = findRootId(c, byId);
    const current = latestMatchByRoot.get(rootId);
    if (!current || c.createdAt > current) latestMatchByRoot.set(rootId, c.createdAt);
  }

  const mine = [...latestMatchByRoot.keys()]
    .map((rootId) => byId.get(rootId))
    .filter((c) => c !== undefined)
    .sort((a, b) => (latestMatchByRoot.get(b.id) ?? b.createdAt).localeCompare(latestMatchByRoot.get(a.id) ?? a.createdAt));

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Comments that mention you or your posts
      </h3>
      <CommentFeedList
        comments={mine}
        emptyMessage="Nothing here yet — you'll see comments that @mention you or land on posts assigned to you."
        onOpenPost={onOpenPost}
        unreadSince={unreadSince}
      />
    </div>
  );
}
