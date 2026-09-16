"use client";

import { useId, useRef, useState, type ReactNode } from "react";

import { useUiOptional } from "@/components/i18n/ui-provider";
import { fill } from "@/src/i18n/fill";

import { ICON_ACTION } from "./actions";
import { cn } from "./cn";
import {
  AtIcon,
  BankIcon,
  CheckIcon,
  CopyIcon,
  HashIcon,
  IdIcon,
  LayersIcon,
  MailIcon,
  PersonIcon,
  type IconProps,
} from "./icons";

/**
 * Dato bancario con su acción de copiar.
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
 *
 * La acción es un icono de 44 px (ADR-032): el nombre accesible sigue siendo
 * «Copiar», y al copiar el icono pasa a un tilde y aparece «Copiado» durante un
 * segundo y medio. La etiqueta lleva su pictograma (ADR-047): no reemplaza el
 * nombre.
 */

type CopyState = "idle" | "copied" | "failed";

type FieldMark = (props: IconProps) => ReactNode;

/** Cada etiqueta de dato bancario tiene marca. `check:iconos` lee estas claves. */
export const COPY_FIELD_MARKS: Record<string, FieldMark> = {
  Alias: AtIcon,
  CBU: BankIcon,
  "Número de cuenta": HashIcon,
  Titular: PersonIcon,
  "CUIT/CUIL": IdIcon,
  RUT: IdIcon,
  "Número Cuenta": HashIcon,
  Correo: MailIcon,
  Nombre: PersonIcon,
  Banco: BankIcon,
  Tipo: LayersIcon,
};

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
  const Mark = COPY_FIELD_MARKS[label];

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
    <div className={cn("min-w-0 border-b border-rule py-sm last:border-b-0", className)}>
      <div className="flex items-center justify-between gap-md">
        <div className="min-w-0">
          <p className="flex items-center gap-xs font-ui text-caption text-ink-muted">
            {Mark === undefined ? null : (
              <span data-field-mark={label} className="inline-flex shrink-0 text-olive">
                <Mark size={16} />
              </span>
            )}
            {label}
          </p>
          {/*
            `break-words` y no `break-all`: los dos parten un CBU de 22 dígitos que
            no entra en 360 px, pero `break-all` parte también donde no hace falta.
            En el campo donde alguien lee el dato que va a copiar, un corte
            arbitrario siembra la duda de si el dato está entero.
          */}
          <p
            id={valueId}
            className="mt-3xs break-words font-ui text-body-large font-medium tabular-nums"
            {...(copyable ? { "data-figure": true } : {})}
          >
            {value}
          </p>
          {hint === null || hint === undefined ? null : (
            <p className="mt-3xs font-ui text-caption text-ink-muted">{hint}</p>
          )}
        </div>

        {copyable ? (
          <button
            type="button"
            onClick={() => {
              void copy();
            }}
            aria-describedby={valueId}
            className={cn(
              ICON_ACTION,
              "-mr-sm w-auto gap-xs px-sm text-forest",
              state === "copied" ? "text-success" : "",
            )}
          >
            {state === "copied" ? (
              <>
                <span className="font-ui text-caption font-medium">{copiedLabel}</span>
                <span data-check-in="" className="inline-flex">
                  <CheckIcon />
                </span>
              </>
            ) : (
              <>
                <span className="sr-only">{copyLabel}</span>
                <CopyIcon />
              </>
            )}
          </button>
        ) : null}
      </div>

      {copyable ? (
        // Región viva siempre presente en los campos que se copian: si apareciera
        // junto con el mensaje, algunos lectores de pantalla no lo anunciarían.
        // Los campos no copiables no la montan: si no, el primer `aria-live` del
        // panel queda vacío y quien busca el anuncio no lo encuentra.
        // El anuncio del éxito ya se ve en el botón, así que la región queda para el
        // lector de pantalla; el fallo sí se muestra, porque hay algo que hacer.
        <p
          aria-live="polite"
          className={
            state === "failed" ? "mt-3xs font-ui text-caption text-danger" : "sr-only"
          }
        >
          {state === "copied" ? fill(copiedAnnouncement, { label }) : null}
          {state === "failed" ? fill(copyFailed, { label }) : null}
        </p>
      ) : null}
    </div>
  );
}
