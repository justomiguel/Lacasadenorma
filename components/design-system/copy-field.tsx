"use client";

import { useId, useRef, useState } from "react";

import { useUiOptional } from "@/components/i18n/ui-provider";
import { fill } from "@/src/i18n/fill";

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

function CopyIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="5.2"
        y="5.2"
        width="7.6"
        height="8.4"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M3.4 10.5V3.7A1.3 1.3 0 0 1 4.7 2.4h6.2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3.2 8.2 6.3 11.5 12.8 4.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CopyField({
  label,
  value,
  hint,
  onCopied,
  copyable = true,
  className,
}: {
  label: string;
  value: string;
  hint?: string | null;
  /** Para registrar el evento de analítica. No recibe el valor copiado. */
  onCopied?: () => void;
  copyable?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const valueId = useId();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ui = useUiOptional()?.ui;
  const copyLabel = ui?.copy ?? "Copiar";
  const copiedLabel = ui?.copied ?? "Copiado";
  const copiedAnnouncement = ui?.copiedAnnouncement ?? "Se copió {label}.";
  const copyFailed =
    ui?.copyFailed ??
    "No pudimos copiar {label} automáticamente. Seleccionalo y copialo a mano.";

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
    }, 1500);
  }

  return (
    <div className={cn("min-w-0 border-b border-rule py-sm", className)}>
      <div className="flex items-center justify-between gap-md">
        <div className="min-w-0">
          <p className="font-ui text-label text-ink-muted">{label}</p>
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
            {...(copyable ? { "data-figure": true } : {})}
          >
            {value}
          </p>
          {hint === null || hint === undefined ? null : (
            <p className="mt-3xs font-ui text-small text-ink-muted">{hint}</p>
          )}
        </div>

        {copyable ? (
          <button
            type="button"
            onClick={() => {
              void copy();
            }}
            aria-describedby={valueId}
            className="lift-hover inline-flex min-h-touch shrink-0 items-center gap-xs rounded-pill px-sm font-ui text-small font-medium text-forest underline decoration-1 underline-offset-4 hover:text-forest-strong"
          >
            {state === "copied" ? <CheckIcon /> : <CopyIcon />}
            {state === "copied" ? copiedLabel : copyLabel}
          </button>
        ) : null}
      </div>

      {copyable ? (
        // Región viva siempre presente en los campos que se copian: si apareciera
        // junto con el mensaje, algunos lectores de pantalla no lo anunciarían.
        // Los campos no copiables no la montan: si no, el primer `aria-live` del
        // panel queda vacío y quien busca el anuncio no lo encuentra.
        <p aria-live="polite" className="mt-3xs font-ui text-small text-ink-muted">
          {state === "copied" ? fill(copiedAnnouncement, { label }) : null}
          {state === "failed" ? fill(copyFailed, { label }) : null}
        </p>
      ) : null}
    </div>
  );
}
