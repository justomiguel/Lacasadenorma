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
 * De qué lado del sitio es esta sesión.
 *
 * Desde ADR-027 hay dos audiencias con el mismo rol de base de datos, y la
 * distinción **no es una bandera nueva**: es `role === null`. Escribir una
 * columna `is_public` o un claim `audience` habría creado un segundo lugar donde
 * la verdad puede estar equivocada, y el primero —tener o no una fila en
 * `user_roles`— ya es el que las policies y el hook del token consultan.
 *
 * Las dos funciones existen y ninguna es el `!` de la otra escrito dos veces:
 * cada call site dice cuál de las dos cosas le importa, y `!isStaff(viewer)` en
 * una pantalla del sitio público se lee como una negación de algo del backoffice
 * cuando lo que quiere decir es "es alguien que vino a donar".
 */
export function isPublicAccount(viewer: Viewer): boolean {
  return viewer.role === null;
}

export function isStaff(viewer: Viewer): boolean {
  return viewer.role !== null;
}

/**
 * Un claim ausente, con otro tipo, o con un valor que no está en la escala de roles
 * da `null`. No hay valor por defecto: el rol es una autorización, y la ausencia de
 * autorización no puede resolverse optimistamente.
 *
 * Con el registro abierto este `null` dejó de ser el caso raro de una cuenta recién
 * creada por `owner` y pasó a ser el caso mayoritario: es lo que devuelve toda
 * sesión del público.
 */
function readRoleClaim(claims: Record<string, unknown>): AppRole | null {
  const appMetadata = claims["app_metadata"];

  if (typeof appMetadata !== "object" || appMetadata === null) {
    return null;
  }

  const candidate = (appMetadata as Record<string, unknown>)["user_role"];

  return isAppRole(candidate) ? candidate : null;
}
