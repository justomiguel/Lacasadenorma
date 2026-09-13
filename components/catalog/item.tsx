import { EditorialImage } from "@/components/design-system/editorial-image";
import { ReservedSpace } from "@/components/design-system/photo";
import type { CatalogContent } from "@/content/schema";
import { isCovered } from "@/src/domain/catalog";
import type { DonationItem, DonationUnit } from "@/src/domain/entities";
import { fill } from "@/src/i18n/fill";

/**
 * Un renglón del catálogo. No es una tarjeta: foto o hueco, título, cuánto
 * falta. La reserva llega en la fase D; acá sólo se dice qué falta.
 */
export function CatalogItem({
  item,
  copy,
}: {
  item: DonationItem;
  copy: CatalogContent;
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
    <article className="border-t border-rule py-xl">
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
