import { Droppable } from "@hello-pangea/dnd";
import { PostCard } from "./PostCard";
import type { Post, PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// One color per workflow stage, so the board reads at a glance without
// having to check each card's status individually.
const STATUS_COLORS: Record<PostStatus, { bar: string; badge: string }> = {
  backlog: { bar: "bg-slate-400", badge: "bg-slate-100 text-slate-500" },
  writing: { bar: "bg-blue-200", badge: "bg-blue-50 text-blue-600/80" },
  designing: { bar: "bg-cyan-200", badge: "bg-cyan-50 text-cyan-600/80" },
  in_review: { bar: "bg-orange-200", badge: "bg-orange-50 text-orange-600/80" },
  approved: { bar: "bg-emerald-200", badge: "bg-emerald-50 text-emerald-600/80" },
  scheduled: { bar: "bg-violet-200", badge: "bg-violet-50 text-violet-600/80" },
  published: { bar: "bg-primary/50", badge: "bg-primary/10 text-primary/80" },
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
      <div className={cn("mb-2 h-1 rounded-full", colors.bar)} />
      <div className="mb-2 flex items-center justify-between px-0.5">
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
              <div className="flex h-14 items-center justify-center rounded-lg border border-dashed text-[11.5px] text-muted-foreground">
                Drop a post here
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
