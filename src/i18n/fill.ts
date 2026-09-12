/**
 * Sustituye `{nombre}` en una cadena de interfaz.
 *
 * Las cadenas viven en `content/{locale}/ui.json`. Un hueco que no se rellena
 * se queda visible a propósito: `{date}` en pantalla es un error de programación,
 * no un dato vacío, y así se ve (principio XII).
 */
export function fill(
  template: string,
  vars: Readonly<Record<string, string>>,
): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (match, key: string) => vars[key] ?? match);
}
