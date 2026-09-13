"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { cn } from "@/components/design-system/cn";

/**
 * Profundidad de scroll para el hero: escala de la foto y opacidad del copy.
 *
 * No bloquea el scroll. El valor vive en `--scroll-depth` (0–1) y el CSS hace
 * el resto. Sin JavaScript, o con movimiento reducido, la foto se queda quieta.
 */
export function ScrollDepth({
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

    if (reduce.matches) {
      return;
    }

    let frame = 0;

    function update() {
      if (node === null) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const span = Math.max(rect.height, 1);
      const progress = Math.min(1, Math.max(0, -rect.top / span));

      node.style.setProperty("--scroll-depth", String(progress));
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
    <div ref={ref} className={cn("relative", className)}>
      {children}
    </div>
  );
}
