"use client";

import { formatDistanceToNow } from "date-fns";
import { useStore } from "@/lib/store";

export function PostHistoryList({ postId }: { postId: string }) {
  const { postHistory, profiles, currentUser } = useStore();

  const entries = postHistory
    .filter((h) => h.postId === postId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (entries.length === 0) return null;

  const actorName = (actorId: string) => {
    if (actorId === currentUser.id) return "you";
    return profiles.find((p) => p.id === actorId)?.fullName ?? "Someone no longer on the team";
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</h3>
      <div className="flex flex-col gap-1.5">
        {entries.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
            <span className="font-medium">{actorName(entry.actorId)}</span>
            <span className="text-muted-foreground">{entry.summary}</span>
            <span className="text-xs text-muted-foreground/70">
              · {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
