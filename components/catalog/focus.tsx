"use client";

import { useEffect } from "react";

/**
 * Lleva el foco al renglón pedido en `?item=`, después de ingresar.
 *
 * No es decoración: es el final del flujo "pedir donar esto" sin sesión.
 */
export function CatalogFocus({ itemId }: { itemId: string | null }) {
  useEffect(() => {
    if (itemId === null) {
      return;
    }

    document.getElementById(`item-${itemId}`)?.scrollIntoView({ block: "start" });
  }, [itemId]);

  return null;
}
