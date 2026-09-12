"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { localizedHref } from "@/src/i18n/href";
import { stripLocalePrefix } from "@/src/i18n/locale";

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
 *    lleva a donde ya estás. Compara la ruta canónica, así que `/en/ayudar`
 *    también la oculta.
 * 3. **Se retira mientras la acción primaria está en pantalla.** Sobre el pliegue
 *    de la home el botón *Ayudar a reconstruir* ya está a la vista, y la barra lo
 *    duplicaba: dos llamadas idénticas al mismo destino, cuatro elementos con
 *    acento donde el sistema admite tres (ux.md §12). El estado por omisión es
 *    *visible*: si el JavaScript no llega, la barra se comporta como antes.
 *
 * Sólo existe hasta el breakpoint `sm`: en desktop el encabezado ya está a la
 * vista y una barra fija sería ruido.
 *
 * `href` y `label` vienen del layout. Los valores por omisión son el castellano,
 * para que los tests de componente no tengan que armar el `UiProvider`.
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

  /**
   * La medición se guarda junto a la ruta en la que se hizo, y se descarta al
   * renderizar si la ruta cambió. Es lo que evita el reinicio dentro del efecto: en una
   * navegación de cliente el observador se rearma sobre el DOM nuevo, y hasta que
   * conteste hay un render con la medición de la página anterior, que diría "retirate"
   * en una página donde la acción primaria no está. Derivarlo acá cuesta una comparación
   * y no un render en cascada.
   */
  const [medicion, setMedicion] = useState<{ ruta: string; redundante: boolean } | null>(
    null,
  );

  const redundante =
    medicion !== null && medicion.ruta === pathname && medicion.redundante;

  useEffect(() => {
    const acciones = document.querySelectorAll("[data-help-primary]");

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
          // Declara que esta barra aparece y desaparece según el scroll. Lo consume el
          // recorrido con Tab de `e2e/comun/accesibilidad.spec.ts`, que verifica que
          // nada quede fuera del orden de tabulación y necesita saber qué elementos no
          // están siempre: al final de una página larga la acción primaria queda a la
          // vista, la barra se retira y su enlace nunca recibe el foco. No se pierde
          // nada, porque lo que la barra ofrece es justamente lo que está en pantalla.
          data-foco-condicional=""
          className="fixed inset-x-0 bottom-0 z-10 border-t border-rule bg-paper px-5 py-sm sm:hidden"
        >
          <Link
            href={href}
            className="flex min-h-touch w-full items-center justify-center rounded-sm bg-brick px-lg font-ui text-subheading font-medium text-paper transition-colors duration-fast ease-editorial active:bg-brick-strong"
          >
            {label}
          </Link>
        </div>
      )}
    </>
  );
}
