"use client";

import { useState } from "react";
import { ChevronDown, CornerUpLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlatformBadgeGroup } from "@/components/posts/PlatformBadge";
import { findRootId } from "@/lib/commentGroups";
import { isCommentUnread, useStore } from "@/lib/store";
import type { Comment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import { CommentReactions } from "./CommentReactions";

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
  const { posts, profiles, currentUser, comments: allComments, addComment } = useStore();
  const [replyBoxId, setReplyBoxId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const byId = new Map(allComments.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-2.5">
      {comments.map((comment) => {
        const post = posts.find((p) => p.id === comment.postId);
        const author = profiles.find((p) => p.id === comment.authorId);
        if (!post) return null;
        const isUnread = unreadSince !== undefined && isCommentUnread(comment, currentUser.id, unreadSince);
        const replies = allComments
          .filter((c) => c.id !== comment.id && c.postId === comment.postId && findRootId(c, byId) === comment.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const isExpanded = expandedId === comment.id;

        return (
          <div key={comment.id} className="flex flex-col gap-2 rounded-lg border bg-background p-3 shadow-sm transition-shadow hover:shadow-md">
            <button type="button" onClick={() => onOpenPost(post.id)} className="flex flex-col gap-2 text-left">
              <div className="flex items-center gap-1.5">
                <PlatformBadgeGroup platforms={post.platforms} />
                <span className="truncate text-xs text-muted-foreground">{post.title}</span>
              </div>
              <div className="flex gap-2">
                <Avatar size="sm" className="mt-0.5">
                  <AvatarFallback className="text-[9px]">{author?.initials ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="flex min-w-0 items-center gap-1.5">
                      {isUnread && <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-label="Unread" />}
                      <span className="truncate text-sm font-medium">{author?.fullName ?? "Unknown"}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs font-medium text-muted-foreground">
                      {formatWhen(comment.createdAt)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-foreground/90">{comment.body}</p>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-2 pl-9">
              <CommentReactions commentId={comment.id} />
              <button
                type="button"
                onClick={() => setReplyBoxId(replyBoxId === comment.id ? null : comment.id)}
                className="flex items-center gap-1 rounded px-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <CornerUpLeft className="size-3" />
                Reply
              </button>
              {replies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : comment.id)}
                  className="flex items-center gap-1 rounded px-1 text-xs font-medium text-primary hover:underline"
                >
                  <ChevronDown className={cn("size-3 transition-transform", isExpanded && "-rotate-180")} />
                  {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </button>
              )}
            </div>

            {replyBoxId === comment.id && (
              <div className="pl-9">
                <CommentForm
                  placeholder="Write a reply…"
                  onSubmit={(body) => {
                    addComment(post.id, body, comment.id);
                    setReplyBoxId(null);
                  }}
                />
              </div>
            )}

            {isExpanded && replies.length > 0 && (
              <div className="ml-9 flex flex-col gap-2 border-l-2 border-muted pl-3">
                {replies.map((reply) => (
                  <CommentItem key={reply.id} comment={reply} unreadSince={unreadSince} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
