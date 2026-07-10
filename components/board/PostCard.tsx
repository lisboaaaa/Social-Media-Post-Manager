import { Draggable } from "@hello-pangea/dnd";
import { format } from "date-fns";
import { Play } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlatformBadgeGroup } from "@/components/posts/PlatformBadge";
import { useStore } from "@/lib/store";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PostCard({ post, index }: { post: Post; index: number }) {
  const { profiles, categories, openPreview } = useStore();
  const assignee = profiles.find((p) => p.id === post.assigneeId);
  const postCategories = categories.filter((c) => post.categoryIds.includes(c.id));
  const showImageArea = post.status !== "backlog" && post.status !== "writing";
  // A past target date only means something's late if it hasn't shipped yet —
  // Scheduled/Published posts are supposed to have a date in the past by then.
  const isOverdue =
    post.targetDate !== null &&
    post.targetDate < format(new Date(), "yyyy-MM-dd") &&
    post.status !== "scheduled" &&
    post.status !== "published";

  return (
    <Draggable draggableId={post.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => openPreview(post.id)}
          className={cn(
            "cursor-pointer rounded-lg bg-background p-3 shadow-md transition-shadow hover:shadow-lg",
            snapshot.isDragging && "ring-2 ring-primary/40",
          )}
        >
          <div className="mb-2.5 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <PlatformBadgeGroup platforms={post.platforms} />
            </div>
            {post.needsChanges && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-700 font-mono text-[10px] font-semibold uppercase tracking-wide"
              >
                Changes
              </Badge>
            )}
          </div>

          {showImageArea &&
            (post.images.length > 0 ? (
              post.images[0].mediaType === "video" ? (
                <div className="relative mb-2.5 h-24 w-full overflow-hidden rounded-md bg-muted">
                  <video src={post.images[0].imageUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="size-5 fill-white text-white" />
                  </span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.images[0].imageUrl} alt="" className="mb-2.5 h-24 w-full rounded-md object-cover" />
              )
            ) : (
              <div className="mb-2.5 h-24 rounded-md border border-dashed bg-muted/40" />
            ))}

          <p className="mb-2.5 line-clamp-2 text-sm font-medium leading-snug">{post.title}</p>

          <div className="flex items-center justify-between gap-2">
            {postCategories.length > 0 ? (
              <div className="flex min-w-0 items-center gap-1">
                <span className="truncate rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                  {postCategories[0].name}
                </span>
                {postCategories.length > 1 && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">+{postCategories.length - 1}</span>
                )}
              </div>
            ) : (
              <span />
            )}
            <div className="flex shrink-0 items-center gap-1.5">
              {assignee && (
                <Avatar size="sm" title={assignee.fullName}>
                  <AvatarFallback className="text-[10px]">{assignee.initials}</AvatarFallback>
                </Avatar>
              )}
              <span className={cn("text-xs font-medium", isOverdue ? "font-semibold text-red-600" : "text-muted-foreground")}>
                {post.targetDate ? format(new Date(`${post.targetDate}T00:00:00`), "MMM d") : "No date"}
              </span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
