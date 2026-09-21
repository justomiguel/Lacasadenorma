import type { CatalogContent } from "@/content/schema";
import type { DonationUnit } from "@/src/domain/entities";

export function unitLabel(
  copy: Pick<CatalogContent, "units">,
  unit: DonationUnit,
  count: number,
): string {
  const forms = copy.units[unit];

  return count === 1 ? forms.one : forms.other;
}
