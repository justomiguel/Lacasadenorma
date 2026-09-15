/**
 * Revelado al descubrir: una sola vez, cuando el momento entra en vista.
 *
 * La receta de `animate` (RECIPES.md · Scroll reveal) dispara con
 * IntersectionObserver y `{ once: true, margin: "-100px" }`. No se vuelve a
 * animar al pasar otra vez: eso pelea con quien está leyendo.
 *
 * El movimiento en sí lo decide el CSS (`opacity` y `transform`, tokens de
 * ADR-032). Acá sólo se marca `data-in-view`. Sin JavaScript, o con movimiento
 * reducido, el contenido ya se ve: el ocultamiento vive en
 * `prefers-reduced-motion: no-preference`.
 */

const REVEAL = "[data-reveal], [data-reveal-photo]";

export function observeReveals(root: ParentNode = document): () => void {
  if (typeof IntersectionObserver === "undefined") {
    return () => undefined;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => undefined;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }

        entry.target.setAttribute("data-in-view", "");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "-100px", threshold: 0 },
  );

  root.querySelectorAll(REVEAL).forEach((node) => {
    if (!node.hasAttribute("data-in-view")) {
      observer.observe(node);
    }
  });

  return () => {
    observer.disconnect();
  };
}
