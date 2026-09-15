import { formatMoney, type Money } from "@/src/domain/money";
import { intlLocale, type Locale } from "@/src/i18n/locale";

/**
 * El estimado del catálogo, etiquetado en quien lo llama, no acá.
 *
 * Es uno de los dos archivos públicos que pueden importar `formatMoney`
 * (ADR-044). El listado y la ficha usan el mismo helper para que no se vean
 * dos cifras distintas del mismo ítem.
 */
export function formatCatalogEstimate(amount: Money, locale: Locale): string {
  return formatMoney(amount, intlLocale(locale));
}
