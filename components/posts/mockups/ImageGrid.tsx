import type { PostImage } from "@/lib/types";
import { cn } from "@/lib/utils";

function Tile({ image, onClick, overflow }: { image: PostImage; onClick: () => void; overflow?: number }) {
  return (
    <button type="button" onClick={onClick} className="relative block h-full w-full overflow-hidden bg-muted">
      {image.mediaType === "video" ? (
        <video src={image.imageUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.imageUrl} alt="" draggable={false} className="h-full w-full object-cover" />
      )}
      {!!overflow && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
          +{overflow}
        </span>
      )}
    </button>
  );
}

/** Static multi-photo grid, matching how LinkedIn/X lay out feed attachments (not a swipeable carousel — that's Instagram's behavior). */
export function ImageGrid({
  images,
  onImageClick,
  quadAsGrid = false,
  className,
}: {
  images: PostImage[];
  onImageClick: (index: number) => void;
  quadAsGrid?: boolean;
  className?: string;
}) {
  const count = images.length;
  if (count < 2) return null;

  if (count === 2) {
    return (
      <div className={cn("grid aspect-[16/9] grid-cols-2 gap-px", className)}>
        <Tile image={images[0]} onClick={() => onImageClick(0)} />
        <Tile image={images[1]} onClick={() => onImageClick(1)} />
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className={cn("grid aspect-[16/9] grid-cols-2 grid-rows-2 gap-px", className)}>
        <div className="row-span-2">
          <Tile image={images[0]} onClick={() => onImageClick(0)} />
        </div>
        <Tile image={images[1]} onClick={() => onImageClick(1)} />
        <Tile image={images[2]} onClick={() => onImageClick(2)} />
      </div>
    );
  }

  if (quadAsGrid && count === 4) {
    return (
      <div className={cn("grid aspect-square grid-cols-2 grid-rows-2 gap-px", className)}>
        {images.map((image, i) => (
          <Tile key={image.id} image={image} onClick={() => onImageClick(i)} />
        ))}
      </div>
    );
  }

  const rightImages = images.slice(1, 4);
  const overflow = count - 4;
  return (
    <div className={cn("grid aspect-[16/9] grid-cols-2 grid-rows-3 gap-px", className)}>
      <div className="row-span-3">
        <Tile image={images[0]} onClick={() => onImageClick(0)} />
      </div>
      {rightImages.map((image, i) => (
        <Tile
          key={image.id}
          image={image}
          onClick={() => onImageClick(i + 1)}
          overflow={i === rightImages.length - 1 ? overflow : undefined}
        />
      ))}
    </div>
  );
}
