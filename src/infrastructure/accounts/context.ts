import type { AccountDeps } from "@/src/application/accounts/own-account";

import { notifyAccountOpened } from "./notify";
import { readViewer } from "../auth/viewer";
import { logger } from "../logging/logger";
import { createAccountPort } from "../supabase/accounts-port";
import { createDonationsPort } from "../supabase/donations-port";
import {
  createServerSupabaseClient,
  type ServerSupabaseClient,
} from "../supabase/server-client";

/**
 * La raíz de composición de `/cuenta`.
 *
 * Distingue los dos estados que no son sesión —sin proyecto configurado y sin
 * sesión— porque la pantalla los explica distinto: el primero es un despliegue a
 * medias y el segundo es una invitación a ingresar. Ninguno de los dos es un
 * error, y por eso ninguno devuelve `null` (principio XII).
 *
 * La sesión se lee con `readViewer()`, que usa `getClaims()` y verifica la firma
 * del token. No se usa `getSession()` en ningún lado de este proyecto: devuelve
 * lo que hay en la cookie sin validar nada.
 */
export function accountDepsForClient(client: ServerSupabaseClient): AccountDeps {
  return {
    session: {
      status: "ready",
      port: createAccountPort(client),
      donations: createDonationsPort(client),
    },
    logger,
    onAccountOpened: notifyAccountOpened,
  };
}

export async function getAccountDeps(): Promise<AccountDeps> {
  const client = await createServerSupabaseClient();

  if (client === null) {
    return { session: { status: "not-configured" }, logger };
  }

  if ((await readViewer()) === null) {
    return { session: { status: "anonymous" }, logger };
  }

  return accountDepsForClient(client);
}
