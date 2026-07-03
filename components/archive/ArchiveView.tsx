"use client";

import { Play } from "lucide-react";
import { PlatformBadgeGroup } from "@/components/posts/PlatformBadge";
import { useStore } from "@/lib/store";

export function ArchiveView() {
  const { filteredPosts, openPreview } = useStore();
  const published = filteredPosts.filter((p) => p.status === "published");

  if (published.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No published posts match these filters yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {published.map((post) => {
        const cover = post.images[0];
        return (
          <button
            key={post.id}
            onClick={() => openPreview(post.id)}
            className="group flex flex-col overflow-hidden rounded-lg border bg-background text-left transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
              {cover ? (
                cover.mediaType === "video" ? (
                  <video src={cover.imageUrl} muted className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover.imageUrl} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-500 via-sky-600 to-fuchsia-500" />
              )}
              {cover?.mediaType === "video" && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <Play className="size-6 fill-white text-white" />
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5 p-2.5">
              <PlatformBadgeGroup platforms={post.platforms} />
              <p className="line-clamp-2 text-sm font-medium leading-snug">{post.title}</p>
              <span className="font-mono text-[10.5px] text-muted-foreground">{post.targetDate ?? "no date"}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
