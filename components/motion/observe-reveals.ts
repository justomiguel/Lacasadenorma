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
 *
 * El layout se hidrata antes de que el RSC termine de entrar (ficha del
 * catálogo, navegación suave). Un barrido único deja las fotos nuevas en
 * opacity 0 para siempre: hay que observar lo que se agrega después.
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

  const watch = (node: Element) => {
    if (node.matches(REVEAL) && !node.hasAttribute("data-in-view")) {
      observer.observe(node);
    }
  };

  const scan = (scope: ParentNode) => {
    if (scope instanceof Element) {
      watch(scope);
    }

    scope.querySelectorAll(REVEAL).forEach(watch);
  };

  scan(root);

  const mutations =
    typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.addedNodes) {
              if (node instanceof Element) {
                scan(node);
              }
            }
          }
        });

  mutations?.observe(root instanceof Document ? root.documentElement : root, {
    childList: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
    mutations?.disconnect();
  };
}
