import { Droppable } from "@hello-pangea/dnd";
import { PackageOpen } from "lucide-react";
import { PostCard } from "./PostCard";
import type { Post, PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// One color per workflow stage, so the board reads at a glance without
// having to check each card's status individually.
// Every column shares the same subtle wash now — Laura found per-status
// colors too busy — but keeps its own badge tint so the count still reads
// as belonging to that column.
const COLUMN_WASH = "bg-primary/5";
const STATUS_COLORS: Record<PostStatus, { badge: string }> = {
  backlog: { badge: "bg-slate-100 text-slate-500" },
  writing: { badge: "bg-blue-50 text-blue-600/80" },
  designing: { badge: "bg-cyan-50 text-cyan-600/80" },
  in_review: { badge: "bg-teal-50 text-teal-600/80" },
  approved: { badge: "bg-emerald-50 text-emerald-600/80" },
  scheduled: { badge: "bg-violet-50 text-violet-600/80" },
  published: { badge: "bg-primary/10 text-primary/80" },
};

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
  const colors = STATUS_COLORS[status];

  return (
    <div className="flex min-w-0 flex-col">
      <div className={cn("mb-2 flex items-center justify-between rounded-lg px-2.5 py-2", COLUMN_WASH)}>
        <h2 className="text-base font-semibold tracking-wide">{label}</h2>
        <span className={cn("rounded-full px-2 py-0.5 font-mono text-[11px] font-medium", colors.badge)}>
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
