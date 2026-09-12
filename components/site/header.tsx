"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { site } from "@/content";
import { Container } from "@/components/design-system/layout";

import { PRIMARY_NAV } from "./navigation";

/**
 * Encabezado: el nombre del proyecto, las secciones y la acción de ayudar.
 *
 * **Sigue sin haber menú hamburguesa**, y ésa parte de la decisión original se
 * mantiene: un menú oculto agrega un toque y JavaScript para esconder ocho
 * enlaces. Lo que no se sostuvo es la otra mitad —«la navegación completa vive en
 * el pie»—. En la home el pie está a 11 497 px de la apertura en un teléfono de
 * 360 px, casi quince pantallas, y ése era el único lugar del sitio donde se decía
 * que había otras páginas. La familia lo dijo así: «no veo clara la navegación»
 * ([ADR-021](../../docs/adr/021-segunda-direccion-visual.md)).
 *
 * Así que las secciones aparecen acá **desde el breakpoint `lg`**, que es donde
 * las seis entran en una línea sin apretarse. Abajo de eso el encabezado se queda
 * con el nombre y *Ayudar*, y la navegación vive en el documento, como sumario
 * ([`PageIndex`](./page-index.tsx)): una lista real, nada escondido detrás de un
 * toque.
 *
 * Es un componente de cliente sólo por `aria-current`: marcar la página actual
 * necesita saber en qué ruta estamos. Sin eso, quien navega con lector de pantalla
 * escucha seis enlaces sin saber en cuál está parado.
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <Container as="header" className="flex items-baseline justify-between gap-lg py-lg">
      <Link
        href="/"
        className="shrink-0 font-prose text-subheading font-medium tracking-tight text-ink"
      >
        {site.name}
      </Link>

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
    </Container>
  );
}
