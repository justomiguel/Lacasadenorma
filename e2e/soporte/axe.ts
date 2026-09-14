import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * El análisis de accesibilidad, con las etiquetas que el proyecto se obliga a cumplir.
 *
 * Las cinco etiquetas son WCAG 2.2 AA completo, no un subconjunto cómodo: la
 * constitución fija 2.2 AA como mínimo (principio VI) y `wcag22aa` es justamente la
 * que agrega los criterios nuevos de la 2.2 —foco no tapado, objetivos de al menos 24
 * px, entrada redundante— que son los que un sitio hecho para teléfonos suele romper.
 *
 * Lo que axe **no** ve, y por eso no alcanza: si el orden de lectura tiene sentido, si
 * un `alt` describe la foto o repite el título, si el texto se entiende. Eso se revisa
 * a mano en el loop de revisión visual, y está declarado como límite en
 * `docs/testing.md` para que cero violaciones no se lea como "accesible".
 */
const ETIQUETAS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

export async function esperarSinViolaciones(page: Page, donde: string): Promise<void> {
  const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS).analyze();

  /**
   * El mensaje incluye la regla, el impacto y el primer selector de cada violación.
   * Sin eso, una falla en CI dice "esperaba 0, recibí 3" y hay que reproducirla
   * localmente para saber qué mirar.
   */
  const detalle = resultado.violations.map(
    (violacion) =>
      `${violacion.id} (${violacion.impact ?? "sin impacto declarado"}): ${violacion.help}\n` +
      violacion.nodes
        .slice(0, 3)
        .map((nodo) => `    ${nodo.target.join(" ")}`)
        .join("\n"),
  );

  expect(detalle, `Violaciones de accesibilidad en ${donde}`).toEqual([]);
}
