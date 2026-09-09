import type { ZodType } from "zod";

import type { Logger } from "@/src/domain/ports/logger";

import type { DataLayer } from "../data-layer";

/**
 * Contrato de una capacidad expuesta a agentes.
 *
 * `readOnly` está tipado como el literal `true`, no como `boolean`. Agregar una
 * capacidad que mute estado obliga a cambiar **este tipo**, lo que fuerza una
 * decisión consciente y una enmienda de la especificación. Es la diferencia
 * entre una convención y una frontera (amenaza A1).
 */
export interface AgentCapability<TInput, TOutput> {
  /** snake_case, hasta 30 caracteres. Es el nombre que ve el agente. */
  readonly name: string;
  /** Para interfaces humanas, en castellano. */
  readonly title: string;
  /**
   * Literal y afirmativa. Sin instrucciones al modelo y sin interpolar nada:
   * una descripción que le habla al modelo es el vector de tool poisoning (A3).
   */
  readonly description: string;
  readonly input: ZodType<TInput>;
  readonly readOnly: true;
  run(input: TInput, context: CapabilityContext): Promise<CapabilityOutcome<TOutput>>;
  /** Texto breve para agentes. Es lo que se lee cuando no se procesa el JSON. */
  format(output: TOutput): string;
}

export interface CapabilityContext {
  readonly dataLayer: DataLayer;
  readonly logger: Logger;
  /** Origen público del sitio, para que las capacidades puedan devolver enlaces citables. */
  readonly siteUrl: string;
}

export type CapabilityErrorCode = "invalid_input" | "unavailable" | "not_found";

/** Lo que devuelve `run`: los datos, o un motivo nombrado por el que no los hay. */
export type CapabilityOutcome<T> =
  | { readonly ok: true; readonly output: T }
  | { readonly ok: false; readonly code: CapabilityErrorCode; readonly message: string };

/** Lo que devuelve el servicio: agrega el texto formateado al resultado. */
export type CapabilityResult<T> =
  | { readonly ok: true; readonly output: T; readonly text: string }
  | { readonly ok: false; readonly code: CapabilityErrorCode; readonly message: string };

/**
 * Presupuestos que impone Chrome a las herramientas de WebMCP. Están acá y no en
 * el adaptador porque el límite aplica a la definición, no al transporte.
 */
export const CAPABILITY_LIMITS = {
  name: 30,
  description: 500,
  output: 1500,
} as const;

/**
 * Una capacidad con sus tipos borrados, que es lo que necesita un registro
 * heterogéneo. `run` recibe `unknown` porque quien llama es un adaptador HTTP o
 * un agente: la validación con Zod pasa de ser una conveniencia a ser la frontera
 * de entrada (amenaza A4).
 */
export interface CapabilityDescriptor {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly input: ZodType;
  readonly readOnly: true;
  run(rawInput: unknown, context: CapabilityContext): Promise<CapabilityResult<unknown>>;
}

/**
 * Envuelve una capacidad tipada en un descriptor.
 *
 * Es lo único de este módulo que se parece a un patrón: un Adapter que borra los
 * genéricos hacia afuera y los conserva hacia adentro. Sin él, el registro
 * necesitaría `any`, que la constitución prohíbe, o cinco listas separadas.
 */
export function defineCapability<TInput, TOutput>(
  capability: AgentCapability<TInput, TOutput>,
): CapabilityDescriptor {
  return {
    name: capability.name,
    title: capability.title,
    description: capability.description,
    input: capability.input,
    readOnly: true,
    async run(rawInput, context) {
      const parsed = capability.input.safeParse(rawInput ?? {});

      if (!parsed.success) {
        return {
          ok: false,
          code: "invalid_input",
          message: describeIssues(parsed.error.issues),
        };
      }

      const outcome = await capability.run(parsed.data, context);

      if (!outcome.ok) {
        return outcome;
      }

      return {
        ok: true,
        output: outcome.output,
        text: capability.format(outcome.output),
      };
    },
  };
}

/**
 * Traduce los problemas de validación a prosa accionable. El texto lo lee un
 * modelo que puede corregirse y reintentar, así que un volcado de Zod no sirve.
 */
function describeIssues(issues: readonly { message: string; path: PropertyKey[] }[]): string {
  return issues
    .map((issue) => {
      const field = issue.path.map(String).join(".");

      return field.length === 0 ? issue.message : `${field}: ${issue.message}`;
    })
    .join(" ");
}
