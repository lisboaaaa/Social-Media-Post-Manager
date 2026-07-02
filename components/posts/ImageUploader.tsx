"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import type { PostImage } from "@/lib/types";

export function ImageUploader({
  images,
  onChange,
  limitWarning,
}: {
  images: PostImage[];
  onChange: (images: PostImage[]) => void;
  limitWarning?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added: PostImage[] = Array.from(files).map((file, i) => ({
      id: crypto.randomUUID(),
      postId: "",
      imageUrl: URL.createObjectURL(file),
      position: images.length + i,
    }));
    onChange([...images, ...added]);
  };

  const remove = (id: string) => onChange(images.filter((img) => img.id !== id));

  return (
    <div className="flex flex-col gap-1.5">
      {limitWarning && <p className="text-xs text-amber-600">{limitWarning}</p>}
      <div className="flex flex-wrap gap-2">
      {images.map((img) => (
        // eslint-disable-next-line @next/next/no-img-element
        <div key={img.id} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-md border">
          <img src={img.imageUrl} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => remove(img.id)}
            className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 opacity-0 shadow transition-opacity group-hover:opacity-100"
            aria-label="Remove image"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:bg-muted/50"
      >
        <ImagePlus className="size-4" />
        <span className="text-[10px]">Add image</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      </div>
    </div>
  );
}
