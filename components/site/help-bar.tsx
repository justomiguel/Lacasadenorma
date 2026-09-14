"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { primaryActionClass } from "@/components/design-system/actions";
import { cn } from "@/components/design-system/cn";
import { localizedHref } from "@/src/i18n/href";
import { stripLocalePrefix } from "@/src/i18n/locale";
import { track } from "@/src/infrastructure/analytics/browser";

/**
 * La barra de ayudar del teléfono (ADR-032).
 *
 * Una barra nativa, no una píldora flotante: papel, una regla arriba, la acción
 * primaria al ancho completo y el relleno que pide `env(safe-area-inset-bottom)`.
 * Cuando `#donaciones` o una acción primaria de la página están a la vista, baja
 * con una transición y queda inerte —no se desmonta, para que la salida se vea— y
 * vuelve a subir cuando salen.
 *
 * No aparece en `/ayudar` ni en sus retornos de PayPal, que son el mismo flujo.
 * Tampoco en `/cuenta`: ahí la acción es guardar, salir o borrar, y la barra
 * tapaba los formularios. Reserva su alto en el flujo para no tapar el final de
 * las páginas donde sí está.
 */

export function helpBarIsOffRoute(canonical: string): boolean {
  return (
    canonical === "/ayudar" ||
    canonical.startsWith("/ayudar/") ||
    canonical === "/cuenta" ||
    canonical.startsWith("/cuenta/")
  );
}
export function HelpBar({
  href = localizedHref("/ayudar", "es"),
  label = "Ayudar a reconstruir",
}: {
  href?: ReturnType<typeof localizedHref>;
  label?: string;
}) {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const [reading, setReading] = useState<{ route: string; redundant: boolean } | null>(
    null,
  );

  const canonical = stripLocalePrefix(pathname);

  /* Antes de la primera medición, en la home la barra arranca abajo: la apertura
     trae la acción primaria a la vista y la barra la repetiría. Una recarga a
     mitad de página la hace subir en cuanto el observador mide. */
  const redundant =
    reading !== null && reading.route === pathname
      ? reading.redundant
      : canonical === "/";

  useEffect(() => {
    const anchors = document.querySelectorAll("[data-help-primary], #donaciones");

    if (anchors.length === 0) {
      return;
    }

    const visible = new Set<Element>();

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visible.add(entry.target);
        } else {
          visible.delete(entry.target);
        }
      }

      if (bar.current?.contains(document.activeElement)) {
        return;
      }

      setReading({ route: pathname, redundant: visible.size > 0 });
    });

    for (const anchor of anchors) {
      observer.observe(anchor);
    }

    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  if (helpBarIsOffRoute(canonical)) {
    return null;
  }

  const target = canonical === "/" ? "#donaciones" : `${href}#donaciones`;

  return (
    <>
      <div aria-hidden="true" className="h-helpbar sm:hidden" />

      <div
        ref={bar}
        data-foco-condicional=""
        {...(redundant ? { "aria-hidden": true, inert: true } : {})}
        className={cn(
          "fixed inset-x-0 bottom-0 z-10 border-t border-rule bg-paper px-5 pt-sm transition-transform duration-base ease-editorial safe-bottom sm:hidden",
          redundant ? "translate-y-full" : "translate-y-0",
        )}
      >
        <a
          href={target}
          className={primaryActionClass("forest")}
          onClick={() => {
            track({ name: "ayudar_click", props: { origen: "barra" } });
          }}
        >
          {label}
        </a>
      </div>
    </>
  );
}
