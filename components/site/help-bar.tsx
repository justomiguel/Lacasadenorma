"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Barra inferior persistente en mobile con la acción de ayudar.
 *
 * Dos decisiones que la hacen aceptable:
 *
 * 1. **No tapa contenido.** Renderiza un espaciador en el flujo del documento con
 *    la misma altura que la barra fija, así que el final de la página siempre se
 *    puede leer.
 * 2. **Desaparece en la propia página de aportes**, donde sería una acción que
 *    lleva a donde ya estás.
 *
 * Sólo existe hasta el breakpoint `sm`: en desktop el encabezado ya está a la
 * vista y una barra fija sería ruido.
 */
export function HelpBar() {
  const pathname = usePathname();

  if (pathname === "/ayudar") {
    return null;
  }

  return (
    <>
      <div aria-hidden="true" className="h-helpbar sm:hidden" />

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-rule bg-paper px-5 py-sm sm:hidden">
        <Link
          href="/ayudar"
          className="flex min-h-touch w-full items-center justify-center rounded-sm bg-brick px-lg font-ui text-subheading font-medium text-paper transition-colors duration-fast ease-editorial active:bg-brick-strong"
        >
          Ayudar a reconstruir
        </Link>
      </div>
    </>
  );
}
