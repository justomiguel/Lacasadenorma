"use client";

import { useCallback, useId, useRef, useState } from "react";

import { cn } from "@/components/design-system/cn";
import type { HelpContent, UiContent } from "@/content/schema";
import { track } from "@/src/infrastructure/analytics/browser";

import {
  CHANNELS,
  COUNTRIES,
  ChannelLabel,
  countryPanelClass,
  DonationCountryTabs,
  nextItem,
  useHydrated,
  type Channel,
  type Country,
} from "./donation-board-helpers";
import { ArgentinaFields, ChileFields, MercadoPagoCountryCard } from "./donation-fields";

/**
 * Donaciones del mockup: transferencia / Mercado Pago / PayPal, Argentina y Chile.
 *
 * Mercado Pago y PayPal se ven. El botón sólo existe si hay URL real.
 * Mercado Pago tiene un destino por país: Argentina y Chile no son el mismo link.
 */
export function DonationBoard({
  help,
  ui,
  className,
}: {
  help: HelpContent;
  ui: UiContent;
  className?: string;
}) {
  const enhanced = useHydrated();
  const [channel, setChannel] = useState<Channel>("transfer");
  const [country, setCountry] = useState<Country>("AR");
  const baseId = useId();
  const channelRefs = useRef(new Map<Channel, HTMLButtonElement>());

  const onCopied = useCallback(
    (campo: string) => {
      track({ name: "dato_copiado", props: { pais: country, campo } });
    },
    [country],
  );

  const onCountry = useCallback((next: Country) => {
    setCountry(next);
    track({ name: "metodo_visto", props: { pais: next } });
  }, []);

  const channelLabel: Record<Channel, string> = {
    transfer: ui.home.transfer,
    mercadopago: ui.home.mercadoPago,
    paypal: ui.home.paypal,
  };

  const countryTabs = enhanced ? (
    <DonationCountryTabs
      country={country}
      countryNames={ui.countries}
      label={ui.countryTabsLabel}
      onCountry={onCountry}
    />
  ) : null;

  function renderTransfer() {
    return (
      <div>
        {countryTabs}
        <div className="grid min-w-0 gap-3xl lg:grid-cols-2 lg:gap-2xl">
          <div className={countryPanelClass(enhanced, country, "AR")}>
            <ArgentinaFields account={help.accounts.AR} onCopied={onCopied} />
          </div>
          <div className={countryPanelClass(enhanced, country, "CL")}>
            <ChileFields account={help.accounts.CL} onCopied={onCopied} />
          </div>
        </div>
      </div>
    );
  }

  function renderMercadoPago() {
    return (
      <div>
        {countryTabs}
        <p className="mb-lg max-w-measure text-body text-ink-muted">
          {ui.home.mercadoPagoLead}
        </p>
        <div className="grid min-w-0 gap-3xl lg:grid-cols-2 lg:gap-2xl">
          {COUNTRIES.map((item) => (
            <div key={item} className={countryPanelClass(enhanced, country, item)}>
              <MercadoPagoCountryCard
                country={item}
                countryName={ui.countries[item]}
                cta={`${ui.home.mercadoPagoCta} ${ui.countries[item]}`}
                url={help.mercadoPagoUrl[item]}
                onOpen={() => {
                  track({
                    name: "medio_externo_click",
                    props: { medio: "mercadopago" },
                  });
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderPayPal() {
    return (
      <div className="rounded-md bg-paper-sunk p-lg">
        <h3 className="font-ui text-subheading font-medium">
          <ChannelLabel channel="paypal">{ui.home.paypal}</ChannelLabel>
        </h3>
        <p className="mt-sm max-w-measure text-body text-ink-muted">
          {ui.home.paypalLead}
        </p>
        {help.paypalUrl === null ? null : (
          <a
            href={help.paypalUrl}
            rel="noopener noreferrer"
            target="_blank"
            className="lift-hover mt-lg inline-flex min-h-touch items-center rounded-pill bg-forest px-lg font-ui text-small font-medium text-paper"
            onClick={() => {
              track({ name: "medio_externo_click", props: { medio: "paypal" } });
            }}
          >
            <ChannelLabel channel="paypal">{ui.home.paypalCta} →</ChannelLabel>
          </a>
        )}
      </div>
    );
  }

  function renderChannel(active: Channel) {
    if (active === "mercadopago") {
      return renderMercadoPago();
    }

    if (active === "paypal") {
      return renderPayPal();
    }

    return renderTransfer();
  }

  return (
    <div className={className}>
      {enhanced ? (
        <div
          role="tablist"
          aria-label={ui.home.donateTitle}
          className="mb-lg flex w-full gap-xs lg:w-auto lg:flex-wrap lg:gap-sm"
          onKeyDown={(event) => {
            const next = nextItem(CHANNELS, channel, event.key);

            if (next === null) {
              return;
            }

            event.preventDefault();
            setChannel(next);
            channelRefs.current.get(next)?.focus();
          }}
        >
          {CHANNELS.map((item) => {
            const selected = channel === item;

            return (
              <button
                key={item}
                ref={(node) => {
                  if (node === null) {
                    channelRefs.current.delete(item);
                  } else {
                    channelRefs.current.set(item, node);
                  }
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${item}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                className={cn(
                  "lift-hover inline-flex min-h-touch flex-1 items-center justify-center gap-xs rounded-pill px-md font-ui text-small lg:flex-none",
                  selected
                    ? "bg-forest text-paper"
                    : "border border-rule text-ink hover:border-forest",
                )}
                onClick={() => {
                  setChannel(item);
                }}
              >
                <ChannelLabel channel={item}>{channelLabel[item]}</ChannelLabel>
              </button>
            );
          })}
        </div>
      ) : null}

      {enhanced ? (
        <div
          key={channel}
          role="tabpanel"
          id={`${baseId}-panel`}
          data-tab-panel=""
          aria-labelledby={`${baseId}-tab-${channel}`}
        >
          {renderChannel(channel)}
        </div>
      ) : (
        <div className="space-y-3xl">
          <section>
            <h3 className="mb-md font-ui text-subheading font-medium">
              {ui.home.transfer}
            </h3>
            {renderChannel("transfer")}
          </section>
          <section>
            <h3 className="mb-md font-ui text-subheading font-medium">
              {ui.home.mercadoPago}
            </h3>
            {renderChannel("mercadopago")}
          </section>
          {renderChannel("paypal")}
        </div>
      )}
    </div>
  );
}
