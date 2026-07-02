"use client";

import { useStore } from "@/lib/store";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";

export function CommentThread({ postId }: { postId: string }) {
  const { comments, addComment } = useStore();
  const threadComments = comments
    .filter((c) => c.postId === postId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Comments {threadComments.length > 0 && `(${threadComments.length})`}
      </h3>
      {threadComments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet on this post.</p>
      )}
      <div className="flex flex-col gap-3">
        {threadComments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>
      <CommentForm onSubmit={(body) => addComment(postId, body)} placeholder="Leave feedback on this post…" />
    </div>
  );
}
