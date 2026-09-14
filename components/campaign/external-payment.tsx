"use client";

import { PaymentMethodCard } from "@/components/campaign/payment-method-card";
import { BrandLabel, BrandMark } from "@/components/design-system/brand-mark";
import { cn } from "@/components/design-system/cn";
import { CountryFlag } from "@/components/design-system/flags";
import type { BrandId } from "@/content/brands";
import { track } from "@/src/infrastructure/analytics/browser";

const BUTTON_BASE =
  "mt-sm inline-flex min-h-cta w-full items-center justify-center gap-xs rounded-md px-sm no-underline font-ui text-small font-medium transition-colors duration-fast ease-editorial active:translate-y-px sm:gap-sm sm:px-md sm:text-body";

const BUTTON_BRAND = {
  mercadopago: "bg-mercadopago text-mercadopago-ink hover:bg-mercadopago-strong",
  paypal: "bg-paypal text-paper hover:bg-paypal-strong",
} as const;

/**
 * Un medio de pago externo, como método y no como banner (ADR-032).
 *
 * La marca con su logo es el título de la card. El botón lleva los colores de
 * esa marca —azul PayPal, celeste Mercado Pago— para que se reconozca el
 * destino. En Mercado Pago, la banderita dice si el link es de Argentina o de
 * Chile. El sitio no cobra ni procesa nada: te lleva y nada más. El enlace
 * sólo existe si hay URL real; sin URL, la fila no se dibuja.
 */
export function ExternalPayment({
  brand,
  name,
  lead,
  cta,
  context,
  country,
  url,
}: {
  brand: BrandId & ("mercadopago" | "paypal");
  name: string;
  lead: string;
  cta: string;
  /**
   * El país del enlace, sólo para el nombre accesible. Mercado Pago tiene un destino
   * por país y sin JavaScript los dos se apilan: dos enlaces con el mismo nombre
   * serían indistinguibles para un lector de pantalla.
   */
  context?: string;
  /** Argentina o Chile: dibuja la banderita en el botón de Mercado Pago. */
  country?: "AR" | "CL";
  url: string | null;
}) {
  if (url === null) {
    return null;
  }

  return (
    <PaymentMethodCard title={<BrandLabel id={brand}>{name}</BrandLabel>}>
      <p className="max-w-measure text-small text-ink-muted">{lead}</p>
      <a
        href={url}
        rel="noopener noreferrer"
        target="_blank"
        data-brand={brand}
        className={cn(BUTTON_BASE, BUTTON_BRAND[brand])}
        onClick={() => {
          track({ name: "medio_externo_click", props: { medio: brand } });
        }}
      >
        <BrandMark id={brand} />
        <span>
          {cta}
          {context === undefined ? null : <span className="sr-only"> · {context}</span>}
        </span>
        {country !== undefined && brand === "mercadopago" ? (
          <CountryFlag country={country} />
        ) : null}
      </a>
    </PaymentMethodCard>
  );
}
