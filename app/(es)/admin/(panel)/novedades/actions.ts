"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ActionState } from "@/components/admin/form";
import { addUpdatePhoto, saveUpdate, setUpdatePublished } from "@/src/application/admin";
import { getAdminDeps, NOT_CONFIGURED } from "@/src/infrastructure/admin/context";

/**
 * Las acciones de novedades.
 *
 * Cada una hace tres cosas y ninguna más: armar las dependencias, llamar el caso de
 * uso, e invalidar las rutas públicas que quedaron viejas. La validación, el permiso y
 * el registro de auditoría viven en el caso de uso, así que no se pueden olvidar acá.
 *
 * `Object.fromEntries` alcanza porque ningún campo de estos formularios se repite.
 * Donde sí se repiten —los datos de una cuenta bancaria— la acción arma el objeto a
 * mano con `getAll`.
 */

/** Las rutas que muestran novedades. Publicar una toca las cuatro. */
function revalidatePublicUpdates(slug: string): void {
  revalidatePath("/");
  revalidatePath("/novedades");
  revalidatePath(`/novedades/${slug}`);
  revalidatePath("/sitemap.xml");
}

export async function saveUpdateAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const entries = Object.fromEntries(formData);
  const result = await saveUpdate(deps, entries);

  if (result.status !== "ok") {
    return result;
  }

  revalidatePath("/admin/novedades");

  const slug = formData.get("slug");

  if (typeof slug === "string") {
    revalidatePublicUpdates(slug);
  }

  /**
   * Al crear, se cae en la pantalla del borrador. Es la mitad de SC-009: quien acaba
   * de escribir el avance en la obra ya está donde se le agrega la foto y se publica,
   * sin tener que buscarlo en una lista.
   */
  const isNew = typeof entries["id"] !== "string" || entries["id"].length === 0;

  if (isNew) {
    redirect(`/admin/novedades/${result.value.id}`);
  }

  return result;
}

export async function setUpdatePublishedAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await setUpdatePublished(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidatePath("/admin/novedades");

    const slug = formData.get("slug");

    revalidatePublicUpdates(typeof slug === "string" ? slug : "");
  }

  return result;
}

export async function addPhotoAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await addUpdatePhoto(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidatePath("/admin/novedades");

    const slug = formData.get("slug");

    if (typeof slug === "string") {
      revalidatePublicUpdates(slug);
    }
  }

  return result;
}
