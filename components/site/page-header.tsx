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
 * caja, que es el recurso con el que este sitio reemplaza a las cards.
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
    <Container as="header" className="border-b border-rule pb-2xl pt-2xl lg:pb-3xl">
      <p className="font-ui text-label uppercase tracking-label text-ink-muted">
        {label}
      </p>
      <h1 className="mt-md max-w-measure font-prose text-title">{title}</h1>
      {lead === undefined ? null : (
        <p className="mt-lg max-w-measure font-prose text-lead text-ink-muted">{lead}</p>
      )}
      {children}
    </Container>
  );
}
