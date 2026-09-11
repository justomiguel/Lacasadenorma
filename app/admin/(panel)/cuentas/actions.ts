"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/components/admin/form";
import { savePaymentMethod, setPaymentMethodPublished } from "@/src/application/admin";
import { getAdminDeps, NOT_CONFIGURED } from "@/src/infrastructure/admin/context";

/**
 * Las acciones de cuentas.
 *
 * La única parte del backoffice donde el `FormData` no se puede convertir con
 * `Object.fromEntries`: los datos de una cuenta son una lista, y `fromEntries` se
 * queda con el último valor de cada nombre repetido. Acá se arma a mano con `getAll`.
 *
 * Los cuatro arreglos se recorren por posición, y eso funciona porque los cuatro
 * campos de cada renglón están siempre presentes en el formulario, incluidos los
 * vacíos. Es la razón por la que `copyable` viaja en un `hidden` y no en una casilla:
 * una casilla sin marcar no se envía, y una ausencia en el medio de la lista
 * desalinearía todos los renglones siguientes. Un CBU con la etiqueta de otro campo es
 * exactamente el error que este formulario no puede permitir.
 *
 * Los renglones sin valor se descartan: el formulario ofrece los campos de cada país y
 * no todos los bancos usan todos.
 */
function readFields(
  formData: FormData,
): { label: string; value: string; copyable: string; hint: string }[] {
  const labels = formData.getAll("fieldLabel");
  const values = formData.getAll("fieldValue");
  const copyables = formData.getAll("fieldCopyable");
  const hints = formData.getAll("fieldHint");

  const text = (value: FormDataEntryValue | undefined): string =>
    typeof value === "string" ? value.trim() : "";

  return labels
    .map((_, index) => ({
      label: text(labels[index]),
      value: text(values[index]),
      copyable: text(copyables[index]),
      hint: text(hints[index]),
    }))
    .filter((field) => field.value.length > 0 && field.label.length > 0);
}

/**
 * Un campo del formulario como cadena, o ausente.
 *
 * `formData.get` devuelve `null` cuando el campo no está, y los esquemas esperan
 * `string | undefined`: un `null` en un campo opcional se leería como un tipo
 * equivocado y produciría un error de validación incomprensible en lugar de tomar el
 * valor por omisión.
 */
function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);

  return typeof value === "string" ? value : undefined;
}

export async function savePaymentMethodAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await savePaymentMethod(deps, {
    campaignId: field(formData, "campaignId"),
    id: field(formData, "id"),
    countryCode: field(formData, "countryCode"),
    currency: field(formData, "currency"),
    label: field(formData, "label"),
    instructions: field(formData, "instructions"),
    sortOrder: field(formData, "sortOrder"),
    fields: readFields(formData),
  });

  if (result.status === "ok") {
    revalidatePath("/admin/cuentas");
  }

  return result;
}

export async function setPaymentMethodPublishedAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const deps = await getAdminDeps();

  if (deps === null) {
    return NOT_CONFIGURED;
  }

  const result = await setPaymentMethodPublished(deps, Object.fromEntries(formData));

  if (result.status === "ok") {
    revalidatePath("/admin/cuentas");
    // Publicar una cuenta cambia la página de aportes, y la home enlaza a ella con el
    // aviso de "todavía no hay cuentas publicadas" cuando no hay ninguna.
    revalidatePath("/");
    revalidatePath("/ayudar");
  }

  return result;
}
