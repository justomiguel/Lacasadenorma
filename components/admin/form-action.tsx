"use client";

import { createContext, useActionState, useEffect, useRef, type ReactNode } from "react";

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

export const FieldErrorsContext = createContext<FieldErrors>({});

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
