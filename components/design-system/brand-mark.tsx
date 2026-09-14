import Image from "next/image";
import type { ReactNode } from "react";

import { BRANDS, type BrandId } from "@/content/brands";

import { cn } from "./cn";

/**
 * Logo de una marca de terceros, al lado de su nombre.
 *
 * El mark es decorativo: el nombre lo dice el texto. `alt` vacío y `aria-hidden`
 * para no oír "PayPal PayPal". Las dimensiones del archivo son 24×24; el tamaño
 * visible sigue a la tipografía (`1.15em`) para no pelear con el botón o el tab.
 */
export function BrandMark({ id, className }: { id: BrandId; className?: string }) {
  const brand = BRANDS[id];

  return (
    <Image
      src={brand.src}
      alt=""
      width={brand.width}
      height={brand.height}
      unoptimized
      aria-hidden={true}
      className={cn("h-[1.15em] w-[1.15em] shrink-0", className)}
    />
  );
}

/** Nombre de marca con su logo. Una sola pieza, para no olvidar el mark. */
export function BrandLabel({
  id,
  children,
  className,
}: {
  id: BrandId;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-xs", className)}>
      <BrandMark id={id} />
      {children}
    </span>
  );
}
