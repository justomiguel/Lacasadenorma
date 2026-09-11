import type { ReactNode } from "react";

import { Container } from "@/components/design-system/layout";

/**
 * Encabezado de una página interior: sobrelínea, título y bajada.
 *
 * La sobrelínea no es un encabezado, es una etiqueta: si fuera un `h2` antes del
 * `h1` rompería la jerarquía del documento. Hay un solo `h1` por página, y es
 * este.
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
  label: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-rule">
      <Container className="pb-2xl pt-2xl lg:pb-3xl">
        <p className="font-ui text-label uppercase tracking-label text-ink-muted">
          {label}
        </p>
        <h1 className="mt-md max-w-measure font-prose text-title">{title}</h1>
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
