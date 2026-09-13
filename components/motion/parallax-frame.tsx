"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { cn } from "@/components/design-system/cn";

/**
 * Parallax muy leve (4–6 %) para el capítulo de la comunidad.
 *
 * Sólo en escritorio: en teléfono el recorte ya es el relato. Sin JavaScript o
 * con movimiento reducido, la foto no se mueve.
 */
export function ParallaxFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;

    if (node === null) {
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reduce.matches || window.matchMedia("(max-width: 63.99rem)").matches) {
      return;
    }

    let frame = 0;

    function update() {
      if (node === null) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;

      node.style.setProperty("--parallax", String(Math.min(1, Math.max(-1, progress))));
    }

    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={ref} data-parallax="" className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}
