"use client";

import { useCallback, useId, useState } from "react";

import { ArgentinaTransfer, ChileTransfer } from "@/components/campaign/bank-transfer";
import { ExternalPayment } from "@/components/campaign/external-payment";
import { BrandLabel } from "@/components/design-system/brand-mark";
import { cn } from "@/components/design-system/cn";
import type {
  AccountContent,
  CatalogContent,
  HelpContent,
  UiContent,
} from "@/content/schema";
import { isCoverChannel, type CoverChannel } from "@/src/domain/cover";
import type { Money } from "@/src/domain/money";
import { track } from "@/src/infrastructure/analytics/browser";
import type { Locale } from "@/src/i18n/locale";

import { ClaimForm } from "./claim-form";
import { CoverAmounts } from "./cover-amount";

/**
 * Cómo donar un ítem: traer el mismo bien o cubrirlo con plata (ADR-044).
 *
 * Los datos de un medio de pago aparecen sólo cuando ese canal está elegido.
 * Sin JavaScript lo hace `:has()` sobre el radio.
 */
export function HowToDonate({
  itemId,
  remaining,
  estimated,
  copy,
  account,
  help,
  ui,
  locale,
}: {
  itemId: string;
  remaining: number;
  estimated: Money | null;
  copy: CatalogContent;
  account: AccountContent;
  help: HelpContent;
  ui: UiContent;
  locale: Locale;
}) {
  const [extra, setExtra] = useState("");
  const [channel, setChannel] = useState<CoverChannel>("bring");

  const onCopied = useCallback((campo: string) => {
    track({ name: "dato_copiado", props: { pais: "AR", campo } });
  }, []);

  return (
    <section
      className={cn(
        "mt-2xl border-t border-rule pt-lg",
        "[&:not(:has([name=canal][value=transfer]:checked))_[data-pay=transfer]]:hidden",
        "[&:not(:has([name=canal][value=mercadopago]:checked))_[data-pay=mercadopago]]:hidden",
        "[&:not(:has([name=canal][value=paypal]:checked))_[data-pay=paypal]]:hidden",
      )}
    >
      <h2 className="font-ui text-body-large font-medium">{copy.coverTitle}</h2>
      <p className="mt-sm max-w-measure text-body text-ink-muted">{copy.coverLead}</p>
      {estimated === null ? (
        <p className="mt-md max-w-measure font-ui text-body">{copy.coverNoEstimate}</p>
      ) : (
        <CoverAmounts
          unit={estimated}
          quantity={1}
          extra={extra}
          onExtraChange={setExtra}
          copy={copy}
          locale={locale}
          channel={channel}
        />
      )}
      <ClaimForm
        itemId={itemId}
        remaining={remaining}
        copy={copy}
        account={account}
        locale={locale}
        submitLabel={copy.donateCta}
        pendingLabel={copy.coverClaiming}
      >
        <ChannelRadios copy={copy} onChannel={setChannel} />
        <div className="space-y-lg pt-md">
          <div data-pay="transfer" className="grid gap-md">
            <ArgentinaTransfer account={help.accounts.AR} onCopied={onCopied} />
            <ChileTransfer
              account={help.accounts.CL}
              onCopied={(campo) => {
                track({ name: "dato_copiado", props: { pais: "CL", campo } });
              }}
            />
          </div>
          <div data-pay="mercadopago" className="grid gap-md">
            <ExternalPayment
              brand="mercadopago"
              name={ui.home.mercadoPago}
              lead={ui.home.mercadoPagoLead}
              cta={ui.home.mercadoPagoCta}
              context={ui.countries.AR}
              country="AR"
              url={help.mercadoPagoUrl.AR}
            />
            <ExternalPayment
              brand="mercadopago"
              name={ui.home.mercadoPago}
              lead={ui.home.mercadoPagoLead}
              cta={ui.home.mercadoPagoCta}
              context={ui.countries.CL}
              country="CL"
              url={help.mercadoPagoUrl.CL}
            />
          </div>
          <div data-pay="paypal">
            <ExternalPayment
              brand="paypal"
              name={ui.home.paypal}
              lead={ui.home.paypalLead}
              cta={ui.home.paypalCta}
              url={help.paypalUrl}
            />
          </div>
        </div>
      </ClaimForm>
    </section>
  );
}

function ChannelRadios({
  copy,
  onChannel,
}: {
  copy: CatalogContent;
  onChannel: (channel: CoverChannel) => void;
}) {
  const id = useId();
  const options: {
    value: CoverChannel;
    label: string;
    brand: "mercadopago" | "paypal" | null;
  }[] = [
    { value: "bring", label: copy.coverBringChannel, brand: null },
    { value: "transfer", label: copy.coverTransferChannel, brand: null },
    {
      value: "mercadopago",
      label: copy.coverMercadoPagoChannel,
      brand: "mercadopago",
    },
    { value: "paypal", label: copy.coverPaypalChannel, brand: "paypal" },
  ];

  return (
    <fieldset className="space-y-2xs">
      <legend className="font-ui text-small font-medium text-ink">{copy.coverHow}</legend>
      <div className="flex flex-col gap-sm">
        {options.map((option) => (
          <div key={option.value} className="flex min-h-touch items-center gap-xs">
            <input
              id={`${id}-${option.value}`}
              name="canal"
              type="radio"
              value={option.value}
              defaultChecked={option.value === "bring"}
              onChange={(event) => {
                if (isCoverChannel(event.target.value)) {
                  onChannel(event.target.value);
                }
              }}
              className="size-md border-rule accent-forest"
            />
            <label
              htmlFor={`${id}-${option.value}`}
              className="flex items-center gap-xs font-ui text-small text-ink"
            >
              {option.brand === null ? (
                option.label
              ) : (
                <BrandLabel id={option.brand}>{option.label}</BrandLabel>
              )}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
