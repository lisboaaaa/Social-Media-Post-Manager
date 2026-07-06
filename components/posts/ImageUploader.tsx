"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Play, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { PostImage } from "@/lib/types";

export function ImageUploader({
  images,
  onChange,
  limitWarning,
  disabled = false,
}: {
  images: PostImage[];
  onChange: (images: PostImage[]) => void;
  limitWarning?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const supabase = createClient();

    const added: PostImage[] = Array.from(files).map((file, i) => ({
      id: crypto.randomUUID(),
      postId: "",
      imageUrl: URL.createObjectURL(file),
      position: images.length + i,
      mediaType: file.type.startsWith("video/") ? "video" : "image",
    }));
    onChange([...images, ...added]);
    setUploadingIds((prev) => new Set([...prev, ...added.map((a) => a.id)]));

    added.forEach(async (item, i) => {
      const file = Array.from(files)[i];
      const path = `${item.id}-${file.name}`;
      const { error } = await supabase.storage.from("post-media").upload(path, file);

      setUploadingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });

      if (error) {
        toast.error(`Couldn't upload ${file.name}: ${error.message}`);
        onChange(imagesRef.current.filter((img) => img.id !== item.id));
        return;
      }

      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      onChange(imagesRef.current.map((img) => (img.id === item.id ? { ...img, imageUrl: data.publicUrl } : img)));
    });
  };

  const remove = (id: string) => onChange(images.filter((img) => img.id !== id));

  return (
    <div className="flex flex-col gap-1.5">
      {limitWarning && <p className="text-xs text-amber-600">{limitWarning}</p>}
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <div key={img.id} className="group relative h-32 w-32 shrink-0 overflow-hidden rounded-md border bg-muted">
            {img.mediaType === "video" ? (
              <video src={img.imageUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.imageUrl} alt="" className="h-full w-full object-cover" />
            )}
            {img.mediaType === "video" && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="size-6 fill-white text-white" />
              </span>
            )}
            {uploadingIds.has(img.id) && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">
                Uploading…
              </span>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(img.id)}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-32 w-32 shrink-0 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-muted-foreground hover:bg-muted/50"
            >
              <ImagePlus className="size-5" />
              <span className="text-xs">Add media</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
