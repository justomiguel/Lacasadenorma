export type ClassValue = string | false | null | undefined;

/**
 * Une clases descartando lo vacío. No resuelve conflictos de Tailwind a
 * propósito: si dos clases pelean, es un problema de diseño del componente, no
 * algo que una librería de 8 kB deba arbitrar en runtime.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter((value): value is string => Boolean(value)).join(" ");
}
