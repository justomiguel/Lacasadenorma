/**
 * El formato de fecha del sitio, en un solo lugar.
 *
 * Existía tres veces —en el libro de gastos, en la firma de una novedad y en la
 * línea de hitos— y las tres copias ya se habían separado: el libro mostraba
 * "08 de sept de 2026" y las otras dos "8 de septiembre de 2026". Con montos y
 * fechas de por medio, dos formatos en la misma página parecen dos fuentes
 * distintas.
 *
 * `timeZone: "UTC"` no es un detalle: las fechas del proyecto son días
 * calendario (`date` en la base, `AAAA-MM-DD` en el contenido), y sin fijar la
 * zona, `new Date("2026-09-08")` se interpreta como medianoche UTC y se muestra
 * como el 7 en cualquier navegador al oeste de Greenwich. Un gasto que aparece
 * un día antes que en el resumen del banco es un error de conciliación que nadie
 * puede explicar.
 *
 * El locale por omisión es es-AR. Las páginas en inglés pasan `en-US`.
 */

const OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
};

/** Una fecha `AAAA-MM-DD` como "8 de septiembre de 2026" (o el equivalente en el locale). */
export function formatLongDate(iso: string, locale = "es-AR"): string {
  return new Intl.DateTimeFormat(locale, OPTIONS).format(new Date(iso));
}
