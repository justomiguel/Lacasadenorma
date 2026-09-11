import type { ReactNode } from "react";

import { Callout } from "@/components/design-system/callout";
import { UNAVAILABLE_MESSAGES, type UnavailableReason } from "@/src/application/result";

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
  className,
}: {
  reason: UnavailableReason;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Callout
      tone={reason === "error" ? "warning" : "neutral"}
      title={
        title ??
        (reason === "error"
          ? "No pudimos leer las cifras"
          : "Cifras todavía no publicadas")
      }
      {...(className === undefined ? {} : { className })}
    >
      <p>{UNAVAILABLE_MESSAGES[reason]}</p>
      {children}
    </Callout>
  );
}
