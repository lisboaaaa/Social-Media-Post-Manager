"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["👍", "❤️", "🎉", "😂", "👀", "✅"];

export function CommentReactions({ commentId }: { commentId: string }) {
  const { commentReactions, currentUser, toggleReaction } = useStore();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Group this comment's reactions by emoji, keeping who reacted so the
  // current user's own reaction can be highlighted.
  const groups = new Map<string, string[]>();
  for (const reaction of commentReactions) {
    if (reaction.commentId !== commentId) continue;
    const authors = groups.get(reaction.emoji) ?? [];
    authors.push(reaction.authorId);
    groups.set(reaction.emoji, authors);
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {[...groups.entries()].map(([emoji, authorIds]) => {
        const isMine = authorIds.includes(currentUser.id);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggleReaction(commentId, emoji)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors",
              isMine ? "border-primary/40 bg-primary/10" : "border-border bg-muted/40 hover:bg-muted",
            )}
          >
            <span>{emoji}</span>
            <span className="font-medium tabular-nums">{authorIds.length}</span>
          </button>
        );
      })}

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Add reaction"
              title="Add reaction"
              className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            />
          }
        >
          <SmilePlus className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1.5" align="start">
          <div className="flex gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  toggleReaction(commentId, emoji);
                  setPickerOpen(false);
                }}
                className="flex size-8 items-center justify-center rounded-md text-lg hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
