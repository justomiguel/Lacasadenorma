import { DomainError } from "./errors";
import {
  addMoney,
  money,
  scaleMoney,
  zero,
  type CurrencyCode,
  type Money,
} from "./money";
import { parseAmount } from "./money-input";

/**
 * Cómo se cubre un ítem del catálogo.
 *
 * `bring` es traer el objeto. Los otros tres son plata: el estimado se publica
 * en la ficha, etiquetado, y no entra al libro (ADR-041).
 */

export const COVER_CHANNELS = ["bring", "transfer", "mercadopago", "paypal"] as const;

export type CoverChannel = (typeof COVER_CHANNELS)[number];

const MERCADO_PAGO_FEE_NUMERATOR = 11;
const MERCADO_PAGO_FEE_DENOMINATOR = 10;

export function isCoverChannel(value: string): value is CoverChannel {
  return (COVER_CHANNELS as readonly string[]).includes(value);
}

/** El estimado de unidad por la cantidad, sin recargo. */
export function netCoverAmount<C extends CurrencyCode>(
  unit: Money<C>,
  quantity: number,
): Money<C> {
  return scaleMoney(unit, quantity);
}

/**
 * El 10% de Mercado Pago, en enteros.
 *
 * `(neto × 11) / 10` truncado hacia cero. El resto no se redondea hacia arriba:
 * inventar el último centavo convertiría un estimado en una cifra más precisa
 * de lo que es.
 */
export function withMercadoPagoFee<C extends CurrencyCode>(net: Money<C>): Money<C> {
  if (net.amountMinor < 0) {
    throw new DomainError("El recargo de Mercado Pago no se aplica a un monto negativo.");
  }

  if (
    net.amountMinor > Math.floor(Number.MAX_SAFE_INTEGER / MERCADO_PAGO_FEE_NUMERATOR)
  ) {
    throw new DomainError(
      "Ese recargo excedería el entero seguro de JavaScript y perdería precisión.",
    );
  }

  return money(
    Math.trunc(
      (net.amountMinor * MERCADO_PAGO_FEE_NUMERATOR) / MERCADO_PAGO_FEE_DENOMINATOR,
    ),
    net.currency,
  );
}

/**
 * Lo que se sugiere pagar según el canal. Traer el objeto no sugiere un monto.
 * Transferencia y PayPal: neto. Mercado Pago: neto más 10%.
 */
export function suggestedCoverAmount<C extends CurrencyCode>(
  unit: Money<C>,
  quantity: number,
  channel: CoverChannel,
): Money<C> | null {
  if (channel === "bring") {
    return null;
  }

  const net = netCoverAmount(unit, quantity);

  return channel === "mercadopago" ? withMercadoPagoFee(net) : net;
}

/**
 * Total a enviar por Mercado Pago: sugerido más un extra ≥ 0. Nunca menos.
 */
export function mercadoPagoTotal<C extends CurrencyCode>(
  unit: Money<C>,
  quantity: number,
  extra: Money<NoInfer<C>>,
): Money<C> {
  if (extra.amountMinor < 0) {
    throw new DomainError("El extra de Mercado Pago no puede ser negativo.");
  }

  const suggested = withMercadoPagoFee(netCoverAmount(unit, quantity));

  return addMoney(suggested, extra);
}

/** Vacío es no sumar. Cualquier otra cosa pasa por `parseAmount`. */
export function extraOrZero<C extends CurrencyCode>(
  input: string,
  currency: C,
): Money<C> {
  if (input.trim() === "") {
    return zero(currency);
  }

  return parseAmount(input, currency);
}
