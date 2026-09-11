"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/components/design-system/cn";
import type { AdminResult, FieldErrors } from "@/src/application/admin";

/**
 * Los formularios del backoffice.
 *
 * Son componentes de cliente, y es la única parte del proyecto donde eso se acepta
 * sin discutir: el sitio público se sirve sin JavaScript de aplicación, pero acá el
 * estado de un envío —qué campo está mal, si está en curso, qué pasó— es la mitad de
 * la herramienta. Igual funcionan sin JavaScript: `useActionState` degrada a un POST
 * normal y la página vuelve con el resultado, así que publicar un avance desde un
 * teléfono con mala señal sigue siendo posible.
 *
 * Cómo llega el error a su campo: la acción devuelve `fieldErrors` y `ActionForm` lo
 * publica por contexto; cada `Field` busca el suyo por nombre y lo muestra debajo,
 * con `aria-describedby` y `aria-invalid`. Es lo que pide FR-023 —el mensaje al lado
 * del campo, no un cartel arriba de todo— y lo que hace que un lector de pantalla
 * anuncie el error al llegar al campo y no sólo al enviar.
 */

export type ActionState = AdminResult<unknown> | { readonly status: "idle" };

export const IDLE_STATE: ActionState = { status: "idle" };

const FieldErrorsContext = createContext<FieldErrors>({});

function errorsOf(state: ActionState): FieldErrors {
  return state.status === "invalid" ? state.fieldErrors : {};
}

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  /**
   * Para los formularios que se usan muchas veces seguidas —cargar tres gastos de
   * la misma compra— vaciar los campos es lo correcto. Para los de edición no: quien
   * corrige un texto quiere seguir viéndolo.
   */
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, IDLE_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "ok" && resetOnSuccess) {
      formRef.current?.reset();
    }
  }, [state, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={cn("space-y-lg", className)}>
      <FieldErrorsContext.Provider value={errorsOf(state)}>
        {children}
      </FieldErrorsContext.Provider>
      <Feedback state={state} />
    </form>
  );
}

/**
 * El resultado, en palabras.
 *
 * `role="status"` cuando salió bien y `role="alert"` cuando no: la diferencia hace
 * que un lector de pantalla interrumpa lo que está leyendo sólo cuando hay algo que
 * corregir. Nunca se queda en silencio, ni cuando falla el servidor (principio XII).
 */
function Feedback({ state }: { state: ActionState }) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "ok") {
    return (
      <p role="status" className="font-ui text-small text-success">
        {state.message}
      </p>
    );
  }

  return (
    <p
      role="alert"
      className={cn(
        "font-ui text-small",
        state.status === "invalid" ? "text-ink" : "text-danger",
      )}
    >
      {state.message}
    </p>
  );
}

const CONTROL =
  "w-full min-h-touch rounded-sm border border-rule bg-paper px-sm py-xs font-ui text-body text-ink placeholder:text-ink-faint focus-visible:border-focus aria-[invalid=true]:border-danger";

interface FieldProps {
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
function useField(name: string, hint: string | undefined) {
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

function FieldFrame({
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

export function TextField({
  name,
  label,
  hint,
  required,
  className,
  type = "text",
  defaultValue,
  placeholder,
  inputMode,
  autoComplete,
  maxLength,
}: FieldProps & {
  type?: "text" | "date" | "email" | "password" | "url";
  defaultValue?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal" | "email";
  autoComplete?: string;
  maxLength?: number;
}) {
  const field = useField(name, hint);

  return (
    <FieldFrame
      id={field.id}
      label={label}
      hintId={field.hintId}
      errorId={field.errorId}
      className={className}
      {...(hint === undefined ? {} : { hint })}
      {...(field.error === undefined ? {} : { error: field.error })}
      {...(required === undefined ? {} : { required })}
    >
      <input
        id={field.id}
        name={name}
        type={type}
        className={CONTROL}
        aria-invalid={field.error === undefined ? undefined : true}
        aria-describedby={field.describedBy}
        {...(required === true ? { required: true } : {})}
        {...(defaultValue === undefined ? {} : { defaultValue })}
        {...(placeholder === undefined ? {} : { placeholder })}
        {...(inputMode === undefined ? {} : { inputMode })}
        {...(autoComplete === undefined ? {} : { autoComplete })}
        {...(maxLength === undefined ? {} : { maxLength })}
      />
    </FieldFrame>
  );
}

export function TextAreaField({
  name,
  label,
  hint,
  required,
  className,
  defaultValue,
  rows = 8,
  maxLength,
}: FieldProps & { defaultValue?: string; rows?: number; maxLength?: number }) {
  const field = useField(name, hint);

  return (
    <FieldFrame
      id={field.id}
      label={label}
      hintId={field.hintId}
      errorId={field.errorId}
      className={className}
      {...(hint === undefined ? {} : { hint })}
      {...(field.error === undefined ? {} : { error: field.error })}
      {...(required === undefined ? {} : { required })}
    >
      <textarea
        id={field.id}
        name={name}
        rows={rows}
        className={cn(CONTROL, "font-prose leading-relaxed")}
        aria-invalid={field.error === undefined ? undefined : true}
        aria-describedby={field.describedBy}
        {...(required === true ? { required: true } : {})}
        {...(defaultValue === undefined ? {} : { defaultValue })}
        {...(maxLength === undefined ? {} : { maxLength })}
      />
    </FieldFrame>
  );
}

export function SelectField({
  name,
  label,
  hint,
  required,
  className,
  options,
  defaultValue,
}: FieldProps & {
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
}) {
  const field = useField(name, hint);

  return (
    <FieldFrame
      id={field.id}
      label={label}
      hintId={field.hintId}
      errorId={field.errorId}
      className={className}
      {...(hint === undefined ? {} : { hint })}
      {...(field.error === undefined ? {} : { error: field.error })}
      {...(required === undefined ? {} : { required })}
    >
      <select
        id={field.id}
        name={name}
        className={CONTROL}
        aria-invalid={field.error === undefined ? undefined : true}
        aria-describedby={field.describedBy}
        {...(defaultValue === undefined ? {} : { defaultValue })}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

export function FileField({
  name,
  label,
  hint,
  required,
  className,
  accept,
}: FieldProps & { accept?: string }) {
  const field = useField(name, hint);

  return (
    <FieldFrame
      id={field.id}
      label={label}
      hintId={field.hintId}
      errorId={field.errorId}
      className={className}
      {...(hint === undefined ? {} : { hint })}
      {...(field.error === undefined ? {} : { error: field.error })}
      {...(required === undefined ? {} : { required })}
    >
      <input
        id={field.id}
        name={name}
        type="file"
        className="block w-full font-ui text-small text-ink file:mr-sm file:min-h-touch file:rounded-sm file:border file:border-rule file:bg-paper-sunk file:px-sm file:py-xs file:font-ui file:text-small"
        aria-invalid={field.error === undefined ? undefined : true}
        aria-describedby={field.describedBy}
        {...(required === true ? { required: true } : {})}
        {...(accept === undefined ? {} : { accept })}
      />
    </FieldFrame>
  );
}

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

  return (
    <div className={cn("space-y-2xs", className)}>
      <div className="flex min-h-touch items-center gap-sm">
        <input
          id={field.id}
          name={name}
          type="checkbox"
          className="size-md rounded-sm border-rule accent-brick"
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
    primary: "bg-brick text-paper hover:bg-brick-strong",
    quiet: "border border-rule bg-paper text-ink hover:bg-paper-sunk",
    danger: "border border-danger bg-paper text-danger hover:bg-paper-sunk",
  };

  return (
    <button
      type="submit"
      disabled={pending}
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

/**
 * `defaultValue` sólo cuando hay algo que precargar.
 *
 * Existe por `exactOptionalPropertyTypes`: una prop opcional no acepta `undefined`
 * explícito, y lo que viene de la base es `string | null`. Esto convierte las dos
 * formas de "no hay dato" en la única que el tipo admite, que es la prop ausente.
 */
export function defaultOf(value: string | null | undefined): { defaultValue?: string } {
  return value === null || value === undefined ? {} : { defaultValue: value };
}

/** Un valor que la acción necesita y la persona no edita: el id, la campaña. */
export function HiddenValue({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}
