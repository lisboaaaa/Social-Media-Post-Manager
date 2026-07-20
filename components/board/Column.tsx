import { useState } from "react";
import { Droppable, type DraggableProvidedDragHandleProps, type DraggableProvidedDraggableProps } from "@hello-pangea/dnd";
import { GripVertical, PackageOpen } from "lucide-react";
import { PostCard } from "./PostCard";
import type { Post, PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// Every column shares one tint now (Laura preferred the plain Backlog look
// over per-status colors, colored backgrounds, and icons — all tried and
// rejected). The vertical divider between columns is what's carrying
// separation now.
const BADGE_CLASS = "bg-slate-100 text-slate-500";

export function Column({
  status,
  label,
  posts,
  hint,
  innerRef,
  draggableProps,
  dragHandleProps,
  isDragging,
  onRename,
}: {
  status: PostStatus;
  label: string;
  posts: Post[];
  hint?: string;
  innerRef: (element: HTMLElement | null) => void;
  draggableProps: DraggableProvidedDraggableProps;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  isDragging: boolean;
  onRename: (newLabel: string) => void;
}) {
  // Editing state lives here (not the column-name box itself) so a click
  // swaps the static label for an input, committing on blur/Enter — same
  // pattern as the rename fields in Manage stages, just in place on the board.
  const [draft, setDraft] = useState<string | null>(null);

  const commitRename = () => {
    const trimmed = draft?.trim();
    setDraft(null);
    if (!trimmed || trimmed === label) return;
    onRename(trimmed);
  };

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      className={cn(
        "group flex min-w-0 flex-col border-r border-border/70 px-2 sm:px-3.5 first:pl-0 last:border-r-0 last:pr-0",
        isDragging && "z-10 rounded-lg bg-background shadow-lg",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-1 px-0.5 py-1">
        <div className="flex min-w-0 items-center gap-0.5">
          <span
            {...dragHandleProps}
            aria-label={`Reorder ${label}`}
            title="Drag to reorder"
            className="flex size-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground/50 opacity-0 group-hover:opacity-100"
          >
            <GripVertical className="size-3.5" />
          </span>
          {draft !== null ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setDraft(null);
              }}
              className="min-w-0 rounded-md bg-slate-100 px-2 py-1 text-base font-semibold tracking-wide text-foreground outline-none ring-1 ring-primary"
            />
          ) : (
            <h2
              onClick={() => setDraft(label)}
              title="Click to rename"
              className="cursor-text truncate rounded-md bg-slate-100 px-2 py-1 text-base font-semibold tracking-wide text-foreground hover:ring-1 hover:ring-border"
            >
              {label}
            </h2>
          )}
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-medium", BADGE_CLASS)}>
          {posts.length}
        </span>
      </div>
      {hint && <p className="mb-2 px-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex min-h-[60px] flex-1 flex-col gap-3 rounded-lg p-1 transition-colors",
              snapshot.isDraggingOver && "bg-primary/5",
            )}
          >
            {posts.map((post, index) => (
              <PostCard key={post.id} post={post} index={index} />
            ))}
            {provided.placeholder}
            {posts.length === 0 && (
              <div className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed text-muted-foreground">
                <PackageOpen className="size-3.5" />
                <span className="text-[11.5px]">Drop a post here</span>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
