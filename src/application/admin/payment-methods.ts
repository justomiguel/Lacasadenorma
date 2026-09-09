import { z } from "zod";

import { COUNTRY_CODES } from "@/src/domain/entities";

import { perform, type AdminDeps, type AdminResult } from "./core";
import { checkbox, currency, optionalText, requiredText, sortOrder, uuid } from "./fields";

/**
 * Cuentas de aporte.
 *
 * Es la operación de mayor impacto del sistema y la única reservada a `owner`: quien
 * pueda cambiar un CBU puede desviar todos los aportes de la campaña (amenaza T1).
 * No hay ninguna razón para que un `admin` lo pueda hacer, y por eso no puede.
 *
 * La validación de acá es más estricta que en el resto del backoffice, con dos reglas
 * que la base también impone:
 *
 * 1. **Ningún marcador de relleno.** Publicar un CBU que dice PENDIENTE es peor que
 *    no publicar nada, porque parece un dato: alguien lo copia, la transferencia
 *    falla, y la confianza no vuelve.
 * 2. **Una cuenta publicada tiene al menos un campo.** Sin datos no sirve para
 *    transferir, y una tarjeta de país vacía en la página de aportes se lee como que
 *    el sitio está roto (FR-007).
 */

const PLACEHOLDER = /\b(PENDIENTE|TODO|FIXME|XXXX|PLACEHOLDER|EJEMPLO|TBD)\b/i;

const fieldSchema = z.object({
  label: requiredText("la etiqueta del dato", 60),
  value: z
    .string({ error: "Falta el dato." })
    .trim()
    .min(1, "Falta el dato.")
    .max(120, "El dato no puede pasar de 120 caracteres.")
    .refine(
      (value) => !PLACEHOLDER.test(value),
      "Ese valor es un marcador de relleno. Cargá el dato real o dejá la cuenta sin publicar.",
    ),
  /** Un CBU se copia; el nombre del titular se lee. */
  copyable: checkbox,
  hint: optionalText(160),
});

const saveSchema = z.object({
  campaignId: uuid("la campaña"),
  id: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === undefined || value.length === 0 ? null : value)),
  countryCode: z.enum(COUNTRY_CODES, { error: "Elegí el país." }),
  currency,
  label: requiredText("el nombre de la cuenta", 120),
  fields: z
    .array(fieldSchema)
    .min(1, "Una cuenta necesita al menos un dato para poder transferir.")
    .max(8, "Ocho datos es el máximo: más no se leen."),
  instructions: optionalText(500),
  sortOrder,
});

export async function savePaymentMethod(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ id: string }>> {
  return perform({
    deps,
    permission: "cuentas.escribir",
    describe: "guardar la cuenta",
    schema: saveSchema,
    input,
    run: async (data) => ({
      id: await deps.gateway.paymentMethods.saveMethod({
        campaignId: data.campaignId,
        id: data.id,
        countryCode: data.countryCode,
        currency: data.currency,
        label: data.label,
        fields: data.fields.map((field) => ({
          label: field.label,
          value: field.value,
          copyable: field.copyable,
          hint: field.hint,
        })),
        instructions: data.instructions,
        sortOrder: data.sortOrder,
      }),
    }),
    success: () => "Cuenta guardada. Todavía no se publica.",
    audit: (data, output) => ({
      action: data.id === null ? "payment_method.created" : "payment_method.updated",
      entityTable: "payment_methods",
      entityId: output.id,
      // Los valores **no** van al diff: son los datos bancarios completos, y el
      // registro de auditoría lo leen más roles que la tabla. Se guarda qué campos
      // se tocaron, que es lo que hace falta para reconstruir qué pasó.
      diff: {
        label: data.label,
        country: data.countryCode,
        fields: data.fields.map((field) => field.label),
      },
    }),
  });
}

const publishSchema = z.object({
  id: uuid("la cuenta"),
  publish: z.union([z.literal("si"), z.literal("no")]),
});

export async function setPaymentMethodPublished(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ published: boolean }>> {
  return perform({
    deps,
    permission: "cuentas.escribir",
    describe: "cambiar el estado de la cuenta",
    schema: publishSchema,
    input,
    run: async (data) => {
      const published = data.publish === "si";

      await deps.gateway.paymentMethods.setMethodPublished({
        id: data.id,
        publishedAt: published ? new Date().toISOString() : null,
      });

      return { published };
    },
    success: (output) =>
      output.published
        ? "Cuenta publicada. Ya aparece en la página de aportes."
        : "Cuenta despublicada. Dejó de aparecer en el sitio.",
    audit: (data, output) => ({
      action: output.published
        ? "payment_method.published"
        : "payment_method.unpublished",
      entityTable: "payment_methods",
      entityId: data.id,
      diff: null,
    }),
  });
}
