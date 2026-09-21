import Image from "next/image";

import { InlineLink, SecondaryAction } from "@/components/design-system/actions";
import type { Photograph } from "@/components/design-system/photo";
import type { CatalogContent } from "@/content/schema";
import { catalogItemPhotograph, isCovered } from "@/src/domain/catalog";
import { netCoverAmount } from "@/src/domain/cover";
import type { CatalogClaim, DonationItem } from "@/src/domain/entities";
import { fill } from "@/src/i18n/fill";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

import { CatalogDonors } from "./donors";
import { formatCatalogEstimate } from "./money";
import { unitLabel } from "./units";

/**
 * El listado de lo que falta: inventario editorial, no tabla. En el teléfono
 * cada ítem es una fila (foto, hecho, donar). Desde `lg` se suma el total.
 */
export function CatalogInventory({
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
    <ul className="max-w-full" aria-label={copy.listCaption}>
      {items.map((entry) => (
        <CatalogRow
          key={entry.id}
          item={entry}
          claims={claims}
          copy={copy}
          locale={locale}
        />
      ))}
    </ul>
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
  const unit = unitLabel(
    copy,
    item.unit,
    covered ? item.neededQuantity : item.remainingQuantity,
  );
  const remainingFact = fill(copy.remainingFact, {
    remaining: String(item.remainingQuantity),
  });
  const remainingOf = fill(copy.remainingOf, {
    needed: String(item.neededQuantity),
    unit,
  });
  const href = localizedHref(`/catalogo/${item.id}`, locale);
  const photo = catalogItemPhotograph<Photograph>(
    item.photo,
    copy.referencePhotos[item.title] ?? null,
  );
  const unitPrice =
    item.estimatedValue === null
      ? null
      : formatCatalogEstimate(item.estimatedValue, locale);
  const totalPrice =
    item.estimatedValue === null || item.remainingQuantity <= 0
      ? null
      : formatCatalogEstimate(
          netCoverAmount(item.estimatedValue, item.remainingQuantity),
          locale,
        );

  return (
    <li id={`item-${item.id}`} className="scroll-mt-xl border-b border-rule py-md">
      <div className="flex flex-col gap-sm lg:flex-row lg:items-center lg:gap-md">
        <div className="flex min-w-0 flex-1 items-start gap-sm">
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
          <div className="min-w-0">
            <InlineLink href={href}>{item.title}</InlineLink>
            {covered ? (
              <p className="mt-2xs font-ui text-small text-ink-muted">{copy.covered}</p>
            ) : (
              <p className="mt-2xs font-ui text-small text-ink-muted tabular-nums">
                {remainingFact}
                <span className="hidden lg:inline">{` ${remainingOf}`}</span>
                {unitPrice === null ? null : (
                  <span className="lg:hidden">{` · ${unitPrice}`}</span>
                )}
              </p>
            )}
            <CatalogDonors item={item} claims={claims} copy={copy} locale={locale} />
          </div>
        </div>
        {covered || totalPrice === null ? null : (
          <div className="hidden text-right lg:block">
            <p className="font-ui text-body tabular-nums">{totalPrice}</p>
            {unitPrice === null ? null : (
              <p className="mt-2xs font-ui text-small text-ink-muted">
                {fill(copy.estimatedUnit, { amount: unitPrice })}
              </p>
            )}
          </div>
        )}
        {covered ? null : (
          <SecondaryAction
            href={href}
            className="text-small"
            aria-label={fill(copy.donateCtaLabel, { title: item.title })}
          >
            {copy.donateCta}
          </SecondaryAction>
        )}
      </div>
    </li>
  );
}
