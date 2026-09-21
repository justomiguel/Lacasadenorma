import Image from "next/image";

import type { CatalogContent } from "@/content/schema";
import { takenStatus } from "@/src/domain/catalog";
import type { CatalogClaim, DonationItem } from "@/src/domain/entities";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

import { formatTakenLine } from "./taken-names";

export function CatalogDonors({
  item,
  claims,
  copy,
  locale,
}: {
  item: DonationItem;
  claims: readonly CatalogClaim[];
  copy: CatalogContent;
  locale: Locale;
}) {
  const taken = takenStatus(item, claims);

  if (taken.names.length === 0) {
    return null;
  }

  return (
    <ul className="mt-2xs flex flex-col gap-2xs" aria-label={copy.donorsLabel}>
      {taken.names.map((entry) => (
        <li key={entry.claimId} className="flex items-center gap-xs">
          {entry.hasPortrait ? (
            <Image
              src={localizedHref(`/catalogo/retrato/${entry.claimId}`, locale)}
              alt=""
              width={48}
              height={48}
              className="h-2xl w-2xl shrink-0 object-cover"
            />
          ) : null}
          <span className="font-ui text-small text-ink-faint">
            {formatTakenLine(entry, item.unit, copy)}
          </span>
        </li>
      ))}
    </ul>
  );
}
