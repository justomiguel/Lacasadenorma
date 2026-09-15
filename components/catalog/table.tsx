import { InlineLink } from "@/components/design-system/actions";
import { cn } from "@/components/design-system/cn";
import type { CatalogContent } from "@/content/schema";
import { isCovered, takenStatus } from "@/src/domain/catalog";
import type { CatalogClaim, DonationItem } from "@/src/domain/entities";
import { fill } from "@/src/i18n/fill";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

import { unitLabel } from "./units";

/**
 * El listado de lo que falta: una tabla por categoría.
 *
 * Foto, descripción y formulario viven en la ficha. Acá se escanea: qué, cuánto,
 * si alguien ya la tomó, y el nombre o no (FR-209, FR-254, FR-255).
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
    <table className="w-full border-collapse text-left">
      <caption className="mb-md text-left font-ui text-small text-ink-muted">
        {copy.tableCaption}
      </caption>
      <thead className="hidden md:table-header-group">
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
          <th scope="col" className="py-sm font-ui text-label text-ink-muted">
            {copy.columnName}
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

  return (
    <tr
      id={`item-${item.id}`}
      className="block scroll-mt-xl border-b border-rule py-md md:table-row md:py-0"
    >
      <th
        scope="row"
        className="block py-3xs text-left text-body font-normal md:table-cell md:py-sm md:pr-md"
      >
        <InlineLink href={localizedHref(`/catalogo/${item.id}`, locale)}>
          {item.title}
        </InlineLink>
      </th>
      <td
        className={cn(
          "block py-3xs font-ui text-small tabular-nums md:table-cell md:py-sm md:pr-md",
          covered ? "text-ink-muted" : "text-ink",
        )}
      >
        {quantityText}
      </td>
      <td className="block py-3xs font-ui text-small md:table-cell md:py-sm md:pr-md">
        {taken.taken ? copy.takenYes : copy.takenNo}
      </td>
      <td className="block py-3xs font-ui text-small text-ink-muted md:table-cell md:py-sm">
        {names.length === 0 ? copy.nameNone : names}
      </td>
    </tr>
  );
}
