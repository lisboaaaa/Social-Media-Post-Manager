import { Draggable } from "@hello-pangea/dnd";
import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlatformBadgeGroup } from "@/components/posts/PlatformBadge";
import { useStore } from "@/lib/store";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PostCard({ post, index }: { post: Post; index: number }) {
  const router = useRouter();
  const { profiles, categories, openPreview } = useStore();
  const assignee = profiles.find((p) => p.id === post.assigneeId);
  const postCategories = categories.filter((c) => post.categoryIds.includes(c.id));

  return (
    <Draggable draggableId={post.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => openPreview(post.id)}
          onDoubleClick={() => router.push(`/posts/${post.id}`)}
          className={cn(
            "cursor-pointer rounded-lg border bg-background p-2.5 shadow-sm transition-shadow hover:shadow-md",
            snapshot.isDragging && "ring-2 ring-primary/40",
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-1.5">
            <PlatformBadgeGroup platforms={post.platforms} />
            {post.needsChanges && (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-700 font-mono text-[9px] font-semibold uppercase tracking-wide"
              >
                Changes
              </Badge>
            )}
          </div>

          {post.images.length > 0 ? (
            post.images[0].mediaType === "video" ? (
              <div className="relative mb-2 h-20 w-full overflow-hidden rounded-md bg-muted">
                <video src={post.images[0].imageUrl} muted className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play className="size-5 fill-white text-white" />
                </span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.images[0].imageUrl} alt="" className="mb-2 h-20 w-full rounded-md object-cover" />
            )
          ) : (
            <div className="mb-2 h-20 rounded-md border border-dashed bg-muted/40" />
          )}

          <p className="mb-2 line-clamp-2 text-sm font-medium leading-snug">{post.title}</p>

          {postCategories.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {postCategories.map((c) => (
                <span key={c.id} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {c.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            {assignee ? (
              <Avatar size="sm" title={assignee.fullName}>
                <AvatarFallback className="text-[9px]">{assignee.initials}</AvatarFallback>
              </Avatar>
            ) : (
              <span />
            )}
            <span className="font-mono text-[10.5px] text-muted-foreground">
              {post.targetDate ?? "no date"}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}
