"use client";

import { PaymentMethodCard } from "@/components/campaign/payment-method-card";
import { secondaryActionClass } from "@/components/design-system/actions";
import { BrandLabel } from "@/components/design-system/brand-mark";
import { ArrowIcon } from "@/components/design-system/icons";
import type { BrandId } from "@/content/brands";
import { track } from "@/src/infrastructure/analytics/browser";

/**
 * Un medio de pago externo, como método y no como banner (ADR-032).
 *
 * La marca con su logo es el título de la card, una línea dice qué es, y el
 * enlace lleva al medio. El sitio no cobra ni procesa nada: te lleva y nada más.
 * El enlace sólo existe si hay URL real; sin URL, la fila no se dibuja.
 */
export function ExternalPayment({
  brand,
  name,
  lead,
  cta,
  context,
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
        className={secondaryActionClass("forest", "mt-xs")}
        onClick={() => {
          track({ name: "medio_externo_click", props: { medio: brand } });
        }}
      >
        <span>
          {cta}
          {context === undefined ? null : <span className="sr-only"> · {context}</span>}
        </span>
        <ArrowIcon />
      </a>
    </PaymentMethodCard>
  );
}
