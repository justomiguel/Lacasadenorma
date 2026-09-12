"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { localizedHref } from "@/src/i18n/href";
import { stripLocalePrefix } from "@/src/i18n/locale";
import { track } from "@/src/infrastructure/analytics/browser";

/**
 * CTA inferior del teléfono, como en el mockup.
 *
 * Se oculta en `/ayudar` y cuando `#donaciones` está a la vista.
 * Reserva el alto en el flujo para no tapar el final de la página.
 */
export function HelpBar({
  href = localizedHref("/ayudar", "es"),
  label = "Ayudar a reconstruir",
}: {
  href?: ReturnType<typeof localizedHref>;
  label?: string;
}) {
  const pathname = usePathname();
  const barra = useRef<HTMLDivElement>(null);
  const [medicion, setMedicion] = useState<{ ruta: string; redundante: boolean } | null>(
    null,
  );

  const redundante =
    medicion !== null && medicion.ruta === pathname && medicion.redundante;

  useEffect(() => {
    const acciones = document.querySelectorAll("[data-help-primary], #donaciones");

    if (acciones.length === 0) {
      return;
    }

    const visibles = new Set<Element>();

    const observador = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) {
          visibles.add(entrada.target);
        } else {
          visibles.delete(entrada.target);
        }
      }

      if (barra.current?.contains(document.activeElement)) {
        return;
      }

      setMedicion({ ruta: pathname, redundante: visibles.size > 0 });
    });

    for (const accion of acciones) {
      observador.observe(accion);
    }

    return () => {
      observador.disconnect();
    };
  }, [pathname]);

  if (stripLocalePrefix(pathname) === "/ayudar") {
    return null;
  }

  return (
    <>
      <div aria-hidden="true" className="h-helpbar sm:hidden" />

      {redundante ? null : (
        <div
          ref={barra}
          data-foco-condicional=""
          className="fixed inset-x-0 bottom-0 z-10 bg-forest px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-sm sm:hidden"
        >
          <Link
            href={`${href}#donaciones`}
            className="flex min-h-touch w-full items-center justify-center rounded-pill bg-sage px-lg font-ui text-subheading font-medium text-forest"
            onClick={() => {
              track({ name: "ayudar_click", props: { origen: "barra" } });
            }}
          >
            {label} →
          </Link>
        </div>
      )}
    </>
  );
}
