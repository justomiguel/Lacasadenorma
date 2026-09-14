"use server";

import {
  removeOwnPortrait,
  saveOwnPortrait,
} from "@/src/application/accounts/own-portrait";
import { getAccountDeps } from "@/src/infrastructure/accounts/context";

import { failure, type AccountFormState } from "./form-state";

/**
 * Subir o quitar el retrato. No revalidan el muro: la foto no se publica
 * (FR-246, ADR-037).
 */

export async function savePortrait(
  _state: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const file = formData.get("foto");

  if (!(file instanceof File) || file.size === 0) {
    return failure("portraitInvalid", "portrait");
  }

  const result = await saveOwnPortrait(await getAccountDeps(), file);

  if (result.status === "error") {
    return failure(result.code, result.field);
  }

  return { phase: "done" };
}

export async function removePortrait(
  _state: AccountFormState,
): Promise<AccountFormState> {
  const result = await removeOwnPortrait(await getAccountDeps());

  if (result.status === "error") {
    return failure(result.code, result.field);
  }

  return { phase: "done" };
}
