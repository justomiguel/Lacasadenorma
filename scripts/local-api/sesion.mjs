import { randomUUID } from "node:crypto";

import { SESSION_SECONDS } from "./config.mjs";
import { claimsFromHook } from "./db.mjs";
import { signJwt } from "./jwt.mjs";

/**
 * Emitir una sesión, que es lo que hacen tres rutas distintas.
 *
 * Está separado de `auth.mjs` porque entrar con contraseña, renovar y **canjear el
 * enlace de un correo** terminan todas en el mismo lugar, y la tercera llegó con el
 * registro abierto (ADR-027). Dejarlo donde estaba habría obligado a que
 * `registro.mjs` importara `auth.mjs` y `auth.mjs` importara `registro.mjs`.
 */

/**
 * Los refresh tokens, en memoria.
 *
 * En la plataforma viven en `auth.refresh_tokens`. Acá no: reiniciar este proceso
 * invalida las sesiones abiertas, que para una suite de pruebas es lo correcto —una
 * sesión que sobrevive al reset de la base sería una sesión mintiendo—. Se rotan en
 * cada uso, como hace GoTrue.
 */
export const refreshTokens = new Map();

/** La forma del usuario que devuelve GoTrue, con lo que supabase-js mira. */
export function asGoTrueUser(row) {
  return {
    id: row.id,
    aud: "authenticated",
    role: "authenticated",
    email: row.email,
    email_confirmed_at: row.email_confirmed_at,
    confirmed_at: row.email_confirmed_at,
    last_sign_in_at: new Date().toISOString(),
    app_metadata: row.app_metadata,
    user_metadata: row.user_metadata,
    // Una cuenta sin confirmar no tiene identidad todavía, y la lista vacía es
    // justamente la señal que GoTrue usa para decir "esto ya existía" sin decirlo.
    identities:
      row.email_confirmed_at === null
        ? []
        : [{ id: row.id, user_id: row.id, provider: "email" }],
    created_at: row.created_at,
    updated_at: row.created_at,
    is_anonymous: false,
  };
}

export async function issueSession(row) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_SECONDS;

  const claims = await claimsFromHook(row.id, {
    iss: "supabase-local",
    sub: row.id,
    aud: "authenticated",
    // Éste es el claim que PostgREST lee para elegir con qué rol de Postgres
    // ejecuta la consulta. De él depende que las policies RLS se apliquen.
    role: "authenticated",
    email: row.email,
    app_metadata: row.app_metadata,
    user_metadata: row.user_metadata,
    session_id: randomUUID(),
    iat: issuedAt,
    exp: expiresAt,
  });

  const refreshToken = randomUUID().replaceAll("-", "");

  refreshTokens.set(refreshToken, row.id);

  return {
    access_token: signJwt(claims),
    token_type: "bearer",
    expires_in: SESSION_SECONDS,
    expires_at: expiresAt,
    refresh_token: refreshToken,
    user: asGoTrueUser(row),
  };
}
