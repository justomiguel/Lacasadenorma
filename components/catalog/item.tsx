import { EditorialImage } from "@/components/design-system/editorial-image";
import { ReservedSpace } from "@/components/design-system/photo";
import type { AccountContent, CatalogContent } from "@/content/schema";
import { canClaim, isCovered } from "@/src/domain/catalog";
import type { DonationItem, DonationUnit } from "@/src/domain/entities";
import type { Locale } from "@/src/i18n/locale";
import { fill } from "@/src/i18n/fill";

import { ClaimForm } from "./claim-form";

/**
 * Un renglón del catálogo. Foto o hueco, título, cuánto falta, y el formulario
 * para anotarse cuando queda algo.
 */
export function CatalogItem({
  item,
  copy,
  account,
  locale,
}: {
  item: DonationItem;
  copy: CatalogContent;
  account: AccountContent;
  locale: Locale;
}) {
  const quantities = {
    needed: item.neededQuantity,
    reserved: item.neededQuantity - item.remainingQuantity - item.fulfilledQuantity,
    fulfilled: item.fulfilledQuantity,
  };
  const covered = isCovered(quantities);
  const unit = unitLabel(copy, item.unit, item.remainingQuantity);
  const remainingText = covered
    ? copy.covered
    : fill(copy.remaining, {
        count: String(item.remainingQuantity),
        unit,
      });

  return (
    <article id={`item-${item.id}`} className="scroll-mt-xl border-t border-rule py-xl">
      {item.photo === null ? (
        <ReservedSpace
          ratio="landscape"
          description={fill(copy.reservedPhoto, { title: item.title })}
        />
      ) : (
        <EditorialImage media={item.photo} variant="documentary" caption={false} />
      )}
      <h2 className="mt-lg font-display text-heading">{item.title}</h2>
      {item.description === null ? null : (
        <p className="mt-sm max-w-measure text-body text-ink-muted">{item.description}</p>
      )}
      <p className="mt-md font-ui text-body tabular-nums">{remainingText}</p>
      {canClaim(quantities) ? (
        <ClaimForm
          itemId={item.id}
          remaining={item.remainingQuantity}
          copy={copy}
          account={account}
          locale={locale}
        />
      ) : null}
    </article>
  );
}

export function CatalogLoading({ message }: { message: string }) {
  return (
    <p className="max-w-measure text-body text-ink-muted" aria-busy="true">
      {message}
    </p>
  );
}

function unitLabel(copy: CatalogContent, unit: DonationUnit, count: number): string {
  const forms = copy.units[unit];

  return count === 1 ? forms.one : forms.other;
}
