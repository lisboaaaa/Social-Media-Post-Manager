"use client";

import { format, formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";

interface GlobalHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Same audit log as PostHistoryList, but across every post at once — never
// filtered by anything, since the whole point is "what happened, anywhere,
// recently". Scrolls instead of paging/capping; unlike a dashboard card
// this is a dedicated browse view, so an unbounded list is fine here.
export function GlobalHistoryModal({ open, onOpenChange }: GlobalHistoryModalProps) {
  const { postHistory, posts, profiles, currentUser, openPreview } = useStore();

  const entries = [...postHistory].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const actorName = (actorId: string) => {
    if (actorId === currentUser.id) return "you";
    return profiles.find((p) => p.id === actorId)?.fullName ?? "Someone no longer on the team";
  };

  const postLabel = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    return post ? `#${post.postNumber} ${post.title || "Untitled post"}` : "Deleted post";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Global history</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 border-t px-4 pt-4">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="flex flex-col gap-2 pb-4">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    openPreview(entry.postId);
                  }}
                  className="flex flex-col gap-0.5 rounded-lg border p-2.5 text-left hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                    <span className="font-medium">{actorName(entry.actorId)}</span>
                    <span className="text-muted-foreground">{entry.summary}</span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs text-muted-foreground/70">
                    <span className="truncate font-medium text-foreground/70">{postLabel(entry.postId)}</span>
                    <span>
                      · {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })} ·{" "}
                      {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
