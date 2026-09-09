/**
 * Eventos de analítica. La lista es cerrada a propósito (ADR-010): un `string`
 * libre termina en eventos con nombres inconsistentes y en propiedades que
 * identifican personas sin que nadie lo haya decidido.
 *
 * Ninguna propiedad puede identificar a una persona. Lo que se recolecta está
 * publicado en `/legales/privacidad`.
 */
export type AnalyticsEvent =
  | { name: "ayudar_click"; props: { origen: string } }
  | { name: "metodo_visto"; props: { pais: string } }
  | { name: "dato_copiado"; props: { pais: string; campo: string } }
  | { name: "compartir"; props: { canal: string; ruta: string } }
  | { name: "transparencia_vista"; props: { ruta: string } };

export interface Analytics {
  track(event: AnalyticsEvent): void;
}

/**
 * Implementación por defecto: no hace nada. El sitio se despliega sin analítica
 * y funciona igual; conectar un proveedor es cambiar esta única instancia.
 */
export const noopAnalytics: Analytics = {
  track() {
    // Sin proveedor configurado no hay a dónde enviar el evento. No es un fallo
    // silencioso: es la ausencia deliberada de un efecto (ADR-010).
  },
};
