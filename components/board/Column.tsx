import { Droppable } from "@hello-pangea/dnd";
import { PackageOpen } from "lucide-react";
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
}: {
  status: PostStatus;
  label: string;
  posts: Post[];
  hint?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col border-r border-border/70 px-3.5 first:pl-0 last:border-r-0 last:pr-0">
      <div className="mb-2 flex items-center justify-between px-0.5 py-1">
        <h2 className="rounded-md bg-slate-100 px-2 py-1 text-base font-semibold tracking-wide text-foreground">
          {label}
        </h2>
        <span className={cn("rounded-full px-2 py-0.5 font-mono text-[11px] font-medium", BADGE_CLASS)}>
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
