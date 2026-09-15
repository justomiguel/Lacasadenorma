import Image from "next/image";

import { InlineLink, SecondaryAction } from "@/components/design-system/actions";
import { cn } from "@/components/design-system/cn";
import type { Photograph } from "@/components/design-system/photo";
import type { CatalogContent } from "@/content/schema";
import { catalogItemPhotograph, isCovered, takenStatus } from "@/src/domain/catalog";
import { netCoverAmount } from "@/src/domain/cover";
import type { CatalogClaim, DonationItem } from "@/src/domain/entities";
import { fill } from "@/src/i18n/fill";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

import { formatCatalogEstimate } from "./money";
import { unitLabel } from "./units";

/**
 * El listado de lo que falta: una tabla por categoría, también en el teléfono
 * (ADR-044). El scroll de costado vive adentro: la página no desborda.
 *
 * En Qué va una miniatura cuando hay foto (ADR-043). Descripción, epígrafe y
 * formulario viven en la ficha. Acá se escanea: qué, cuánto, si alguien ya la
 * tomó, el estimado, y «Quiero donar».
 */
export function CatalogTable({
  items,
  claims,
  copy,
  locale,
}: {
  items: readonly DonationItem[];
  claims: readonly CatalogClaim[];
  copy: CatalogContent;
  locale: Locale;
}) {
  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain">
      <table className="w-full border-collapse text-left">
        <caption className="mb-md text-left font-ui text-small text-ink-muted">
          {copy.tableCaption}
        </caption>
        <thead className="table-header-group">
          <tr className="border-b border-rule">
            <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
              {copy.columnItem}
            </th>
            <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
              {copy.columnQuantity}
            </th>
            <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
              {copy.columnTaken}
            </th>
            <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
              {copy.columnName}
            </th>
            <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
              {copy.columnUnitPrice}
            </th>
            <th scope="col" className="py-sm pr-md font-ui text-label text-ink-muted">
              {copy.columnTotal}
            </th>
            <th scope="col" className="py-sm font-ui text-label text-ink-muted">
              {copy.columnDonate}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <CatalogRow
              key={item.id}
              item={item}
              claims={claims}
              copy={copy}
              locale={locale}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CatalogRow({
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
  const quantities = {
    needed: item.neededQuantity,
    reserved: item.neededQuantity - item.remainingQuantity - item.fulfilledQuantity,
    fulfilled: item.fulfilledQuantity,
  };
  const covered = isCovered(quantities);
  const taken = takenStatus(item, claims);
  const unit = unitLabel(
    copy,
    item.unit,
    covered ? item.neededQuantity : item.remainingQuantity,
  );
  const quantityText = covered
    ? copy.covered
    : fill(copy.quantityOf, {
        remaining: String(item.remainingQuantity),
        needed: String(item.neededQuantity),
        unit,
      });
  const names = taken.names.join(", ");
  const href = localizedHref(`/catalogo/${item.id}`, locale);
  const photo = catalogItemPhotograph<Photograph>(
    item.photo,
    copy.referencePhotos[item.title] ?? null,
  );
  const unitPrice =
    item.estimatedValue === null
      ? copy.nameNone
      : formatCatalogEstimate(item.estimatedValue, locale);
  const totalPrice =
    item.estimatedValue === null || item.remainingQuantity <= 0
      ? copy.nameNone
      : formatCatalogEstimate(
          netCoverAmount(item.estimatedValue, item.remainingQuantity),
          locale,
        );

  return (
    <tr id={`item-${item.id}`} className="scroll-mt-xl border-b border-rule">
      <th
        scope="row"
        className="min-w-0 max-w-quote py-sm pr-md text-left text-body font-normal"
      >
        <div className="flex min-w-0 items-start gap-sm">
          {photo === null ? null : (
            <Image
              src={photo.url}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="96px"
              className="h-auto w-5xl shrink-0"
            />
          )}
          <InlineLink href={href} className="min-w-0">
            {item.title}
          </InlineLink>
        </div>
      </th>
      <td
        className={cn(
          "py-sm pr-md font-ui text-small tabular-nums whitespace-nowrap",
          covered ? "text-ink-muted" : "text-ink",
        )}
      >
        {quantityText}
      </td>
      <td className="py-sm pr-md font-ui text-small whitespace-nowrap">
        {taken.taken ? copy.takenYes : copy.takenNo}
      </td>
      <td className="min-w-0 max-w-quote py-sm pr-md font-ui text-small text-ink-muted">
        {names.length === 0 ? copy.nameNone : names}
      </td>
      <td className="py-sm pr-md font-ui text-small tabular-nums whitespace-nowrap">
        {unitPrice}
      </td>
      <td className="py-sm pr-md font-ui text-small tabular-nums whitespace-nowrap">
        {totalPrice}
      </td>
      <td className="py-sm font-ui text-small whitespace-nowrap">
        {covered ? (
          copy.nameNone
        ) : (
          <SecondaryAction
            href={href}
            className="text-small"
            aria-label={fill(copy.donateCtaLabel, { title: item.title })}
          >
            {copy.donateCta}
          </SecondaryAction>
        )}
      </td>
    </tr>
  );
}
