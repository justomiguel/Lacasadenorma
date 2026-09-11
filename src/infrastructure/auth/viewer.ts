import { isAppRole, type AppRole } from "@/src/domain/entities/role";

import { createServerSupabaseClient } from "../supabase/server-client";

/**
 * Quién está mirando.
 *
 * Dos decisiones que parecen detalles y no lo son.
 *
 * **1. El rol se lee del claim `app_metadata.user_role`, no de una consulta a
 * `user_roles`.** El hook `custom_access_token_hook` lo pone ahí al emitir el
 * token, así que leerlo es gratis y no agrega una consulta por request. Lo
 * importante es de dónde **no** se lee: `user_metadata` es escribible por la propia
 * persona con una llamada a `updateUser`, así que un rol declarado ahí no otorga
 * nada. La misma asimetría existe en las policies SQL, y hay una prueba pgTAP que
 * lo verifica (amenaza S3).
 *
 * **2. Se usa `getClaims()` y no `getSession()`.** `getSession()` devuelve lo que
 * hay en la cookie sin verificar la firma: en el servidor eso es confiar en un dato
 * que vino del cliente. `getClaims()` valida el JWT —contra la clave pública del
 * proyecto, o contra el servidor de autenticación si no hay JWKS— así que un token
 * fabricado no pasa. Es la diferencia entre leer una credencial y verificarla.
 *
 * Devuelve `null` cuando no hay sesión válida, y también cuando Supabase no está
 * configurado. Los dos casos significan lo mismo para quien llama: no hay nadie
 * autenticado.
 */

export interface Viewer {
  readonly userId: string;
  readonly email: string | null;
  /** Nulo cuando la persona tiene sesión pero ningún rol otorgado todavía. */
  readonly role: AppRole | null;
}

export async function readViewer(): Promise<Viewer | null> {
  const client = await createServerSupabaseClient();

  if (client === null) {
    return null;
  }

  const { data, error } = await client.auth.getClaims();

  if (error !== null || data === null) {
    return null;
  }

  const claims = data.claims;
  const subject = claims.sub;

  if (typeof subject !== "string" || subject.length === 0) {
    return null;
  }

  return {
    userId: subject,
    email: typeof claims.email === "string" ? claims.email : null,
    role: readRoleClaim(claims),
  };
}

/**
 * Un claim ausente, con otro tipo, o con un valor que no está en la escala de roles
 * da `null`. No hay valor por defecto: el rol es una autorización, y la ausencia de
 * autorización no puede resolverse optimistamente.
 */
function readRoleClaim(claims: Record<string, unknown>): AppRole | null {
  const appMetadata = claims["app_metadata"];

  if (typeof appMetadata !== "object" || appMetadata === null) {
    return null;
  }

  const candidate = (appMetadata as Record<string, unknown>)["user_role"];

  return isAppRole(candidate) ? candidate : null;
}
