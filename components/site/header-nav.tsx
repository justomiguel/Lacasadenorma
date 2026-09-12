"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PRIMARY_NAV } from "./navigation";

/**
 * Los enlaces del encabezado que necesitan saber en qué página estamos.
 *
 * Marcar la página actual con `aria-current` requiere la ruta, y en Next 16 la
 * ruta sólo se puede leer en el navegador. Así que hay JavaScript de cliente acá
 * y nada más que acá: el encabezado sigue siendo un componente de servidor.
 *
 * Esa frontera importa por peso, no por elegancia. Cuando `"use client"` estaba
 * en el encabezado, el archivo importaba `site` desde `@/content`, y con eso
 * cruzaban al navegador los diez JSON de contenido y Zod entero: 408 KB sin
 * comprimir, casi 100 KB comprimidos, arriba del presupuesto de scripts. Este
 * archivo importa `PRIMARY_NAV`, que es un arreglo de dieciocho cadenas, y
 * `next/navigation`, que `Link` ya traía.
 *
 * Devuelve dos hermanos y no un contenedor: son dos hijos del flex del
 * encabezado, con el nombre del sitio empujándolos a la derecha.
 */
export function HeaderNav() {
  const pathname = usePathname();

  return (
    <>
      <nav aria-label="Principal" className="hidden lg:block">
        <ul className="flex items-baseline gap-lg">
          {/* Sin `/ayudar`: es la acción de la derecha, y tenerla también en la lista
              ponía dos enlaces al mismo destino en la misma línea. El pie y el
              sumario sí la listan, porque ahí no hay acción con la que se duplique. */}
          {PRIMARY_NAV.filter((item) => item.href !== "/ayudar").map((item) => {
            const actual = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  {...(actual ? { "aria-current": "page" } : {})}
                  className={
                    actual
                      ? "inline-flex min-h-touch items-center font-ui text-small text-ink underline decoration-brick decoration-2 underline-offset-4"
                      : "inline-flex min-h-touch items-center font-ui text-small text-ink-muted transition-colors duration-fast hover:text-ink"
                  }
                >
                  {item.shortLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* La acción también se marca cuando es la página abierta. Es la única ruta
          primaria que no está en la lista de arriba, y si no se marcara acá sería
          la única del sitio donde el lector de pantalla no sabe dónde está. */}
      <Link
        href="/ayudar"
        {...(pathname === "/ayudar" ? { "aria-current": "page" } : {})}
        className="inline-flex min-h-touch shrink-0 items-center font-ui text-small font-medium text-brick underline decoration-1 underline-offset-4 transition-colors duration-fast hover:text-brick-strong"
      >
        Ayudar
      </Link>
    </>
  );
}
