"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Barra inferior persistente en mobile con la acción de ayudar.
 *
 * Tres decisiones que la hacen aceptable:
 *
 * 1. **No tapa contenido.** Renderiza un espaciador en el flujo del documento con
 *    la misma altura que la barra fija, así que el final de la página siempre se
 *    puede leer. El espaciador está siempre, incluso cuando la barra se retira:
 *    reservar el alto de forma constante deja el desplazamiento de layout en cero.
 * 2. **Desaparece en la propia página de aportes**, donde sería una acción que
 *    lleva a donde ya estás.
 * 3. **Se retira mientras la acción primaria está en pantalla.** Sobre el pliegue
 *    de la home el botón *Ayudar a reconstruir* ya está a la vista, y la barra lo
 *    duplicaba: dos llamadas idénticas al mismo destino, cuatro elementos con
 *    acento donde el sistema admite tres (ux.md §12). El estado por omisión es
 *    *visible*: si el JavaScript no llega, la barra se comporta como antes.
 *
 * Sólo existe hasta el breakpoint `sm`: en desktop el encabezado ya está a la
 * vista y una barra fija sería ruido.
 */
export function HelpBar() {
  const pathname = usePathname();
  const barra = useRef<HTMLDivElement>(null);
  const [redundante, setRedundante] = useState(false);

  useEffect(() => {
    const acciones = document.querySelectorAll("[data-help-primary]");

    setRedundante(false);

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

      // Nunca se retira con el foco adentro: perder el foco de golpe deja a quien
      // navega con el teclado sin punto de referencia, y no hay forma de avisarle.
      if (barra.current?.contains(document.activeElement)) {
        return;
      }

      setRedundante(visibles.size > 0);
    });

    for (const accion of acciones) {
      observador.observe(accion);
    }

    return () => {
      observador.disconnect();
    };
  }, [pathname]);

  if (pathname === "/ayudar") {
    return null;
  }

  return (
    <>
      <div aria-hidden="true" className="h-helpbar sm:hidden" />

      {redundante ? null : (
        <div
          ref={barra}
          className="fixed inset-x-0 bottom-0 z-10 border-t border-rule bg-paper px-5 py-sm sm:hidden"
        >
          <Link
            href="/ayudar"
            className="flex min-h-touch w-full items-center justify-center rounded-sm bg-brick px-lg font-ui text-subheading font-medium text-paper transition-colors duration-fast ease-editorial active:bg-brick-strong"
          >
            Ayudar a reconstruir
          </Link>
        </div>
      )}
    </>
  );
}
