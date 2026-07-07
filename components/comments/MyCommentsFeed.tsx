"use client";

import { CommentFeedList } from "@/components/comments/CommentFeedList";
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

  const mine = comments
    .filter((c) => c.postId !== null && c.authorId !== currentUser.id)
    .filter((c) => {
      const post = posts.find((p) => p.id === c.postId);
      const mentionsMe = mentionsProfile(c.body, currentUser.fullName);
      const onMyPost = post?.assigneeId === currentUser.id;
      return mentionsMe || onMyPost;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
