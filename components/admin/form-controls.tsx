"use client";

import { useContext, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/components/design-system/cn";

import { FieldErrorsContext } from "./form-action";
import { useField } from "./form-field";

export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
  className?: string;
}) {
  const field = useField(name, hint);
  const { pending } = useFormStatus();

  return (
    <div className={cn("space-y-2xs", className)}>
      <div className="flex min-h-touch items-center gap-sm">
        <input
          id={field.id}
          name={name}
          type="checkbox"
          className="size-md rounded-sm border-rule accent-aqua disabled:opacity-60"
          disabled={pending}
          aria-describedby={field.describedBy}
          {...(defaultChecked === true ? { defaultChecked: true } : {})}
        />
        <label htmlFor={field.id} className="font-ui text-small text-ink">
          {label}
        </label>
      </div>
      {hint === undefined ? null : (
        <p id={field.hintId} className="font-ui text-small text-ink-muted">
          {hint}
        </p>
      )}
      {field.error === undefined ? null : (
        <p id={field.errorId} className="font-ui text-small text-danger">
          {field.error}
        </p>
      )}
    </div>
  );
}

/**
 * El botón de envío.
 *
 * Cambia su texto mientras la acción corre y se deshabilita, que es lo que evita el
 * doble envío de un gasto desde una conexión lenta —el error más caro que este
 * formulario puede producir— sin recurrir a ningún estado propio.
 */
export function SubmitButton({
  children,
  pendingLabel,
  tone = "primary",
}: {
  children: ReactNode;
  pendingLabel?: string;
  tone?: "primary" | "quiet" | "danger";
}) {
  const { pending } = useFormStatus();

  const tones: Record<typeof tone, string> = {
    primary: "bg-aqua text-paper hover:bg-aqua-strong",
    quiet: "border border-rule bg-paper text-ink hover:bg-paper-sunk",
    danger: "border border-danger bg-paper text-danger hover:bg-paper-sunk",
  };

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "inline-flex min-h-touch items-center justify-center rounded-sm px-lg py-xs font-ui text-small font-medium transition-colors duration-fast ease-editorial disabled:opacity-60",
        tones[tone],
      )}
    >
      {pending && pendingLabel !== undefined ? pendingLabel : children}
    </button>
  );
}

/**
 * El error de algo que no tiene un solo control.
 *
 * Existe para la lista de datos de una cuenta bancaria: la validación es del conjunto
 * —"el CBU tiene un marcador de relleno"— y no hay un `<input>` al que colgar el
 * mensaje. Sin esto el error volvería del servidor y no se vería en ninguna parte, que
 * es la falla silenciosa que el principio XII prohíbe.
 */
export function GroupError({ name }: { name: string }) {
  const error = useContext(FieldErrorsContext)[name];

  if (error === undefined) {
    return null;
  }

  return (
    <p role="alert" className="font-ui text-small text-danger">
      {error}
    </p>
  );
}

/** Un valor que la acción necesita y la persona no edita: el id, la campaña. */
export function HiddenValue({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}
