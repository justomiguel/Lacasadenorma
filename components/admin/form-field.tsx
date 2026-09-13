"use client";

import { useContext, useId, type ReactNode } from "react";

import { cn } from "@/components/design-system/cn";

import { FieldErrorsContext } from "./form-action";

export const CONTROL =
  "w-full min-h-touch rounded-sm border border-rule bg-paper px-sm py-xs font-ui text-body text-ink placeholder:text-ink-faint focus-visible:border-focus aria-[invalid=true]:border-danger";

export interface FieldProps {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

/**
 * Etiqueta, control, pista y error, cableados entre sí.
 *
 * Se hace con un componente y no a mano en cada formulario porque los tres `id` que
 * conectan las cuatro partes son fáciles de olvidar, y cuando se olvidan el
 * formulario sigue viéndose bien: el único síntoma es que deja de funcionar para
 * quien usa un lector de pantalla.
 */
export function useField(name: string, hint: string | undefined) {
  const errors = useContext(FieldErrorsContext);
  const base = useId();
  const error = errors[name];

  const describedBy =
    [
      hint === undefined ? null : `${base}-hint`,
      error === undefined ? null : `${base}-error`,
    ]
      .filter((value) => value !== null)
      .join(" ") || undefined;

  return {
    id: `${base}-control`,
    error,
    hintId: `${base}-hint`,
    errorId: `${base}-error`,
    ...(describedBy === undefined ? {} : { describedBy }),
  };
}

export function FieldFrame({
  id,
  label,
  hint,
  hintId,
  error,
  errorId,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  hintId: string;
  error?: string;
  errorId: string;
  required?: boolean;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2xs", className)}>
      <label htmlFor={id} className="block font-ui text-small font-medium text-ink">
        {label}
        {required === true ? null : (
          <span className="ml-2xs font-normal text-ink-faint">(opcional)</span>
        )}
      </label>
      {hint === undefined ? null : (
        <p id={hintId} className="font-ui text-small text-ink-muted">
          {hint}
        </p>
      )}
      {children}
      {error === undefined ? null : (
        <p id={errorId} className="font-ui text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
