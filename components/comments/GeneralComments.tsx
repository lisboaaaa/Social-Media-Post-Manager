"use client";

import { useState } from "react";
import { groupByDay } from "@/lib/commentGroups";
import { useStore } from "@/lib/store";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import { DateSeparator } from "./DateSeparator";

const VISIBLE_CAP = 15;

export function GeneralComments({ unreadSince }: { unreadSince?: string | null }) {
  const { comments, addComment } = useStore();
  const [showAll, setShowAll] = useState(false);

  const generalComments = comments
    .filter((c) => c.postId === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Newest first, so today's notes show up top without scrolling — "older"
  // means the tail of this array. Cap to the most recent head and let
  // people reveal the rest on demand, instead of rendering it all always.
  const visibleComments = showAll ? generalComments : generalComments.slice(0, VISIBLE_CAP);
  const hiddenCount = generalComments.length - visibleComments.length;
  const groups = groupByDay(visibleComments);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">General notes</h3>
      <CommentForm onSubmit={(body) => addComment(null, body)} placeholder="Share a note with the team…" showButton={false} />
      <div className="flex flex-col gap-3">
        {generalComments.length === 0 && (
          <p className="text-sm text-muted-foreground">No general notes yet.</p>
        )}
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-3">
            <DateSeparator label={group.label} />
            {group.items.map((comment) => (
              <CommentItem key={comment.id} comment={comment} unreadSince={unreadSince} />
            ))}
          </div>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="self-start text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Show {hiddenCount} older note{hiddenCount === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </div>
  );
}
