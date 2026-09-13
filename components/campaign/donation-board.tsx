"use client";

import { useCallback, useId, useRef, useState, useSyncExternalStore } from "react";

import { CopyField } from "@/components/design-system/copy-field";
import { cn } from "@/components/design-system/cn";
import { useUiOptional } from "@/components/i18n/ui-provider";
import type { HelpContent, UiContent } from "@/content/schema";
import { track } from "@/src/infrastructure/analytics/browser";

const NEVER_CHANGES = () => () => undefined;

function useHydrated(): boolean {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );
}

type Channel = "transfer" | "mercadopago" | "paypal";
type Country = "AR" | "CL";

const CHANNELS: Channel[] = ["transfer", "mercadopago", "paypal"];
const COUNTRIES: Country[] = ["AR", "CL"];

function Flag({ country }: { country: Country }) {
  return (
    <span aria-hidden="true" className="text-[1.1em] leading-none">
      {country === "AR" ? "🇦🇷" : "🇨🇱"}
    </span>
  );
}

function nextItem<T>(items: readonly T[], current: T, key: string): T | null {
  const index = items.indexOf(current);

  if (index === -1) {
    return null;
  }

  if (key === "ArrowRight" || key === "ArrowDown") {
    return items[(index + 1) % items.length] ?? null;
  }

  if (key === "ArrowLeft" || key === "ArrowUp") {
    return items[(index - 1 + items.length) % items.length] ?? null;
  }

  if (key === "Home") {
    return items[0] ?? null;
  }

  if (key === "End") {
    return items[items.length - 1] ?? null;
  }

  return null;
}

function ArgentinaFields({
  account,
  onCopied,
}: {
  account: HelpContent["accounts"]["AR"];
  onCopied: (campo: string) => void;
}) {
  const ui = useUiOptional()?.ui;

  return (
    <div>
      <h3 className="flex items-center gap-sm font-ui text-subheading font-medium">
        <Flag country="AR" />
        {ui?.countries.AR ?? "Argentina"}
      </h3>
      <div className="mt-md">
        <CopyField label="Titular" value={account.holder} copyable={false} />
        <CopyField label="CUIT/CUIL" value={account.taxId} copyable={false} />
        <CopyField
          label="Alias"
          value={account.alias}
          onCopied={() => {
            onCopied("alias");
          }}
        />
        <CopyField
          label="CBU"
          value={account.cbu}
          onCopied={() => {
            onCopied("cbu");
          }}
        />
        <CopyField
          label="Número de cuenta"
          value={account.accountNumber}
          onCopied={() => {
            onCopied("cuenta_argentina");
          }}
        />
      </div>
    </div>
  );
}

function ChileFields({
  account,
  onCopied,
}: {
  account: HelpContent["accounts"]["CL"];
  onCopied: (campo: string) => void;
}) {
  const ui = useUiOptional()?.ui;

  return (
    <div>
      <h3 className="flex items-center gap-sm font-ui text-subheading font-medium">
        <Flag country="CL" />
        {ui?.countries.CL ?? "Chile"}
      </h3>
      <div className="mt-md">
        <CopyField label="Nombre" value={account.holder} copyable={false} />
        <CopyField
          label="RUT"
          value={account.rut}
          onCopied={() => {
            onCopied("rut");
          }}
        />
        <CopyField label="Banco" value={account.bank} copyable={false} />
        <CopyField label="Tipo" value={account.accountType} copyable={false} />
        <CopyField
          label="Número Cuenta"
          value={account.accountNumber}
          onCopied={() => {
            onCopied("cuenta_chile");
          }}
        />
        <CopyField
          label="Correo"
          value={account.email}
          onCopied={() => {
            onCopied("email");
          }}
        />
      </div>
    </div>
  );
}

/**
 * Donaciones del mockup: transferencia / Mercado Pago / PayPal, Argentina y Chile.
 *
 * Mercado Pago y PayPal se ven. El botón sólo existe si hay URL real.
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
  const countryRefs = useRef(new Map<Country, HTMLButtonElement>());

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

  function renderTransfer() {
    return (
      <div>
        {enhanced ? (
          <div
            role="tablist"
            aria-label={ui.countryTabsLabel}
            className="mb-lg flex gap-sm lg:hidden"
            onKeyDown={(event) => {
              const next = nextItem(COUNTRIES, country, event.key);

              if (next === null) {
                return;
              }

              event.preventDefault();
              onCountry(next);
              countryRefs.current.get(next)?.focus();
            }}
          >
            {COUNTRIES.map((item) => {
              const selected = country === item;

              return (
                <button
                  key={item}
                  ref={(node) => {
                    if (node === null) {
                      countryRefs.current.delete(item);
                    } else {
                      countryRefs.current.set(item, node);
                    }
                  }}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  className={cn(
                    "lift-hover inline-flex min-h-touch items-center gap-xs rounded-pill px-md font-ui text-small",
                    selected
                      ? "bg-forest text-paper"
                      : "border border-rule text-ink hover:border-forest",
                  )}
                  onClick={() => {
                    onCountry(item);
                  }}
                >
                  <Flag country={item} />
                  {ui.countries[item]}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="grid min-w-0 gap-3xl lg:grid-cols-2 lg:gap-2xl">
          <div
            className={enhanced && country !== "AR" ? "min-w-0 max-lg:hidden" : "min-w-0"}
          >
            <ArgentinaFields account={help.accounts.AR} onCopied={onCopied} />
          </div>
          <div
            className={enhanced && country !== "CL" ? "min-w-0 max-lg:hidden" : "min-w-0"}
          >
            <ChileFields account={help.accounts.CL} onCopied={onCopied} />
          </div>
        </div>
      </div>
    );
  }

  function renderMercadoPago() {
    return (
      <div className="rounded-md bg-paper-sunk p-lg">
        <h3 className="font-ui text-subheading font-medium">{ui.home.mercadoPago}</h3>
        <p className="mt-sm max-w-measure text-body text-ink-muted">
          {ui.home.mercadoPagoLead}
        </p>
        {/* El botón no se publica hasta que haya una URL real. */}
        {help.mercadoPagoUrl === null ? null : (
          <a
            href={help.mercadoPagoUrl}
            rel="noopener noreferrer"
            target="_blank"
            className="lift-hover mt-lg inline-flex min-h-touch items-center rounded-pill bg-forest px-lg font-ui text-small font-medium text-paper"
            onClick={() => {
              track({ name: "medio_externo_click", props: { medio: "mercadopago" } });
            }}
          >
            {ui.home.mercadoPagoCta} →
          </a>
        )}
      </div>
    );
  }

  function renderPayPal() {
    return (
      <div className="rounded-md bg-paper-sunk p-lg">
        <h3 className="font-ui text-subheading font-medium">{ui.home.paypal}</h3>
        <p className="mt-sm max-w-measure text-body text-ink-muted">
          {ui.home.paypalLead}
        </p>
        {/* El botón no se publica hasta que haya una URL real. */}
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
            {ui.home.paypalCta} →
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
                  "lift-hover inline-flex min-h-touch flex-1 items-center justify-center rounded-pill px-md font-ui text-small lg:flex-none",
                  selected
                    ? "bg-forest text-paper"
                    : "border border-rule text-ink hover:border-forest",
                )}
                onClick={() => {
                  setChannel(item);
                }}
              >
                {channelLabel[item]}
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
          {renderChannel("mercadopago")}
          {renderChannel("paypal")}
        </div>
      )}
    </div>
  );
}
