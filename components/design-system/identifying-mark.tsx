import type { ComponentProps } from "react";

import { cn } from "./cn";

/**
 * Pictograma identificador: antes del nombre, 1.15 em de esa letra (ADR-047).
 *
 * El tamaño sigue a la tipografía del padre. El color también, salvo que el
 * call site ponga `text-olive`. Copiar, cerrar y el menú no usan esto: son
 * `ICON_ACTION`.
 */
export function IdentifyingMark({ className, ...rest }: ComponentProps<"span">) {
  return <span className={cn("identifying-mark", className)} {...rest} />;
}
