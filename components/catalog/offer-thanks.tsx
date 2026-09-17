import { cn } from "@/components/design-system/cn";
import type { CatalogContent } from "@/content/schema";

/**
 * El teléfono reservó: el formulario se desmonta porque ya no queda cupo, y
 * el gracias tiene que vivir en la ficha (ADR-051). No es un diálogo: es el
 * estado diseñado, anunciado, con el mismo patrón que `?conflicto=1`.
 */
export function OfferThanksNotice({
  copy,
  className,
}: {
  copy: CatalogContent;
  className?: string;
}) {
  return (
    <div
      id="gracias"
      role="status"
      className={cn(
        "mb-xl max-w-measure border-l-2 border-l-forest bg-paper-sunk py-md pl-md pr-md",
        className,
      )}
    >
      <h2 className="font-ui text-subheading text-ink">{copy.offerThanksTitle}</h2>
      <p className="mt-sm text-body text-ink">{copy.offerThanksBody}</p>
    </div>
  );
}
