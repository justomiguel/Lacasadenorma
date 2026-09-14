import Image from "next/image";

import { cn } from "@/components/design-system/cn";
import { DEFAULT_MARK } from "@/content/marca";

/**
 * El símbolo de La Casa de Norma: el círculo 01 ORIGINAL.
 *
 * El mark es decorativo. El nombre lo dice el texto que lo acompaña (encabezado,
 * menú, pie, backoffice). `alt` vacío y `aria-hidden` para no oír el nombre dos
 * veces. Las medidas son las del PNG recortado; el tamaño visible sale de la
 * escala de espacio, no de un valor arbitrario.
 */
export const SITE_MARK = DEFAULT_MARK;

const SIZES = {
  lg: "size-lg",
  xl: "size-xl",
  "2xl": "size-2xl",
} as const;

export function SiteMark({
  size = "xl",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <Image
      src={SITE_MARK.src}
      alt=""
      width={SITE_MARK.width}
      height={SITE_MARK.height}
      aria-hidden={true}
      className={cn(SIZES[size], "shrink-0", className)}
    />
  );
}
