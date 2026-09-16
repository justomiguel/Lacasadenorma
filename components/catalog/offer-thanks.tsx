import type { CatalogContent } from "@/content/schema";

/**
 * El teléfono reservó: el formulario se desmonta porque ya no queda cupo, y
 * el gracias tiene que vivir en la ficha (ADR-051). Mismo patrón que
 * `?conflicto=1`.
 */
export function OfferThanksNotice({ copy }: { copy: CatalogContent }) {
  return (
    <div className="mb-xl max-w-measure border-t border-rule pt-lg">
      <h2 className="font-ui text-subheading text-ink">{copy.offerThanksTitle}</h2>
      <p className="mt-sm text-body text-ink-muted">{copy.offerThanksBody}</p>
    </div>
  );
}
