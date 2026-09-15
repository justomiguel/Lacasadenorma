"use client";

import {
  useCallback,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { ArgentinaTransfer, ChileTransfer } from "@/components/campaign/bank-transfer";
import {
  CountrySelector,
  REGIONS,
  type DonationRegion,
} from "@/components/campaign/country-selector";
import { ExternalPayment } from "@/components/campaign/external-payment";
import { BrandLabel } from "@/components/design-system/brand-mark";
import type {
  AccountContent,
  CatalogContent,
  HelpContent,
  UiContent,
} from "@/content/schema";
import type { Money } from "@/src/domain/money";
import { track } from "@/src/infrastructure/analytics/browser";
import type { Locale } from "@/src/i18n/locale";

import { ClaimForm } from "./claim-form";
import { CoverAmounts } from "./cover-amount";

const NEVER_CHANGES = () => () => undefined;

function useHydrated(): boolean {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );
}

/**
 * Cubrir un ítem con plata: estimado no fijo, Mercado Pago con extra, y PayPal
 * también desde Argentina o Chile (ADR-041).
 */
export function CoverWithMoney({
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
  const enhanced = useHydrated();
  const [region, setRegion] = useState<DonationRegion>("AR");
  const [changed, setChanged] = useState(false);
  const baseId = useId();

  const onCopied = useCallback(
    (campo: string) => {
      track({ name: "dato_copiado", props: { pais: region, campo } });
    },
    [region],
  );

  const onRegion = useCallback((next: DonationRegion) => {
    setRegion(next);
    setChanged(true);
    track({ name: "metodo_visto", props: { pais: next } });
  }, []);

  const names: Record<DonationRegion, string> = {
    AR: ui.countries.AR,
    CL: ui.countries.CL,
    INT: ui.home.international,
  };

  const paypal = () => (
    <ExternalPayment
      brand="paypal"
      name={ui.home.paypal}
      lead={ui.home.paypalLead}
      cta={ui.home.paypalCta}
      url={help.paypalUrl}
    />
  );

  const panels: Record<DonationRegion, ReactNode> = {
    AR: (
      <div className="grid gap-md">
        <ArgentinaTransfer account={help.accounts.AR} onCopied={onCopied} />
        <ExternalPayment
          brand="mercadopago"
          name={ui.home.mercadoPago}
          lead={ui.home.mercadoPagoLead}
          cta={ui.home.mercadoPagoCta}
          context={ui.countries.AR}
          country="AR"
          url={help.mercadoPagoUrl.AR}
        />
        {paypal()}
      </div>
    ),
    CL: (
      <div className="grid gap-md">
        <ChileTransfer account={help.accounts.CL} onCopied={onCopied} />
        <ExternalPayment
          brand="mercadopago"
          name={ui.home.mercadoPago}
          lead={ui.home.mercadoPagoLead}
          cta={ui.home.mercadoPagoCta}
          context={ui.countries.CL}
          country="CL"
          url={help.mercadoPagoUrl.CL}
        />
        {paypal()}
      </div>
    ),
    INT: paypal(),
  };

  return (
    <section className="mt-2xl border-t border-rule pt-lg">
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
        />
      )}
      <ClaimForm
        itemId={itemId}
        remaining={remaining}
        copy={copy}
        account={account}
        locale={locale}
        submitLabel={copy.coverClaim}
        pendingLabel={copy.coverClaiming}
      >
        <ChannelRadios copy={copy} />
      </ClaimForm>
      <div className="mt-lg">
        {enhanced ? (
          <>
            <CountrySelector
              region={region}
              names={names}
              label={ui.home.donateTitle}
              baseId={baseId}
              onChange={onRegion}
            />
            <div
              key={region}
              role="tabpanel"
              id={`${baseId}-panel`}
              {...(changed ? { "data-tab-panel": "" } : {})}
              aria-labelledby={`${baseId}-tab-${region}`}
              className="pt-md"
            >
              {panels[region]}
            </div>
          </>
        ) : (
          <div className="space-y-2xl">
            {REGIONS.map((item) => (
              <section key={item} aria-labelledby={`${baseId}-heading-${item}`}>
                <h3
                  id={`${baseId}-heading-${item}`}
                  className="mb-md font-display text-section-title"
                >
                  {names[item]}
                </h3>
                {panels[item]}
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ChannelRadios({ copy }: { copy: CatalogContent }) {
  const id = useId();
  const options = [
    { value: "transfer", label: copy.coverTransferChannel, brand: null },
    {
      value: "mercadopago",
      label: copy.coverMercadoPagoChannel,
      brand: "mercadopago" as const,
    },
    { value: "paypal", label: copy.coverPaypalChannel, brand: "paypal" as const },
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
              defaultChecked={option.value === "mercadopago"}
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
