import type { DonorProfile } from "@/src/domain/entities/donor";
import type { AccountPort } from "@/src/domain/ports/accounts";

import { accountError, accountOk, type AccountOutcome } from "./outcome";
import { type AccountDeps } from "./own-account";

/**
 * El retrato propio y el snapshot del chrome.
 *
 * Viven aparte de `own-account.ts` por el tope de 300 líneas y porque son otra
 * operación: no tocan el muro, no mandan correo y **no crean el perfil**. Pedir
 * `/cuenta/sesion` desde el menú no puede disparar el aviso de cuenta nueva
 * (ADR-037).
 */

function readyPort(deps: AccountDeps): AccountPort | AccountOutcome<never> {
  if (deps.session.status === "not-configured") {
    return accountError("notConfigured");
  }

  if (deps.session.status === "anonymous") {
    return accountError("noSession");
  }

  return deps.session.port;
}

function isOutcome(value: unknown): value is AccountOutcome<never> {
  return typeof value === "object" && value !== null && "status" in value;
}

function describeFailure(
  deps: AccountDeps,
  describe: string,
  error: unknown,
): AccountOutcome<never> {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";

  if (name === "UnsupportedFileError") {
    return accountError("portraitInvalid", "portrait");
  }

  if (message.includes("rol interno")) {
    return accountError("internalRole");
  }

  deps.logger.error(`No se pudo ${describe}`, { error });

  return accountError("failed");
}

export interface OwnChrome {
  readonly displayName: string | null;
  readonly hasPortrait: boolean;
}

/**
 * Lo que el menú necesita, **sin crear la fila**.
 *
 * Si la persona confirmó el correo y todavía no abrió `/cuenta`, no hay perfil
 * y el chrome lo dice con nombre nulo y sin foto. Crear la fila acá mandaría el
 * correo de pedido de cuenta por abrir el menú.
 */
export async function readOwnChrome(
  deps: AccountDeps,
): Promise<AccountOutcome<OwnChrome>> {
  const port = readyPort(deps);

  if (isOutcome(port)) {
    return port;
  }

  try {
    const profile = await port.readOwnProfile();

    return accountOk({
      displayName: profile?.displayName ?? null,
      hasPortrait: profile?.portraitPath !== null && profile?.portraitPath !== undefined,
    });
  } catch (error) {
    return describeFailure(deps, "leer el chrome de tu cuenta", error);
  }
}

export async function saveOwnPortrait(
  deps: AccountDeps,
  file: File,
): Promise<AccountOutcome<DonorProfile>> {
  const port = readyPort(deps);

  if (isOutcome(port)) {
    return port;
  }

  try {
    return accountOk(await port.saveOwnPortrait(file));
  } catch (error) {
    return describeFailure(deps, "guardar tu foto", error);
  }
}

export async function removeOwnPortrait(
  deps: AccountDeps,
): Promise<AccountOutcome<DonorProfile>> {
  const port = readyPort(deps);

  if (isOutcome(port)) {
    return port;
  }

  try {
    return accountOk(await port.removeOwnPortrait());
  } catch (error) {
    return describeFailure(deps, "quitar tu foto", error);
  }
}
