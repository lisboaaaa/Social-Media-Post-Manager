"use client";

import { useState } from "react";
import { groupByDay } from "@/lib/commentGroups";
import { useStore } from "@/lib/store";
import type { Comment } from "@/lib/types";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import { DateSeparator } from "./DateSeparator";

export function CommentThread({ postId }: { postId: string }) {
  const { comments, profiles, currentUser, addComment } = useStore();
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const threadComments = comments
    .filter((c) => c.postId === postId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const groups = groupByDay(threadComments);

  const authorName = (comment: Comment) => {
    const author = profiles.find((p) => p.id === comment.authorId);
    return comment.authorId === currentUser.id ? "you" : (author?.fullName ?? "Unknown");
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Comments {threadComments.length > 0 && `(${threadComments.length})`}
      </h3>
      {threadComments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet on this post.</p>
      )}
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-3">
            <DateSeparator label={group.label} />
            {group.items.map((comment) => {
              const parent = comment.parentId ? threadComments.find((c) => c.id === comment.parentId) : undefined;
              return (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  parentAuthorName={parent ? authorName(parent) : undefined}
                  onReply={setReplyingTo}
                />
              );
            })}
          </div>
        ))}
      </div>
      <CommentForm
        onSubmit={(body) => {
          addComment(postId, body, replyingTo?.id ?? null);
          setReplyingTo(null);
        }}
        placeholder="Leave feedback on this post…"
        replyingTo={replyingTo ? { label: authorName(replyingTo), onCancel: () => setReplyingTo(null) } : null}
      />
    </div>
  );
}
