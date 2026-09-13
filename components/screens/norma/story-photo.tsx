import { cn } from "@/components/design-system/cn";
import { Figure, type Photograph } from "@/components/design-system/photo";

/**
 * Foto de un capítulo: el recorte redondeado y el wipe son el mismo en todos
 * los tramos. Sin esto, cada capítulo copia las tres clases y se desincronizan.
 */
export function StoryPhoto({
  media,
  direction = "wipe",
  sizes,
  className,
  showCaption = true,
  priority = false,
}: {
  media: Photograph;
  direction?: "wipe" | "wipe-x";
  sizes: string;
  className?: string;
  showCaption?: boolean;
  priority?: boolean;
}) {
  return (
    <div
      data-reveal-photo={direction}
      className={cn("overflow-hidden rounded-md", className)}
    >
      <Figure
        media={media}
        reservedFor=""
        showCaption={showCaption}
        priority={priority}
        sizes={sizes}
      />
    </div>
  );
}
