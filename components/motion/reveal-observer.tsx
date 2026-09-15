"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { observeReveals } from "./observe-reveals";

/**
 * Observa los momentos marcados con `data-reveal` y `data-reveal-photo`.
 *
 * Vive en el documento público, no en cada foto: un solo observador por página,
 * y se rehace al cambiar de ruta porque el layout no se desmonta.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => observeReveals(document), [pathname]);

  return null;
}
