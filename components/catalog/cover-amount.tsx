"use client";

import type { CatalogContent } from "@/content/schema";
import {
  extraOrZero,
  mercadoPagoTotal,
  netCoverAmount,
  withMercadoPagoFee,
} from "@/src/domain/cover";
import { formatMoney, type Money } from "@/src/domain/money";
import { AmountFormatError } from "@/src/domain/money-input";
import { fill } from "@/src/i18n/fill";
import { intlLocale, type Locale } from "@/src/i18n/locale";

/**
 * Los montos de cubrir un ítem: siempre etiquetados como estimado, no fijo.
 *
 * Es el único archivo público que puede importar `formatMoney` (ADR-041).
 */

export function formatCoverMoney(amount: Money, locale: Locale): string {
  return formatMoney(amount, intlLocale(locale));
}

export function CoverAmounts({
  unit,
  quantity,
  extra,
  onExtraChange,
  copy,
  locale,
}: {
  unit: Money;
  quantity: number;
  extra: string;
  onExtraChange: (value: string) => void;
  copy: CatalogContent;
  locale: Locale;
}) {
  const net = netCoverAmount(unit, quantity);
  const mercadopago = withMercadoPagoFee(net);
  const parsed = readExtra(extra, unit.currency);
  const total =
    parsed.extra === null ? mercadopago : mercadoPagoTotal(unit, quantity, parsed.extra);

  return (
    <div className="mt-md max-w-measure space-y-sm font-ui text-body">
      <p>{fill(copy.coverUnit, { amount: formatCoverMoney(unit, locale) })}</p>
      <p className="text-ink-muted">
        {fill(copy.coverNet, { amount: formatCoverMoney(net, locale) })}
      </p>
      <p className="text-ink-muted">
        {fill(copy.coverMercadoPago, { amount: formatCoverMoney(mercadopago, locale) })}
      </p>
      <p className="text-ink-muted">
        {fill(copy.coverPaypal, { amount: formatCoverMoney(net, locale) })}
      </p>
      <div className="space-y-2xs pt-sm">
        <label
          htmlFor="cover-extra"
          className="block font-ui text-small font-medium text-ink"
        >
          {copy.coverExtra}
        </label>
        <input
          id="cover-extra"
          value={extra}
          onChange={(event) => {
            onExtraChange(event.target.value);
          }}
          inputMode="decimal"
          autoComplete="off"
          aria-describedby="cover-extra-hint"
          {...(parsed.error === null ? {} : { "aria-invalid": true })}
          className="w-full min-h-touch rounded-sm border border-rule bg-paper px-sm py-xs font-ui text-body text-ink tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        <p id="cover-extra-hint" className="font-ui text-small text-ink-muted">
          {copy.coverExtraHint}
        </p>
        {parsed.error === null ? null : (
          <p role="alert" className="font-ui text-small text-danger">
            {parsed.error}
          </p>
        )}
      </div>
      <p className="font-medium tabular-nums">
        {fill(copy.coverTotal, { amount: formatCoverMoney(total, locale) })}
      </p>
    </div>
  );
}

function readExtra(
  raw: string,
  currency: Money["currency"],
): { extra: Money | null; error: string | null } {
  try {
    return { extra: extraOrZero(raw, currency), error: null };
  } catch (error) {
    const message =
      error instanceof AmountFormatError ? error.message : "El extra no se pudo leer.";

    return { extra: null, error: message };
  }
}
