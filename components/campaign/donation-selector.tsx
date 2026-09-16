"use client";

import {
  useCallback,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { CountryMark } from "@/components/design-system/flags";
import type { HelpContent, UiContent } from "@/content/schema";
import { track } from "@/src/infrastructure/analytics/browser";

import { ArgentinaTransfer, ChileTransfer } from "./bank-transfer";
import { CountrySelector, REGIONS, type DonationRegion } from "./country-selector";
import { ExternalPayment } from "./external-payment";

const NEVER_CHANGES = () => () => undefined;

function useHydrated(): boolean {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );
}

/**
 * Cómo aportar, desde dónde (ADR-032).
 *
 * Una sola decisión —Argentina, Chile o cualquier otro país— y debajo sólo lo
 * que sirve para esa respuesta: la transferencia y Mercado Pago en cards
 * distintas (Brubank o Scotiabank con su logo frente a Mercado Pago), o PayPal
 * para el resto del mundo. Antes eran dos niveles de píldoras (canal y país)
 * que mostraban todo a la vez.
 *
 * Mejora progresiva de verdad: el HTML servido trae los tres países apilados con
 * su título. Si el JavaScript no llega, quien entró igual ve los datos y puede
 * transferir. Mercado Pago tiene un destino por país; el enlace sólo existe si
 * hay URL real.
 */
export function DonationSelector({
  help,
  ui,
  className,
}: {
  help: HelpContent;
  ui: UiContent;
  className?: string;
}) {
  const enhanced = useHydrated();
  const [region, setRegion] = useState<DonationRegion>("AR");
  /* El panel entra animado al cambiar de país, no al hidratar. */
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
      </div>
    ),
    INT: (
      <ExternalPayment
        brand="paypal"
        name={ui.home.paypal}
        lead={ui.home.paypalLead}
        cta={ui.home.paypalCta}
        url={help.paypalUrl}
      />
    ),
  };

  if (!enhanced) {
    return (
      <div className={className}>
        <div className="space-y-2xl">
          {REGIONS.map((item) => (
            <section key={item} aria-labelledby={`${baseId}-heading-${item}`}>
              <h3
                id={`${baseId}-heading-${item}`}
                className="mb-md flex items-center gap-sm font-display text-section-title"
              >
                <CountryMark region={item} />
                {names[item]}
              </h3>
              {panels[item]}
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
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
    </div>
  );
}
