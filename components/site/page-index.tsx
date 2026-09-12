import Link from "next/link";

import { Container } from "@/components/design-system/layout";

import { PRIMARY_NAV } from "./navigation";

/**
 * El sumario del documento: qué hay en el sitio, con una línea de cada cosa.
 *
 * Existe porque en un teléfono el encabezado no puede llevar seis secciones y el
 * pie está a catorce pantallas. La respuesta no es esconderlas detrás de un menú:
 * es ponerlas **en el documento**, que es lo que hace una publicación impresa
 * cuando tiene más de una sección (ADR-021).
 *
 * Va inmediatamente después de la apertura de la home, y se retira en `lg`, donde
 * las mismas seis rutas ya están visibles en el encabezado. No es un menú
 * duplicado: es el mismo recurso resuelto donde cabe.
 *
 * Cada enlace lleva su nombre y qué hay ahí. Una lista de seis títulos no le dice
 * a nadie a dónde conviene ir primero, y «ver más» no es un nombre.
 */
export function PageIndex() {
  return (
    /* El nombre lo distingue del encabezado y del pie a propósito: tres puntos de
       navegación con el mismo nombre son tres landmarks indistinguibles para quien
       navega por landmarks, y el sumario y el pie conviven en el teléfono. */
    <Container as="nav" aria-label="Índice de secciones" className="lg:hidden">
      <ul className="border-t border-rule">
        {PRIMARY_NAV.map((item) => (
          <li key={item.href} className="border-b border-rule">
            <Link
              href={item.href}
              className="flex min-h-touch flex-col justify-center py-md transition-colors duration-fast hover:bg-paper-sunk"
            >
              <span className="font-prose text-subheading font-medium text-ink">
                {item.label}
              </span>
              <span className="mt-3xs max-w-measure font-ui text-small text-ink-muted">
                {item.summary}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
