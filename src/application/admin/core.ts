import type { z } from "zod";

import { NotAuthorizedError } from "@/src/domain/errors";
import { can, type Permission } from "@/src/domain/permissions";
import type { AppRole } from "@/src/domain/entities/role";
import type { AdminGateway } from "@/src/domain/ports/admin";
import type { Logger } from "@/src/domain/ports/logger";

/**
 * La forma común de todas las operaciones del backoffice.
 *
 * Tres decisiones que valen para las seis áreas:
 *
 * **1. El resultado es un valor, no una excepción.** Una operación del backoffice
 * termina en la pantalla de quien la pidió, y las cuatro formas de terminar son
 * distintas para esa persona: salió bien, el dato está mal, no tenés permiso, o algo
 * se rompió. Una unión discriminada obliga al formulario a decir algo en cada caso
 * (principio XII); una excepción se convierte en un error 500 sin mensaje.
 *
 * **2. El permiso se comprueba acá, con la tabla del dominio.** No es la frontera
 * —la frontera son las policies RLS— pero es la que produce un mensaje en
 * castellano y la que se puede probar sin base de datos. `actor` es nullable a
 * propósito: "no hay sesión" es un estado que el tipo obliga a manejar, y es
 * exactamente el caso de una Server Action invocada por su ID sin cookie
 * (amenaza T7).
 *
 * **3. Toda mutación financiera deja rastro.** `perform` recibe la acción y la
 * entidad y escribe en `audit_log` después de que la operación salió bien. Si el
 * registro de auditoría falla, la operación **falla entera**: un cambio sin rastro
 * es peor que un cambio que no se hizo (FR-016).
 */

export interface Actor {
  readonly userId: string;
  readonly role: AppRole | null;
}

export interface AdminDeps {
  readonly gateway: AdminGateway;
  readonly logger: Logger;
  readonly actor: Actor | null;
}

export type FieldErrors = Readonly<Record<string, string>>;

export type AdminResult<T> =
  | { readonly status: "ok"; readonly value: T; readonly message: string }
  | {
      readonly status: "invalid";
      readonly message: string;
      readonly fieldErrors: FieldErrors;
    }
  | { readonly status: "rejected"; readonly message: string }
  | { readonly status: "failed"; readonly message: string };

/** Qué se guarda en el registro de auditoría cuando la operación toca plata o cuentas. */
export interface AuditTrail {
  readonly action: string;
  readonly entityTable: string;
  readonly entityId: string | null;
  readonly diff: Record<string, unknown> | null;
}

interface PerformOptions<Input, Output> {
  readonly deps: AdminDeps;
  readonly permission: Permission;
  /** Para el log cuando algo falla. Se lee en el mensaje de error, así que va en infinitivo. */
  readonly describe: string;
  readonly schema: z.ZodType<Input>;
  readonly input: unknown;
  readonly run: (input: Input) => Promise<Output>;
  readonly success: (output: Output) => string;
  /** Ausente cuando la operación no cambia nada auditable (por ejemplo, un borrador). */
  readonly audit?: (input: Input, output: Output) => AuditTrail;
}

export async function perform<Input, Output>({
  deps,
  permission,
  describe,
  schema,
  input,
  run,
  success,
  audit,
}: PerformOptions<Input, Output>): Promise<AdminResult<Output>> {
  const { actor, gateway, logger } = deps;

  if (actor === null) {
    return { status: "rejected", message: "Tu sesión venció. Volvé a entrar." };
  }

  if (!can(actor.role, permission)) {
    logger.warn("Operación del backoffice rechazada por permisos", {
      permission,
      role: actor.role,
      describe,
    });

    return { status: "rejected", message: "Tu rol no permite hacer esto." };
  }

  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "invalid",
      message: "Revisá los datos marcados.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const output = await run(parsed.data);

    if (audit !== undefined) {
      await gateway.audit.append(audit(parsed.data, output));
    }

    return { status: "ok", value: output, message: success(output) };
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { status: "rejected", message: error.message };
    }

    logger.error(`No se pudo ${describe}`, { error, permission });

    return {
      status: "failed",
      message: `No se pudo ${describe}. El detalle quedó en el registro del servidor.`,
    };
  }
}

/**
 * Un error de Zod aplanado a "campo → primer mensaje".
 *
 * Sólo el primero: mostrar tres mensajes bajo un mismo campo no ayuda a corregirlo,
 * y el orden de las validaciones ya pone primero la más básica.
 */
function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    const key = typeof field === "string" ? field : "_";

    errors[key] ??= issue.message;
  }

  return errors;
}
