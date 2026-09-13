/**
 * `defaultValue` sólo cuando hay algo que precargar.
 *
 * Vive acá, sin `"use client"`, porque las páginas del backoffice son Server
 * Components y tienen que armar la prop **antes** de pasársela al campo. Si esta
 * función se exporta desde el barrel de cliente, Next la trata como referencia
 * de cliente y la página se cae al renderizar: "Attempted to call defaultOf()
 * from the server".
 *
 * Existe por `exactOptionalPropertyTypes`: una prop opcional no acepta
 * `undefined` explícito, y lo que viene de la base es `string | null`. Esto
 * convierte las dos formas de "no hay dato" en la única que el tipo admite, que
 * es la prop ausente.
 */
export function defaultOf(value: string | null | undefined): { defaultValue?: string } {
  return value === null || value === undefined ? {} : { defaultValue: value };
}
