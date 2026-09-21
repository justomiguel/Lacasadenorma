"use client";

import Image from "next/image";

import {
  cancelOwnPledgeAction,
  updateOwnPledgeAction,
} from "@/app/(es)/catalogo/actions";
import { LocaleField, SubmitButton, TextField } from "@/components/account/fields";
import { unitLabel } from "@/components/catalog/units";
import { InlineLink, SecondaryAction } from "@/components/design-system/actions";
import { formatLongDate } from "@/components/design-system/dates";
import { PencilIcon, TrashIcon } from "@/components/design-system/icons";
import type { Photograph } from "@/components/design-system/photo";
import type { AccountContent, CatalogContent } from "@/content/schema";
import { catalogItemPhotograph, isCovered } from "@/src/domain/catalog";
import type { DonationItem } from "@/src/domain/entities";
import {
  canEditPledge,
  isVisibleOwnPledge,
  type OwnPledge,
} from "@/src/domain/entities/donation-pledge";
import { fill } from "@/src/i18n/fill";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * Las reservas propias que todavía importan: foto del tipo, tu estado y el del
 * ítem. Canceladas y vencidas no se listan.
 */
export function OwnPledges({
  pledges,
  items,
  copy,
  catalog,
  locale,
}: {
  pledges: readonly OwnPledge[];
  items: readonly DonationItem[];
  copy: AccountContent["profile"];
  catalog: CatalogContent;
  locale: Locale;
}) {
  const visible = pledges.filter(isVisibleOwnPledge);

  if (visible.length === 0) {
    return (
      <div className="max-w-measure space-y-lg">
        <p className="text-body text-ink-muted">{copy.pledgesEmpty}</p>
        <SecondaryAction href={localizedHref("/catalogo", locale)}>
          {catalog.title}
        </SecondaryAction>
      </div>
    );
  }

  const byId = new Map(items.map((entry) => [entry.id, entry]));

  return (
    <ul className="divide-y divide-rule">
      {visible.map((pledge) => (
        <OwnPledgeRow
          key={pledge.id}
          pledge={pledge}
          item={byId.get(pledge.itemId) ?? null}
          copy={copy}
          catalog={catalog}
          locale={locale}
        />
      ))}
    </ul>
  );
}

function OwnPledgeRow({
  pledge,
  item,
  copy,
  catalog,
  locale,
}: {
  pledge: OwnPledge;
  item: DonationItem | null;
  copy: AccountContent["profile"];
  catalog: CatalogContent;
  locale: Locale;
}) {
  const dateLocale = locale === "es" ? "es-AR" : "en-US";
  const when = formatLongDate(pledge.expiresAt.slice(0, 10), dateLocale);
  const unit = unitLabel(
    catalog,
    item?.unit ?? "unidad",
    pledge.quantity,
  );
  const quantity = fill(copy.pledgeQuantity, {
    count: String(pledge.quantity),
    unit,
  });
  const status =
    pledge.status === "fulfilled"
      ? copy.pledgeFulfilled
      : pledge.status === "accepted"
        ? copy.pledgeAccepted
        : fill(copy.pledgeExpires, { when });
  const photo = catalogItemPhotograph<Photograph>(
    item?.photo ?? null,
    catalog.referencePhotos[pledge.itemTitle] ?? null,
  );
  const itemFact =
    item === null
      ? null
      : isCovered({
            needed: item.neededQuantity,
            reserved:
              item.neededQuantity - item.remainingQuantity - item.fulfilledQuantity,
            fulfilled: item.fulfilledQuantity,
          })
        ? catalog.covered
        : fill(catalog.remainingFact, {
            remaining: String(item.remainingQuantity),
          });

  return (
    <li className="py-lg">
      <div className="flex items-start gap-sm">
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
          <InlineLink href={localizedHref(`/catalogo/${pledge.itemId}`, locale)}>
            {pledge.itemTitle}
          </InlineLink>
          <p className="mt-2xs font-ui text-small tabular-nums text-ink-muted">
            {`${quantity}. ${status}`}
          </p>
          {itemFact === null ? null : (
            <p className="mt-2xs font-ui text-small text-ink-muted">{itemFact}</p>
          )}
          {canEditPledge(pledge.status) ? (
            <>
              <form action={updateOwnPledgeAction} className="mt-md space-y-md">
                <LocaleField locale={locale} />
                <input type="hidden" name="pledgeId" value={pledge.id} />
                <TextField
                  name="cantidad"
                  label={catalog.quantity}
                  inputMode="numeric"
                  type="number"
                  defaultValue={String(pledge.quantity)}
                  {...(item === null
                    ? {}
                    : { max: pledge.quantity + item.remainingQuantity })}
                />
                <TextField
                  name="nota"
                  label={copy.pledgeNote}
                  hint={copy.pledgeNoteHint}
                  required={false}
                  defaultValue={pledge.donorNote ?? ""}
                  maxLength={500}
                />
                <SubmitButton icon={<PencilIcon />} pendingLabel={copy.savingPledge}>
                  {copy.editPledge}
                </SubmitButton>
              </form>
              <form action={cancelOwnPledgeAction} className="mt-md">
                <LocaleField locale={locale} />
                <input type="hidden" name="pledgeId" value={pledge.id} />
                <SubmitButton
                  icon={<TrashIcon />}
                  tone="danger"
                  pendingLabel={copy.cancellingPledge}
                >
                  {copy.cancelPledge}
                </SubmitButton>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}
