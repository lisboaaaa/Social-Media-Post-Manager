import { X } from "lucide-react";
import type { PostImage } from "@/lib/types";
import { ImageCarousel } from "./ImageCarousel";

export function Lightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: PostImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 bg-black">
      <ImageCarousel images={images} initialIndex={initialIndex} fit="contain" className="h-full w-full" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/50 text-white"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
