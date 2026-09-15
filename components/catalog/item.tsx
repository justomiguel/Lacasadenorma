import { BusyCue } from "@/components/design-system/busy";
import { EditorialImage } from "@/components/design-system/editorial-image";
import { ReservedSpace } from "@/components/design-system/photo";
import type {
  AccountContent,
  CatalogContent,
  HelpContent,
  UiContent,
} from "@/content/schema";
import { canClaim, isCovered, takenStatus } from "@/src/domain/catalog";
import type { CatalogClaim, DonationItem } from "@/src/domain/entities";
import { fill } from "@/src/i18n/fill";
import type { Locale } from "@/src/i18n/locale";

import { ClaimForm } from "./claim-form";
import { CoverWithMoney } from "./cover";
import { unitLabel } from "./units";

/**
 * La ficha de un ítem: foto o hueco, cuánto falta, quién se anotó con nombre,
 * y el formulario para reservar cuando queda algo (FR-254).
 */
export function CatalogItem({
  item,
  claims,
  copy,
  account,
  help,
  ui,
  locale,
  priority = false,
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
  const taken = takenStatus(item, claims);
  const unit = unitLabel(
    copy,
    item.unit,
    covered ? item.neededQuantity : item.remainingQuantity,
  );
  const remainingText = covered
    ? copy.covered
    : fill(copy.quantityOf, {
        remaining: String(item.remainingQuantity),
        needed: String(item.neededQuantity),
        unit,
      });
  const names = taken.names.join(", ");

  return (
    <article id={`item-${item.id}`} className="scroll-mt-xl">
      {item.photo === null ? (
        <ReservedSpace
          ratio="landscape"
          description={fill(copy.reservedPhoto, { title: item.title })}
        />
      ) : (
        <EditorialImage
          media={item.photo}
          variant="documentary"
          caption={false}
          priority={priority}
        />
      )}
      {item.description === null ? null : (
        <p className="mt-lg max-w-measure text-body text-ink-muted">{item.description}</p>
      )}
      <p className="mt-md font-ui text-body tabular-nums">{remainingText}</p>
      <p className="mt-sm font-ui text-small text-ink-muted">
        {copy.columnTaken} {taken.taken ? copy.takenYes : copy.takenNo}
        {". "}
        {copy.columnName} {names.length === 0 ? copy.nameNone : names}
      </p>
      {canClaim(quantities) ? (
        <>
          <ClaimForm
            itemId={item.id}
            remaining={item.remainingQuantity}
            copy={copy}
            account={account}
            locale={locale}
          />
          <CoverWithMoney
            itemId={item.id}
            remaining={item.remainingQuantity}
            estimated={item.estimatedValue}
            copy={copy}
            account={account}
            help={help}
            ui={ui}
            locale={locale}
          />
        </>
      ) : null}
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
