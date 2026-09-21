import type { NamedTake } from "@/src/domain/catalog";
import { isCountableUnit } from "@/src/domain/catalog";
import type { DonationUnit } from "@/src/domain/entities";
import { formatPercentage } from "@/src/domain/percentage";
import { fill } from "@/src/i18n/fill";

import { unitLabel } from "./units";

export function formatTakenLine(
  entry: NamedTake,
  unit: DonationUnit,
  copy: {
    readonly namedShare: string;
    readonly namedQuantity: string;
    readonly units: {
      readonly [K in DonationUnit]: { readonly one: string; readonly other: string };
    };
  },
): string {
  if (isCountableUnit(unit)) {
    return fill(copy.namedQuantity, {
      name: entry.name,
      quantity: String(entry.quantity),
      unit: unitLabel(copy, unit, entry.quantity),
    });
  }

  if (entry.percentOfItem === null) {
    return entry.name;
  }

  return fill(copy.namedShare, {
    name: entry.name,
    percent: formatPercentage(entry.percentOfItem),
  });
}
