import { getAnalyticsScript } from "@/src/infrastructure/analytics/browser";

/**
 * El script del proveedor de analítica, si hay uno configurado (ADR-010).
 *
 * Sin `NEXT_PUBLIC_ANALYTICS_SCRIPT_URL` no devuelve nada: ningún pedido a un
 * tercero, ningún byte extra, ningún banner de consentimiento. Ese es el estado
 * por defecto del repositorio y el de cualquier clon nuevo.
 *
 * Va con `defer` y sin `next/script`. El proveedor compatible con Plausible expone
 * una función global y cuenta la vista de página por su cuenta, incluidas las
 * navegaciones del cliente; no hace falta orquestar cuándo se ejecuta, y una
 * estrategia de carga de más sería complejidad sin efecto.
 *
 * El origen del script también tiene que estar en `script-src` y en `connect-src`:
 * lo agrega `next.config.ts` a partir de esta misma variable.
 */
export function AnalyticsScript() {
  const script = getAnalyticsScript();

  if (script === null) {
    return null;
  }

  return <script defer data-domain={script.domain} src={script.src} />;
}
