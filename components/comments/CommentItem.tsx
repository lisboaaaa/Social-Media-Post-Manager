import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { isCommentUnread, useStore } from "@/lib/store";
import type { Comment } from "@/lib/types";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CommentItem({
  comment,
  unreadSince,
}: {
  comment: Comment;
  unreadSince?: string | null;
}) {
  const { profiles, currentUser } = useStore();
  const author = profiles.find((p) => p.id === comment.authorId);
  const isUnread = unreadSince !== undefined && isCommentUnread(comment, currentUser.id, unreadSince);

  return (
    <div className="flex gap-2.5">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-[10px]">{author?.initials ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {isUnread && <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-label="Unread" />}
          <span className="text-sm font-medium">{author?.fullName ?? "Unknown"}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{formatWhen(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{comment.body}</p>
      </div>
    </div>
  );
}
