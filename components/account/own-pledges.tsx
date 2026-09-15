"use client";

import { cancelOwnPledgeAction } from "@/app/(es)/catalogo/actions";
import { LocaleField, SubmitButton } from "@/components/account/fields";
import { SecondaryAction } from "@/components/design-system/actions";
import { formatLongDate } from "@/components/design-system/dates";
import type { AccountContent, CatalogContent } from "@/content/schema";
import { isActivePledge, type OwnPledge } from "@/src/domain/entities/donation-pledge";
import { fill } from "@/src/i18n/fill";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * Las reservas propias, con vencimiento y la salida de cancelar.
 */
export function OwnPledges({
  pledges,
  copy,
  catalog,
  locale,
}: {
  pledges: readonly OwnPledge[];
  copy: AccountContent["profile"];
  catalog: CatalogContent;
  locale: Locale;
}) {
  if (pledges.length === 0) {
    return (
      <div className="max-w-measure space-y-lg">
        <p className="text-body text-ink-muted">{copy.pledgesEmpty}</p>
        <SecondaryAction href={localizedHref("/catalogo", locale)}>
          {catalog.title}
        </SecondaryAction>
      </div>
    );
  }

  const dateLocale = locale === "es" ? "es-AR" : "en-US";

  return (
    <ul className="divide-y divide-rule">
      {pledges.map((pledge) => {
        const when = formatLongDate(pledge.expiresAt.slice(0, 10), dateLocale);
        const unit = unitLabel(catalog, pledge.itemTitle, pledge.quantity);
        const quantity = fill(copy.pledgeQuantity, {
          count: String(pledge.quantity),
          unit,
        });
        const status =
          pledge.status === "expired"
            ? fill(copy.pledgeExpired, { when })
            : pledge.status === "cancelled"
              ? copy.pledgeCancelled
              : pledge.status === "fulfilled"
                ? copy.pledgeFulfilled
                : fill(copy.pledgeExpires, { when });

        return (
          <li key={pledge.id} className="py-lg">
            <p className="font-ui text-body text-ink">{pledge.itemTitle}</p>
            <p className="mt-2xs font-ui text-small tabular-nums text-ink-muted">
              {quantity}
            </p>
            <p className="mt-2xs font-ui text-small text-ink-muted">{status}</p>
            {pledge.contactName === null ? null : (
              <p className="mt-2xs font-ui text-small text-ink-muted">
                {fill(copy.pledgeContact, { name: pledge.contactName })}
              </p>
            )}
            {pledge.contactPhone === null ? null : (
              <p className="mt-2xs font-ui text-small text-ink-muted">
                {fill(copy.pledgePhone, { phone: pledge.contactPhone })}
              </p>
            )}
            {pledge.pickupAddress === null ? null : (
              <p className="mt-2xs font-ui text-small text-ink-muted">
                {fill(copy.pledgeAddress, { address: pledge.pickupAddress })}
              </p>
            )}
            {isActivePledge(pledge) ? (
              <form action={cancelOwnPledgeAction} className="mt-md">
                <LocaleField locale={locale} />
                <input type="hidden" name="pledgeId" value={pledge.id} />
                <SubmitButton tone="danger" pendingLabel={copy.cancellingPledge}>
                  {copy.cancelPledge}
                </SubmitButton>
              </form>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function unitLabel(copy: CatalogContent, _title: string, count: number): string {
  const forms = copy.units.unidad;

  return count === 1 ? forms.one : forms.other;
}
