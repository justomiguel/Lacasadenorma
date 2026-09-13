"use client";

import { useId, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/components/design-system/cn";

/**
 * Los controles de las pantallas de cuenta.
 *
 * No se reusan los de `components/admin/`: aquéllos viven dentro de
 * `FieldErrorsContext`, que es el mapa "campo → mensaje" que devuelve `perform()`,
 * y acá el error viene como **un código y un campo**, porque la pantalla existe en
 * dos idiomas y el texto sale del contenido (ADR-023). Compartir el componente
 * habría obligado a inventar un contexto falso en cada formulario.
 *
 * Tampoco comparten la paleta. El backoffice pinta sus acciones con `aqua`; el
 * sitio público usa la píldora verde de `PrimaryAction`, y estas pantallas son del
 * sitio público aunque hablen de una sesión.
 */

const CONTROL =
  "w-full min-h-touch rounded-sm border border-rule bg-paper px-sm py-xs font-ui text-body text-ink " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus " +
  "aria-invalid:border-danger";

export function TextField({
  name,
  label,
  hint,
  type = "text",
  autoComplete,
  required = true,
  defaultValue,
  error,
  inputMode,
}: {
  name: string;
  label: string;
  hint?: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  /** El mensaje ya traducido. Ausente cuando el error no es de este campo. */
  error?: string;
  inputMode?: "text" | "numeric" | "decimal" | "email";
}) {
  const id = useId();
  const hintId = `${id}-ayuda`;
  const errorId = `${id}-error`;

  const describedBy =
    [hint === undefined ? null : hintId, error === undefined ? null : errorId]
      .filter((value) => value !== null)
      .join(" ") || undefined;

  return (
    <div className="space-y-2xs">
      <label htmlFor={id} className="block font-ui text-small font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        className={CONTROL}
        // `autoCapitalize` y `inputMode` en el correo no son detalles: en un
        // teléfono, la mayúscula automática al principio del campo es la causa más
        // común de "ese correo no parece válido" en una dirección bien escrita.
        {...(type === "email"
          ? { inputMode: "email" as const, autoCapitalize: "none" }
          : inputMode === undefined
            ? {}
            : { inputMode })}
        {...(required ? { required: true } : {})}
        {...(autoComplete === undefined ? {} : { autoComplete })}
        {...(defaultValue === undefined ? {} : { defaultValue })}
        {...(error === undefined ? {} : { "aria-invalid": true })}
        {...(describedBy === undefined ? {} : { "aria-describedby": describedBy })}
      />
      {hint === undefined ? null : (
        <p id={hintId} className="font-ui text-small text-ink-muted">
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorId} className="font-ui text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-ayuda`;

  return (
    <div className="space-y-2xs">
      <div className="flex min-h-touch items-center gap-sm">
        <input
          id={id}
          name={name}
          type="checkbox"
          className="size-md rounded-sm border-rule accent-forest"
          {...(hint === undefined ? {} : { "aria-describedby": hintId })}
          {...(defaultChecked === true ? { defaultChecked: true } : {})}
        />
        <label htmlFor={id} className="font-ui text-small text-ink">
          {label}
        </label>
      </div>
      {hint === undefined ? null : (
        <p id={hintId} className="pl-xl font-ui text-small text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function RadioField({
  name,
  legend,
  options,
  value,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  value: string;
}) {
  const id = useId();

  return (
    <fieldset className="space-y-2xs">
      <legend className="font-ui text-small font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-lg">
        {options.map((option) => (
          <div key={option.value} className="flex min-h-touch items-center gap-xs">
            <input
              id={`${id}-${option.value}`}
              name={name}
              type="radio"
              value={option.value}
              defaultChecked={option.value === value}
              className="size-md border-rule accent-forest"
            />
            <label
              htmlFor={`${id}-${option.value}`}
              className="font-ui text-small text-ink"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * El error que no es de ningún campo: la contraseña incorrecta, el proyecto sin
 * configurar, el límite de tasa.
 *
 * `role="alert"` y no un `<p>` cualquiera: quien usa un lector de pantalla envía el
 * formulario y no ve nada cambiar; sin la región viva, el error existe sólo para
 * quien mira.
 */
export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="max-w-measure font-ui text-small text-danger">
      {children}
    </p>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  tone = "primary",
}: {
  children: ReactNode;
  pendingLabel: string;
  tone?: "primary" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex min-h-cta w-full items-center justify-center rounded-md px-lg font-ui text-body font-medium sm:min-h-12 sm:w-auto",
        "transition-colors duration-fast ease-editorial disabled:opacity-60",
        tone === "primary"
          ? "bg-forest text-paper hover:bg-forest-strong"
          : "border border-danger text-danger hover:bg-paper-sunk",
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** El idioma de la página, que la acción necesita y la persona no edita. */
export function LocaleField({ locale }: { locale: string }) {
  return <input type="hidden" name="idioma" value={locale} />;
}
