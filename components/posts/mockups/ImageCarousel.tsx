"use client";

import { useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PostImage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ImageCarousel({
  images,
  className,
  fit = "cover",
  initialIndex = 0,
}: {
  images: PostImage[];
  className?: string;
  fit?: "cover" | "contain";
  initialIndex?: number;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const widthRef = useRef(1);
  const containerRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) return null;

  const clampIndex = (i: number) => Math.max(0, Math.min(i, images.length - 1));
  const current = clampIndex(index);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (images.length <= 1) return;
    if ((e.target as HTMLElement).closest("button")) return;
    containerRef.current?.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    widthRef.current = containerRef.current?.clientWidth || 1;
    setIsDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragOffset(e.clientX - startXRef.current);
  };

  const endDrag = () => {
    if (!isDragging) return;
    const threshold = widthRef.current * 0.2;
    if (dragOffset < -threshold) setIndex((i) => clampIndex(i + 1));
    else if (dragOffset > threshold) setIndex((i) => clampIndex(i - 1));
    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative touch-pan-y select-none overflow-hidden bg-muted", className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div
        className={cn(
          "flex h-full",
          images.length > 1 && "cursor-grab active:cursor-grabbing",
          !isDragging && "transition-transform duration-200 ease-out",
        )}
        style={{ transform: `translate3d(calc(${-current * 100}% + ${isDragging ? dragOffset : 0}px), 0, 0)` }}
      >
        {images.map((img) =>
          img.mediaType === "video" ? (
            <video
              key={img.id}
              src={img.imageUrl}
              controls
              autoPlay
              loop
              muted
              playsInline
              className={cn("h-full w-full shrink-0", fit === "contain" ? "object-contain" : "object-cover")}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={img.imageUrl}
              alt=""
              draggable={false}
              className={cn("h-full w-full shrink-0", fit === "contain" ? "object-contain" : "object-cover")}
            />
          ),
        )}
      </div>

      {images.length > 1 && (
        <>
          {current > 0 && (
            <button
              type="button"
              onClick={() => setIndex((i) => clampIndex(i - 1))}
              aria-label="Previous photo"
              className="absolute left-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          {current < images.length - 1 && (
            <button
              type="button"
              onClick={() => setIndex((i) => clampIndex(i + 1))}
              aria-label="Next photo"
              className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
          <div className="absolute top-2 right-2 rounded-full bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-white">
            {current + 1}/{images.length}
          </div>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((img, i) => (
              <span key={img.id} className={cn("size-1.5 rounded-full bg-white/50", i === current && "bg-white")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
