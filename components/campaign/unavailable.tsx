import type { ReactNode } from "react";

import { Callout } from "@/components/design-system/callout";
import type { UiContent } from "@/content/schema";
import { UNAVAILABLE_MESSAGES, type UnavailableReason } from "@/src/application/result";

const DEFAULT_UNAVAILABLE: UiContent["unavailable"] = {
  errorTitle: "No pudimos cargar esta parte",
  emptyTitle: "Todavía no hay datos publicados",
  notConfigured:
    "Esta parte del sitio todavía no está conectada a los datos de la campaña. En cuanto lo esté, aparece acá.",
  error: "Esta parte no está disponible ahora. Volvé a intentar en un rato.",
  notPublished: "La campaña todavía no está publicada.",
};

/**
 * Lo que se muestra cuando un dato no está disponible.
 *
 * Existe como componente y no como una cadena suelta porque el motivo tiene que
 * llegar hasta la pantalla. "No hay datos" es una frase; "las cifras todavía no
 * están conectadas a esta página" es información. La diferencia es el principio
 * XII: un fallo tiene que ser visible y tiene que decir qué pasó.
 *
 * Nunca renderiza un cero. Un cero es una afirmación sobre el mundo.
 *
 * `title` y `children` existen para las páginas donde el aviso es *todo* lo que
 * queda. En una sección de cifras, el aviso convive con el texto editorial y
 * alcanza; en el índice de novedades, sin base de datos, la página entera es el
 * aviso, y un aviso solo es una pared: hay que decir hacia dónde seguir.
 */
export function Unavailable({
  reason,
  title,
  children,
  copy = DEFAULT_UNAVAILABLE,
  className,
}: {
  reason: UnavailableReason;
  title?: string;
  children?: ReactNode;
  copy?: UiContent["unavailable"];
  className?: string;
}) {
  const message =
    reason === "error"
      ? copy.error
      : reason === "not-published"
        ? copy.notPublished
        : copy.notConfigured;

  return (
    <Callout
      tone={reason === "error" ? "warning" : "neutral"}
      title={title ?? (reason === "error" ? copy.errorTitle : copy.emptyTitle)}
      {...(className === undefined ? {} : { className })}
    >
      <p>{message}</p>
      {children}
    </Callout>
  );
}

/** Reexportado para quien todavía lee el mensaje del dominio (WebMCP, admin). */
export { UNAVAILABLE_MESSAGES };
