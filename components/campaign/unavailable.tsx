import { Callout } from "@/components/design-system/callout";
import { UNAVAILABLE_MESSAGES, type UnavailableReason } from "@/src/application/result";

/**
 * Lo que se muestra cuando una cifra no está disponible.
 *
 * Existe como componente y no como una cadena suelta porque el motivo tiene que
 * llegar hasta la pantalla. "No hay datos" es una frase; "las cifras todavía no
 * están conectadas a esta página" es información. La diferencia es el principio
 * XII: un fallo tiene que ser visible y tiene que decir qué pasó.
 *
 * Nunca renderiza un cero. Un cero es una afirmación sobre el mundo.
 */
export function Unavailable({
  reason,
  className,
}: {
  reason: UnavailableReason;
  className?: string;
}) {
  return (
    <Callout
      tone={reason === "error" ? "warning" : "neutral"}
      title={
        reason === "error" ? "No pudimos leer las cifras" : "Cifras todavía no publicadas"
      }
      {...(className === undefined ? {} : { className })}
    >
      <p>{UNAVAILABLE_MESSAGES[reason]}</p>
    </Callout>
  );
}
