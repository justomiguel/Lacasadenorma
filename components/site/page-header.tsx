import type { ReactNode } from "react";

import { Container } from "@/components/design-system/layout";

/**
 * Encabezado de una página interior: título, bajada y —sólo si hace falta— una
 * sobrelínea.
 *
 * **`label` es opcional y casi nunca corresponde.** Las nueve páginas lo usaban, y
 * en ocho no decía nada que el título no dijera: «RENDICIÓN» arriba de
 * «Transparencia», «COLABORAR» arriba de «Cómo ayudar». Sumado a las de sección
 * eran 39 repeticiones del mismo patrón, y es uno de los delatores de página
 * generada que enumera la skill `frontend-design` (ADR-021). La única que sobrevive
 * es el oficio de Norma en su página, porque el título dice quién y la etiqueta dice
 * qué hacía.
 *
 * Y cuando corresponde **ya no va en versales espaciadas**: las versales para
 * etiquetas están en la misma lista de delatores, y en castellano con tildes se leen
 * peor. Va en la voz de interfaz, en tamaño chico, que alcanza para que se lea como
 * etiqueta y no como título.
 *
 * La sobrelínea no es un encabezado: si fuera un `h2` antes del `h1` rompería la
 * jerarquía del documento. Hay un solo `h1` por página, y es este.
 *
 * La regla inferior separa el encabezado del cuerpo sin encerrar nada en una
 * caja, que es el recurso con el que este sitio reemplaza a las cards. Va **a
 * sangrado**, fuera del margen del texto, igual que la que cierra la apertura de la
 * home y la que abre el pie: son las tres que marcan el final de una banda de la
 * página, y el sitio distingue esas de las que dividen contenido, que se alinean
 * con la columna (ux.md §4).
 */
export function PageHeader({
  label,
  title,
  lead,
  children,
}: {
  label?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-rule">
      <Container className="pb-2xl pt-2xl lg:pb-3xl">
        {label === undefined ? null : (
          <p className="mb-sm font-ui text-small text-ink-muted">{label}</p>
        )}
        <h1 className="max-w-measure font-display text-title">{title}</h1>
        {lead === undefined ? null : (
          <p className="mt-lg max-w-measure font-prose text-lead text-ink-muted">
            {lead}
          </p>
        )}
        {children}
      </Container>
    </header>
  );
}
