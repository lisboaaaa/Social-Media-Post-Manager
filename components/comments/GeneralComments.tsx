"use client";

import { useStore } from "@/lib/store";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";

export function GeneralComments({ unreadSince }: { unreadSince?: string | null }) {
  const { comments, addComment } = useStore();
  const generalComments = comments
    .filter((c) => c.postId === null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">General notes</h3>
      <div className="flex flex-col gap-3">
        {generalComments.length === 0 && (
          <p className="text-sm text-muted-foreground">No general notes yet.</p>
        )}
        {generalComments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} unreadSince={unreadSince} />
        ))}
      </div>
      <CommentForm onSubmit={(body) => addComment(null, body)} placeholder="Share a note with the team…" />
    </div>
  );
}
