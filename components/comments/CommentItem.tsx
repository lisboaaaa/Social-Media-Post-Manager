import { X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { isCommentUnread, useStore } from "@/lib/store";
import type { Comment } from "@/lib/types";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
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
  const { profiles, currentUser, deleteComment } = useStore();
  const author = profiles.find((p) => p.id === comment.authorId);
  const isUnread = unreadSince !== undefined && isCommentUnread(comment, currentUser.id, unreadSince);
  const isOwn = comment.authorId === currentUser.id;

  const handleDelete = () => {
    if (!confirm("Delete this note? This can't be undone.")) return;
    deleteComment(comment.id);
  };

  return (
    <div
      className={cn(
        "group flex gap-2.5 rounded-lg p-1.5",
        isOwn && "bg-primary/[0.04] ring-1 ring-primary/10",
      )}
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-[10px]">{author?.initials ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {isUnread && <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-label="Unread" />}
          <span className="text-sm font-medium">{isOwn ? "You" : (author?.fullName ?? "Unknown")}</span>
          <span className="font-mono text-[11px] text-muted-foreground">{formatWhen(comment.createdAt)}</span>
          {isOwn && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete note"
              title="Delete note"
              className="ml-auto rounded text-muted-foreground opacity-0 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{comment.body}</p>
      </div>
    </div>
  );
}
