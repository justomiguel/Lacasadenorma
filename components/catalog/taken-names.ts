import type { NamedTake } from "@/src/domain/catalog";
import { formatPercentage } from "@/src/domain/percentage";
import { fill } from "@/src/i18n/fill";

/**
 * Cómo se nombra a quien tomó parte de un ítem: «Ana donó el 50%».
 * Sin % (truncado a 0, o anónimo que no llega acá) queda el nombre solo.
 */
export function formatTakenNames(
  names: readonly NamedTake[],
  copy: { readonly namedShare: string; readonly nameNone: string },
): string {
  if (names.length === 0) {
    return copy.nameNone;
  }

  return names
    .map((entry) =>
      entry.percentOfItem === null
        ? entry.name
        : fill(copy.namedShare, {
            name: entry.name,
            percent: formatPercentage(entry.percentOfItem),
          }),
    )
    .join(", ");
}
