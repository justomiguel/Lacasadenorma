"use client";

import { useEffect } from "react";

import type { AccountBlockId } from "@/components/account/account-section";

/**
 * Baja al bloque pedido por `?seccion=`. Sin JavaScript la página ya se lee
 * entera. Con `prefers-reduced-motion` el salto es instantáneo.
 */
export function AccountBlockFocus({ id }: { id: AccountBlockId | null }) {
  useEffect(() => {
    if (id === null) {
      return;
    }

    const block = document.getElementById(id);

    if (block === null) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    block.scrollIntoView({
      behavior: reduced ? "instant" : "smooth",
      block: "start",
    });
  }, [id]);

  return null;
}
