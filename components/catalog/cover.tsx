"use client";

import { useCallback, useId, useState } from "react";

import { ArgentinaTransfer, ChileTransfer } from "@/components/campaign/bank-transfer";
import { ExternalPayment } from "@/components/campaign/external-payment";
import { BrandLabel } from "@/components/design-system/brand-mark";
import { cn } from "@/components/design-system/cn";
import { IdentifyingMark } from "@/components/design-system/identifying-mark";
import { ArrowIcon, BankIcon, BanknoteIcon, BoxIcon } from "@/components/design-system/icons";
import { useChromeSession } from "@/components/site/session";
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
import { OfferForm } from "./offer-form";

type DonatePath = "bring" | "money";

/**
 * Cómo donar un ítem: dos caminos a la vista (traer o cubrir con plata).
 * Los tres medios aparecen sólo en plata. Sin JavaScript lo hace `:has()`.
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
  const { session } = useChromeSession();
  const [extra, setExtra] = useState("");
  const [path, setPath] = useState<DonatePath>("bring");
  const [channel, setChannel] = useState<CoverChannel>("transfer");

  const onCopied = useCallback((campo: string) => {
    track({ name: "dato_copiado", props: { pais: "AR", campo } });
  }, []);

  return (
    <section
      className={cn(
        "mt-lg",
        "[&:not(:has([name=camino][value=bring]:checked))_[data-bring]]:hidden",
        "[&:not(:has([name=camino][value=money]:checked))_[data-money]]:hidden",
        "[&:not(:has([name=canal][value=transfer]:checked))_[data-pay=transfer]]:hidden",
        "[&:not(:has([name=canal][value=mercadopago]:checked))_[data-pay=mercadopago]]:hidden",
        "[&:not(:has([name=canal][value=paypal]:checked))_[data-pay=paypal]]:hidden",
      )}
    >
      <PathRadios copy={copy} onPath={setPath} />
      <div data-bring>
        <p className="mt-lg max-w-measure text-body text-ink-muted">
          {session.status === "signed-in" ? copy.bringSignedInLead : copy.bringLead}
        </p>
        {path === "bring" ? (
          session.status === "signed-in" ? (
            <ClaimForm
              itemId={itemId}
              remaining={remaining}
              copy={copy}
              account={account}
              locale={locale}
              submitLabel={copy.donateCta}
              pendingLabel={copy.coverClaiming}
            />
          ) : (
            <OfferForm itemId={itemId} copy={copy} account={account} locale={locale} />
          )
        ) : null}
      </div>
      <div data-money className="mt-lg">
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
        <PaymentRadios copy={copy} onChannel={setChannel} />
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
      </div>
    </section>
  );
}

function PathRadios({
  copy,
  onPath,
}: {
  copy: CatalogContent;
  onPath: (path: DonatePath) => void;
}) {
  const id = useId();
  const options: { value: DonatePath; label: string; mark: "bring" | "money" }[] = [
    { value: "bring", label: copy.coverBringChannel, mark: "bring" },
    { value: "money", label: copy.coverMoneyPath, mark: "money" },
  ];

  return (
    <fieldset>
      <legend className="sr-only">{copy.coverHow}</legend>
      <div>
        {options.map((option) => (
          <div
            key={option.value}
            className="flex min-h-touch items-center gap-sm border-t border-rule"
          >
            <input
              id={`${id}-${option.value}`}
              name="camino"
              type="radio"
              value={option.value}
              defaultChecked={option.value === "bring"}
              onChange={(event) => {
                if (event.target.value === "bring" || event.target.value === "money") {
                  onPath(event.target.value);
                }
              }}
              className="size-md border-rule accent-forest"
            />
            <label
              htmlFor={`${id}-${option.value}`}
              className="flex min-h-touch flex-1 items-center justify-between gap-sm font-ui text-body text-ink"
            >
              <span className="flex items-center gap-sm">
                <IdentifyingMark data-path-mark={option.mark} className="text-olive">
                  {option.mark === "bring" ? <BoxIcon /> : <BanknoteIcon />}
                </IdentifyingMark>
                {option.label}
              </span>
              <ArrowIcon />
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function PaymentRadios({
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
    { value: "transfer", label: copy.coverTransferChannel, brand: null },
    { value: "mercadopago", label: copy.coverMercadoPagoChannel, brand: "mercadopago" },
    { value: "paypal", label: copy.coverPaypalChannel, brand: "paypal" },
  ];

  return (
    <fieldset className="mt-lg space-y-2xs">
      <legend className="font-ui text-small font-medium text-ink">{copy.coverHow}</legend>
      <div className="flex flex-col gap-sm">
        {options.map((option) => (
          <div key={option.value} className="flex min-h-touch items-center gap-xs">
            <input
              id={`${id}-${option.value}`}
              name="canal"
              type="radio"
              value={option.value}
              defaultChecked={option.value === "transfer"}
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
                <>
                  <IdentifyingMark data-channel-mark={option.value} className="text-olive">
                    <BankIcon />
                  </IdentifyingMark>
                  {option.label}
                </>
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
