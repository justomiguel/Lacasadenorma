"use client";

import { useId, useRef, useState } from "react";

import { cn } from "./cn";

/**
 * Dato bancario con botón de copiar.
 *
 * Es el componente más importante del sitio: es el último paso antes de que
 * alguien transfiera. Por eso:
 *
 * - El valor está **siempre visible y seleccionable**, incluso si copiar falla.
 * - La confirmación se anuncia por `aria-live="polite"`, no sólo con un cambio de
 *   color.
 * - Si el navegador niega el portapapeles, **el fallo se ve** y se explica qué
 *   hacer. Un botón que no hace nada es peor que no tener botón (principio XII).
 * - Es un `<button>` de verdad, así que funciona con teclado sin código extra.
 */

type CopyState = "idle" | "copied" | "failed";

export function CopyField({
  label,
  value,
  hint,
  onCopied,
  className,
}: {
  label: string;
  value: string;
  hint?: string | null;
  /** Para registrar el evento de analítica. No recibe el valor copiado. */
  onCopied?: () => void;
  className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const valueId = useId();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    if (timeout.current !== null) {
      clearTimeout(timeout.current);
    }

    try {
      if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
        throw new Error("clipboard-unavailable");
      }

      await navigator.clipboard.writeText(value);
      setState("copied");
      onCopied?.();
    } catch {
      // No se registra el error: la causa es siempre la misma (permiso denegado o
      // contexto no seguro) y el valor está a la vista para copiarlo a mano.
      setState("failed");
    }

    timeout.current = setTimeout(() => {
      setState("idle");
    }, 4000);
  }

  return (
    <div className={cn("border-b border-rule py-sm", className)}>
      <div className="flex items-baseline justify-between gap-md">
        <div className="min-w-0">
          <p className="font-ui text-label uppercase text-ink-muted">{label}</p>
          {/*
            `break-words` y no `break-all`: los dos parten un CBU de 22 dígitos que
            no entra en 360 px, pero `break-all` parte también donde no hace falta,
            y una etiqueta como "CUENTA DE PRUEBA — NO TRANSFERIR" quedaba cortada
            entre la N y la O. En el campo donde alguien lee el dato que va a
            copiar, un corte arbitrario siembra la duda de si el dato está entero.
          */}
          <p
            id={valueId}
            className="mt-3xs break-words font-ui text-subheading font-medium tabular-nums"
            data-figure
          >
            {value}
          </p>
          {hint === null || hint === undefined ? null : (
            <p className="mt-3xs font-ui text-small text-ink-muted">{hint}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            void copy();
          }}
          aria-describedby={valueId}
          className="inline-flex min-h-touch shrink-0 items-center rounded-sm px-sm font-ui text-small font-medium text-brick underline decoration-1 underline-offset-4 transition-colors duration-fast ease-editorial hover:text-brick-strong"
        >
          {state === "copied" ? "Copiado" : "Copiar"}
        </button>
      </div>

      {/* Región viva siempre presente: si apareciera junto con el mensaje, algunos
          lectores de pantalla no lo anunciarían. */}
      <p aria-live="polite" className="mt-3xs font-ui text-small text-ink-muted">
        {state === "copied" ? `Se copió ${label}.` : null}
        {state === "failed"
          ? `No pudimos copiar ${label} automáticamente. Seleccionalo y copialo a mano.`
          : null}
      </p>
    </div>
  );
}
