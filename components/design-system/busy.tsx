/**
 * Estado de espera, en palabras y en movimiento.
 *
 * El sitio no usa spinners: un círculo girando es el default de un panel, y acá
 * el movimiento tiene que decir qué cambió (principio XII, ADR-032). La regla
 * de dos píxeles que recorre el ancho es la misma línea del sistema, animada
 * sólo mientras hay una acción en curso. El texto es el anuncio: `role="status"`
 * para que un lector de pantalla lo lea sin interrumpir por un error.
 *
 * `prefers-reduced-motion` ya apaga la animación en `globals.css`.
 */

export function BusyCue({ label }: { label: string }) {
  return (
    <p role="status" aria-live="polite" className="font-ui text-small text-ink-muted">
      <span data-busy-rule="" aria-hidden="true" />
      {label}
    </p>
  );
}
