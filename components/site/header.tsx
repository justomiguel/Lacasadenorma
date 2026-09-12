import Link from "next/link";

import { site } from "@/content";
import { Container } from "@/components/design-system/layout";

import { HeaderNav } from "./header-nav";

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
 * Este archivo es de servidor y por eso puede leer `@/content`. Los enlaces que
 * necesitan la ruta actual viven en [`HeaderNav`](./header-nav.tsx), que sí es de
 * cliente; ahí está explicado por qué la frontera va en ese punto y no acá.
 */
export function SiteHeader() {
  return (
    <Container as="header" className="flex items-baseline justify-between gap-lg py-lg">
      <Link
        href="/"
        className="shrink-0 font-prose text-subheading font-medium tracking-tight text-ink"
      >
        {site.name}
      </Link>

      <HeaderNav />
    </Container>
  );
}
