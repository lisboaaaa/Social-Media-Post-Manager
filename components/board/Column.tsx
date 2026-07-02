import { Droppable } from "@hello-pangea/dnd";
import { PostCard } from "./PostCard";
import type { Post, PostStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Column({
  status,
  label,
  posts,
}: {
  status: PostStatus;
  label: string;
  posts: Post[];
}) {
  return (
    <div className="flex w-56 shrink-0 flex-col">
      <div className="mb-2.5 flex items-center justify-between px-0.5">
        <h2 className="text-base font-semibold tracking-wide">{label}</h2>
        <span className="rounded-full border bg-background px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
          {posts.length}
        </span>
      </div>
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex min-h-[60px] flex-1 flex-col gap-2.5 rounded-lg p-1 transition-colors",
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
