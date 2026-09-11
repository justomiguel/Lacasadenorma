/**
 * Eventos de analítica. La lista es cerrada a propósito (ADR-010): un `string`
 * libre termina en eventos con nombres inconsistentes y en propiedades que
 * identifican personas sin que nadie lo haya decidido.
 *
 * Ninguna propiedad puede identificar a una persona. Lo que se recolecta está
 * publicado en `/legales/privacidad`.
 *
 * Los nombres están en castellano como el resto del sitio (ADR-014). El nombre de
 * un evento se lee en un panel meses después: conviene que se lea en el mismo
 * idioma en que se piensa el proyecto.
 *
 * La vista de página **no** está en esta lista: la cuenta el script del proveedor,
 * incluidas las navegaciones del cliente. Emitirla también desde acá la contaría
 * dos veces. Por eso tampoco hay eventos de "vio la transparencia" ni "vio una
 * novedad": son vistas de página con otro nombre, y el proveedor ya las separa por
 * ruta. Un evento que duplica un dato que ya existe sólo agrega una forma de que los
 * dos números no coincidan.
 *
 * Cada evento de esta lista se emite desde algún lugar del sitio, y el listado de
 * dónde está en `docs/privacy.md`. Un evento declarado y nunca emitido es una
 * afirmación falsa sobre lo que el sitio mide.
 */
export type AnalyticsEvent =
  | { name: "ayudar_click"; props: { origen: string } }
  | { name: "metodo_visto"; props: { pais: string } }
  | { name: "dato_copiado"; props: { pais: string; campo: string } }
  | { name: "compartir"; props: { canal: string; ruta: string } };

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
