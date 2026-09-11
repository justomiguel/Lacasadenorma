import type { Analytics, AnalyticsEvent } from "@/src/domain/ports/analytics";
import { noopAnalytics } from "@/src/domain/ports/analytics";

/**
 * Adaptador de analítica del navegador (ADR-010).
 *
 * No instala ningún SDK. Busca en `window` la función global que exponen los
 * scripts compatibles con Plausible —el mismo contrato que implementan Umami y
 * varios otros— y la llama si existe. El script se inyecta sólo cuando
 * `NEXT_PUBLIC_ANALYTICS_SCRIPT_URL` está definida, así que **sin configuración
 * no se carga nada de terceros y no se envía nada**.
 *
 * A cambio de no tener dependencia, no hay tipos del proveedor: la comprobación
 * es en tiempo de ejecución y está encerrada en este archivo.
 */

type ProviderFunction = (
  name: string,
  options?: { props?: Record<string, string> },
) => void;

/** El nombre de la global es el del contrato de Plausible, que es el que se copió. */
const GLOBAL_NAME = "plausible";

function findProvider(): ProviderFunction | null {
  if (typeof window === "undefined") {
    return null;
  }

  const candidate = (window as unknown as Record<string, unknown>)[GLOBAL_NAME];

  return typeof candidate === "function" ? (candidate as ProviderFunction) : null;
}

export const browserAnalytics: Analytics = {
  track(event: AnalyticsEvent) {
    const provider = findProvider();

    if (provider === null) {
      // Sin proveedor cargado no hay a dónde enviar el evento, y no hay nada que
      // informar: es el estado por defecto del sitio, no un fallo (ADR-010).
      return;
    }

    provider(event.name, { props: event.props });
  },
};

/**
 * La instancia que usan los componentes. En el servidor devuelve la nula, porque
 * un evento de interacción no ocurre ahí.
 */
export const analytics: Analytics =
  typeof window === "undefined" ? noopAnalytics : browserAnalytics;

/** Atajo para no importar la instancia en cada componente cliente. */
export function track(event: AnalyticsEvent): void {
  analytics.track(event);
}

/**
 * URL del script del proveedor, si está configurado. Vive acá y no en el
 * componente para que el layout no lea `process.env` directamente y para que la
 * respuesta a "¿hay analítica?" sea una sola.
 */
export function getAnalyticsScript(): { src: string; domain: string } | null {
  const src = process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL?.trim();
  const domain = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN?.trim();

  if (
    src === undefined ||
    src.length === 0 ||
    domain === undefined ||
    domain.length === 0
  ) {
    return null;
  }

  return { src, domain };
}
