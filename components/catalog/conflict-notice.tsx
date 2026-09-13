import { Callout } from "@/components/design-system/callout";
import type { CatalogContent } from "@/content/schema";

/**
 * Alguien se adelantó: el estado diseñado, no un error genérico (US1, FR-212).
 *
 * Va arriba del listado actualizado. El catálogo al lado es la prueba de que
 * lo que quedó disponible es lo que se ve, no un mensaje huérfano.
 */
export function ConflictNotice({ copy }: { copy: CatalogContent }) {
  return (
    <Callout tone="warning" title={copy.conflictTitle} className="mb-xl">
      <p>{copy.conflictBody}</p>
    </Callout>
  );
}
