import { BusyCue } from "@/components/design-system/busy";
import { EditorialImage } from "@/components/design-system/editorial-image";
import { ReservedSpace, type Photograph } from "@/components/design-system/photo";
import type {
  AccountContent,
  CatalogContent,
  HelpContent,
  UiContent,
} from "@/content/schema";
import { canClaim, catalogItemPhotograph, isCovered } from "@/src/domain/catalog";
import type { CatalogClaim, DonationItem } from "@/src/domain/entities";
import { fill } from "@/src/i18n/fill";
import type { Locale } from "@/src/i18n/locale";

import { HowToDonate } from "./cover";
import { CatalogDonors } from "./donors";
import { formatCatalogEstimate } from "./money";
import { unitLabel } from "./units";

/**
 * La ficha de un ítem: foto a sangrado, etiqueta (título, cuánto falta,
 * nombres) y dos caminos para donar. El h1 vive acá, no en PageHeader.
 */
export function CatalogItem({
  item,
  claims,
  copy,
  account,
  help,
  ui,
  locale,
  priority = true,
}: {
  item: DonationItem;
  claims: readonly CatalogClaim[];
  copy: CatalogContent;
  account: AccountContent;
  help: HelpContent;
  ui: UiContent;
  locale: Locale;
  priority?: boolean;
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
  const photo = catalogItemPhotograph<Photograph>(
    item.photo,
    copy.referencePhotos[item.title] ?? null,
  );
  const estimate =
    item.estimatedValue === null
      ? null
      : fill(copy.estimatedUnit, {
          amount: formatCatalogEstimate(item.estimatedValue, locale),
        });

  return (
    <article
      id={`item-${item.id}`}
      data-item-ficha=""
      className="scroll-mt-xl lg:grid lg:grid-cols-2 lg:items-start lg:gap-3xl"
    >
      <div>
        {photo === null ? (
          <ReservedSpace
            ratio="landscape"
            className="bleed"
            description={fill(copy.reservedPhoto, { title: item.title })}
          />
        ) : (
          <EditorialImage
            media={photo}
            variant="full-bleed"
            caption
            priority={priority}
            sizes="(min-width: 64rem) 40vw, 100vw"
          />
        )}
      </div>
      <div className="mt-lg lg:mt-0">
        <h1 className="max-w-measure font-display text-heading">{item.title}</h1>
        {covered ? (
          <p className="mt-md font-ui text-body">{copy.covered}</p>
        ) : (
          <p className="mt-md font-ui text-body tabular-nums">
            {fill(copy.remainingFact, { remaining: String(item.remainingQuantity) })}
            <span className="mt-2xs block text-small text-ink-muted">
              {fill(copy.remainingOf, {
                needed: String(item.neededQuantity),
                unit,
              })}
              {estimate === null ? null : ` · ${estimate}`}
            </span>
          </p>
        )}
        <CatalogDonors item={item} claims={claims} copy={copy} locale={locale} />
        {canClaim(quantities) ? (
          <HowToDonate
            itemId={item.id}
            remaining={item.remainingQuantity}
            estimated={item.estimatedValue}
            copy={copy}
            account={account}
            help={help}
            ui={ui}
            locale={locale}
          />
        ) : null}
        {item.description === null ? null : (
          <p className="mt-lg max-w-measure text-body text-ink-muted">
            {item.description}
          </p>
        )}
      </div>
    </article>
  );
}

export function CatalogLoading({ message }: { message: string }) {
  return (
    <div aria-busy="true">
      <BusyCue label={message} />
    </div>
  );
}
