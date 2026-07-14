"use client";

import { useState } from "react";
import { findRootId, groupByDay } from "@/lib/commentGroups";
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

  const byId = new Map(threadComments.map((c) => [c.id, c]));
  const topLevel = threadComments.filter((c) => !c.parentId);
  const repliesByRoot = new Map<string, Comment[]>();
  for (const comment of threadComments) {
    if (!comment.parentId) continue;
    const rootId = findRootId(comment, byId);
    const list = repliesByRoot.get(rootId) ?? [];
    list.push(comment);
    repliesByRoot.set(rootId, list);
  }

  const groups = groupByDay(topLevel);

  const authorName = (comment: Comment) => {
    const author = profiles.find((p) => p.id === comment.authorId);
    return comment.authorId === currentUser.id ? "you" : (author?.fullName ?? "Unknown");
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Comments {threadComments.length > 0 && `(${threadComments.length})`}
      </h3>
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-3">
            <DateSeparator label={group.label} />
            {group.items.map((comment) => {
              const replies = repliesByRoot.get(comment.id) ?? [];
              return (
                <div key={comment.id} className="flex flex-col gap-2">
                  <CommentItem comment={comment} onReply={setReplyingTo} />
                  {replies.length > 0 && (
                    <div className="ml-8 flex flex-col gap-2 border-l-2 border-muted pl-3">
                      {replies.map((reply) => {
                        const parent = reply.parentId ? byId.get(reply.parentId) : undefined;
                        // Nesting already shows what this replies to when it's
                        // the root comment — only spell it out when replying
                        // to another reply further down the same thread.
                        const showParentLabel = parent && parent.id !== comment.id;
                        return (
                          <CommentItem
                            key={reply.id}
                            comment={reply}
                            parentAuthorName={showParentLabel ? authorName(parent!) : undefined}
                            onReply={setReplyingTo}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
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
