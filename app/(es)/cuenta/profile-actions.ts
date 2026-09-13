"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  deleteOwnAccount,
  updateOwnProfile,
} from "@/src/application/accounts/own-account";
import { getContent } from "@/content";
import { getAccountDeps } from "@/src/infrastructure/accounts/context";
import { localizeHref } from "@/src/i18n/locale";

import { failure, localeOf, textOf, type AccountFormState } from "./form-state";

/**
 * Lo que una persona hace sobre su propia cuenta: cambiar cómo aparece y borrarla.
 *
 * Están separadas de `actions.ts` por el tope de 300 líneas y porque son de otra
 * naturaleza: las de identidad hablan con GoTrue, éstas pasan por un caso de uso y
 * por un puerto, como cualquier otra escritura del proyecto (ADR-005).
 *
 * Ninguna de las dos deja rastro en `audit_log`, y es deliberado: el registro de
 * auditoría existe para responder "quién del equipo cambió esto". Una fila que
 * dijera que alguien del público cambió su propio nombre sería vigilancia, y una
 * que dijera que borró su cuenta sería exactamente el residuo que el borrado tiene
 * que no dejar (`docs/privacy.md` § Registro de auditoría).
 */

export async function updateProfile(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = localeOf(formData);
  const result = await updateOwnProfile(await getAccountDeps(), {
    displayName: textOf(formData, "nombre"),
    // Una casilla desmarcada **no se manda**: el `??` no es un default cosmético,
    // es la traducción de "no está en el FormData" a "no quiere ser anónima".
    anonymous: formData.get("anonimo") === null ? "no" : "si",
    locale: textOf(formData, "correoIdioma") || locale,
  });

  if (result.status === "error") {
    return failure(result.code, result.field);
  }

  // El muro de donantes es contenido cacheado, y cambiar el anonimato tiene que
  // sacar o poner un nombre ahí mismo, no en el próximo despliegue (FR-229). La
  // ruta se revalida aunque el muro todavía no exista: cuando exista, esto ya va a
  // estar hecho y nadie va a tener que acordarse.
  revalidatePath(localizeHref("/quienes-ayudaron", locale));
  revalidatePath(localizeHref("/cuenta", locale));

  return { phase: "done" };
}

export async function deleteAccount(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = localeOf(formData);

  // La palabra escrita se compara en el servidor y no sólo en el navegador. No es
  // una medida de seguridad —quien quiera borrar su cuenta puede— sino de intención:
  // una acción irreversible disparada por un click perdido no tiene vuelta atrás.
  // Y se compara contra la palabra **del idioma de la página**, que es la que la
  // pantalla pidió: en `/en/cuenta` dice DELETE y en `/cuenta` dice BORRAR.
  const esperada = getContent(locale).account.profile.deleteWord;

  if (textOf(formData, "confirmacion").trim() !== esperada) {
    return failure("failed");
  }

  const result = await deleteOwnAccount(await getAccountDeps());

  if (result.status === "error") {
    return failure(result.code, result.field);
  }

  revalidatePath(localizeHref("/quienes-ayudaron", locale));

  redirect(localizeHref("/", locale));
}
