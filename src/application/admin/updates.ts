import { z } from "zod";

import { parseRichText } from "@/src/domain/rich-text";

import { perform, type AdminDeps, type AdminResult } from "./core";
import {
  optionalPastDate,
  optionalText,
  optionalUuid,
  requiredText,
  slug,
} from "./fields";

/**
 * Novedades y fotos.
 *
 * Es el flujo que se mide en segundos: SC-009 pide que publicar un avance con una
 * foto desde el teléfono lleve menos de dos minutos. Todo lo de acá está ordenado
 * para eso, y hay dos consecuencias de diseño que no son obvias:
 *
 * **Guardar y publicar son dos operaciones.** Un borrador se guarda sin validar que
 * el texto esté terminado; publicar es un acto aparte y explícito. Así se puede
 * empezar a escribir en la obra, con mala señal, sin miedo a publicar algo a medias.
 * Las dos dejan rastro, también la del borrador: editar el texto de una novedad ya
 * publicada entra por acá, y sin la entrada el cambio sería invisible
 * ([ADR-020](../../../docs/adr/020-rastro-obligatorio.md)).
 *
 * **El cuerpo se parsea antes de guardar.** No para transformarlo —se guarda el
 * Markdown tal cual— sino para rechazar lo que el renderizador no va a poder mostrar.
 * El subconjunto de Markdown del proyecto no admite HTML crudo: un `<script>` en el
 * cuerpo de una novedad sería un XSS con privilegios de administración (amenaza T4).
 */

const saveSchema = z.object({
  campaignId: z.string().min(1, "Falta la campaña."),
  id: optionalUuid,
  slug,
  title: requiredText("el título", 140),
  body: z
    .string({ error: "Falta el texto." })
    .trim()
    .min(1, "Falta el texto.")
    .max(20_000, "El texto no puede pasar de 20.000 caracteres.")
    .refine(
      (value) => !/<\s*[a-z!/]/i.test(value),
      "El texto no admite HTML: usá **negrita**, _cursiva_, listas con guiones y > para citar.",
    )
    .refine(
      (value) => parseRichText(value).length > 0,
      "No pudimos interpretar el texto. Revisá el formato.",
    ),
});

export async function saveUpdate(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ id: string }>> {
  return perform({
    deps,
    permission: "contenido.escribir",
    describe: "guardar la novedad",
    schema: saveSchema,
    input,
    run: async (data) => ({
      id: await deps.gateway.updates.saveUpdate({
        campaignId: data.campaignId,
        id: data.id,
        slug: data.slug,
        title: data.title,
        body: data.body,
      }),
    }),
    success: () => "Novedad guardada.",
    audit: (data, output) => ({
      action: data.id === null ? "update.created" : "update.updated",
      entityTable: "updates",
      entityId: output.id,
      // El cuerpo no va al diff: son hasta veinte mil caracteres, y el registro se lee
      // como una lista de qué pasó, no como un historial de versiones del texto.
      diff: { slug: data.slug, title: data.title },
    }),
  });
}

const publishSchema = z.object({
  id: z.string().min(1, "Falta la novedad."),
  /** `""` despublica. Es explícito a propósito: no hay un botón que haga las dos cosas. */
  publish: z.union([z.literal("si"), z.literal("no")]),
});

export async function setUpdatePublished(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ published: boolean }>> {
  return perform({
    deps,
    permission: "contenido.escribir",
    describe: "cambiar el estado de la novedad",
    schema: publishSchema,
    input,
    run: async (data) => {
      const published = data.publish === "si";

      await deps.gateway.updates.setUpdatePublished({
        id: data.id,
        publishedAt: published ? new Date().toISOString() : null,
      });

      return { published };
    },
    success: (output) =>
      output.published
        ? "Novedad publicada. Ya está en el sitio y se puede compartir."
        : "Novedad despublicada. Volvió a borrador.",
    audit: (data, output) => ({
      action: output.published ? "update.published" : "update.unpublished",
      entityTable: "updates",
      entityId: data.id,
      diff: null,
    }),
  });
}

/**
 * Subir una foto y asociarla a una novedad, en una sola operación.
 *
 * `alt` es obligatorio y no hay forma de eludirlo: FR-024 lo pide, la base lo exige
 * con un `check` que además rechaza que el alt sea el nombre del archivo, y el
 * esquema de acá pide al menos diez caracteres. Tres barreras para la misma regla,
 * porque una foto sin descripción es contenido que una persona ciega no puede leer y
 * ninguna de las tres se puede desactivar por apuro.
 */
const photoSchema = z.object({
  updateId: z.string().min(1, "Falta la novedad."),
  file: z.instanceof(File, { error: "Elegí una foto." }),
  alt: z
    .string({ error: "Falta la descripción de la foto." })
    .trim()
    .min(10, "La descripción tiene que decir qué se ve: al menos diez caracteres.")
    .max(300, "La descripción no puede pasar de 300 caracteres."),
  caption: optionalText(300),
  credit: optionalText(120),
  takenOn: optionalPastDate,
  sortOrder: z.coerce.number().int().min(0).max(99).catch(0),
});

export async function addUpdatePhoto(
  deps: AdminDeps,
  input: unknown,
): Promise<AdminResult<{ mediaId: string }>> {
  return perform({
    deps,
    permission: "contenido.escribir",
    describe: "subir la foto",
    schema: photoSchema,
    input,
    run: async (data) => {
      const media = await deps.gateway.updates.createMedia({
        file: data.file,
        alt: data.alt,
        caption: data.caption,
        credit: data.credit,
        takenOn: data.takenOn,
      });

      await deps.gateway.updates.attachMediaToUpdate({
        updateId: data.updateId,
        mediaId: media.id,
        sortOrder: data.sortOrder,
      });

      return { mediaId: media.id };
    },
    success: () => "Foto agregada.",
    audit: (data, output) => ({
      action: "update.photo_added",
      // La entidad es la novedad y no la foto: quien lee el registro busca "qué le
      // pasó a esta novedad", y el identificador de la fila de `media` no le dice nada.
      entityTable: "updates",
      entityId: data.updateId,
      diff: { media: output.mediaId, alt: data.alt },
    }),
  });
}
