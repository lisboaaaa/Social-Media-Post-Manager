import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImageCarousel } from "./ImageCarousel";
import type { Device } from "./device";

export function InstagramMockup({
  post,
  description,
  device = "mobile",
}: {
  post: Post;
  description: string;
  device?: Device;
}) {
  const desktop = device === "desktop";

  const media =
    post.images.length > 0 ? (
      <ImageCarousel images={post.images} className={cn("w-full", desktop ? "h-full" : "aspect-square")} />
    ) : (
      <div
        className={cn(
          "flex w-full items-center justify-center bg-gradient-to-br from-teal-500 via-sky-600 to-fuchsia-500",
          desktop ? "h-full" : "aspect-square",
        )}
      >
        <span className="px-8 text-center text-lg font-extrabold uppercase tracking-wide text-white">
          {description.slice(0, 40) || "New post"}
        </span>
      </div>
    );

  const avatar = (
    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-[10px] font-bold text-white">
      G
    </div>
  );

  if (desktop) {
    return (
      <div className="mx-auto flex w-full max-w-2xl overflow-hidden rounded-lg border bg-white">
        <div className="aspect-square w-[55%] shrink-0 bg-black">{media}</div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            {avatar}
            <span className="flex-1 truncate text-[13px] font-semibold">genos.hq</span>
            <span className="text-[12px] font-semibold text-sky-600">Follow</span>
            <MoreHorizontal className="size-4 shrink-0 text-muted-foreground" />
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2.5 text-[13px] leading-snug">
            <span className="font-semibold">genos.hq</span>{" "}
            <span className="whitespace-pre-wrap">{description || "No caption yet."}</span>
            <div className="mt-2 font-mono text-[10px] uppercase text-muted-foreground">
              {post.targetDate ?? "no date"}
            </div>
          </div>
          <div className="border-t px-3 pt-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="size-6" strokeWidth={1.5} />
                <MessageCircle className="size-6 -scale-x-100" strokeWidth={1.5} />
                <Send className="size-6" strokeWidth={1.5} />
              </div>
              <Bookmark className="size-6" strokeWidth={1.5} />
            </div>
            <div className="py-2 text-[13px] font-semibold">142 likes</div>
          </div>
          <div className="border-t px-3 py-2.5 text-[13px] text-muted-foreground">Add a comment…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border bg-white">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {avatar}
        <span className="flex-1 text-[13px] font-semibold">genos.hq</span>
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </div>

      {media}

      <div className="flex items-center justify-between px-3 pt-2.5">
        <div className="flex items-center gap-3">
          <Heart className="size-6" strokeWidth={1.5} />
          <MessageCircle className="size-6 -scale-x-100" strokeWidth={1.5} />
          <Send className="size-6" strokeWidth={1.5} />
        </div>
        <Bookmark className="size-6" strokeWidth={1.5} />
      </div>

      <div className="px-3 pb-3 pt-2 text-[13px] leading-snug">
        <span className="font-semibold">genos.hq</span>{" "}
        <span className="line-clamp-2 whitespace-pre-wrap">
          {description || "No caption yet."}
        </span>
        {description.length > 60 && <span className="text-muted-foreground"> …more</span>}
        <div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">
          {post.targetDate ?? "no date"}
        </div>
      </div>
    </div>
  );
}
