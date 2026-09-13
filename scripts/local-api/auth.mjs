import { randomUUID } from "node:crypto";

import { SESSION_SECONDS } from "./config.mjs";
import { claimsFromHook, findUserById, findUserByPassword } from "./db.mjs";
import { authError, json, readBearer, readBody } from "./http.mjs";
import { signJwt, verifyAccessToken } from "./jwt.mjs";

/**
 * Los refresh tokens, en memoria.
 *
 * En la plataforma viven en `auth.refresh_tokens`. Acá no: reiniciar este proceso
 * invalida las sesiones abiertas, que para una suite de pruebas es lo correcto —una
 * sesión que sobrevive al reset de la base sería una sesión mintiendo—. Se rotan en
 * cada uso, como hace GoTrue.
 */
const refreshTokens = new Map();

/** La forma del usuario que devuelve GoTrue, con lo que supabase-js mira. */
function asGoTrueUser(row) {
  return {
    id: row.id,
    aud: "authenticated",
    role: "authenticated",
    email: row.email,
    email_confirmed_at: row.created_at,
    confirmed_at: row.created_at,
    last_sign_in_at: new Date().toISOString(),
    app_metadata: row.app_metadata,
    user_metadata: row.user_metadata,
    identities: [],
    created_at: row.created_at,
    updated_at: row.created_at,
    is_anonymous: false,
  };
}

async function issueSession(row) {
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

export async function handleAuth(incoming, outgoing, url) {
  const [ruta, consulta] = url.slice("/auth/v1".length).split("?");
  const parametros = new URLSearchParams(consulta ?? "");

  if (ruta === "/token" && incoming.method === "POST") {
    const grant = parametros.get("grant_type");

    if (grant === "password") {
      const body = await readBody(incoming);

      if (typeof body.email !== "string" || typeof body.password !== "string") {
        authError(outgoing, 400, "validation_failed", "Missing email or password");
        return;
      }

      const row = await findUserByPassword(body.email, body.password);

      if (row === null) {
        // El mismo mensaje para "ese correo no existe" y para "la clave está mal",
        // igual que GoTrue: distinguirlos convierte la pantalla de acceso en un
        // verificador de correos registrados (amenaza S1).
        authError(outgoing, 400, "invalid_credentials", "Invalid login credentials");
        return;
      }

      json(outgoing, 200, await issueSession(row));
      return;
    }

    if (grant === "refresh_token") {
      const body = await readBody(incoming);
      const userId = refreshTokens.get(body.refresh_token);

      if (typeof userId !== "string") {
        authError(
          outgoing,
          400,
          "refresh_token_not_found",
          "Invalid Refresh Token: Refresh Token Not Found",
        );
        return;
      }

      // Rotación: el token usado no sirve una segunda vez.
      refreshTokens.delete(body.refresh_token);

      const row = await findUserById(userId);

      if (row === null) {
        authError(
          outgoing,
          400,
          "refresh_token_not_found",
          "Invalid Refresh Token: User Not Found",
        );
        return;
      }

      json(outgoing, 200, await issueSession(row));
      return;
    }

    authError(
      outgoing,
      400,
      "unsupported_grant_type",
      `La API local sólo emite tokens por contraseña y por refresh. Pediste: ${grant ?? "nada"}.`,
    );
    return;
  }

  /**
   * La ruta de la que depende toda la verificación.
   *
   * `getClaims()` de supabase-js, con un token HS256, no puede validar la firma en el
   * cliente —no hay JWKS— y delega en esto: si contesta 200, da los claims del token
   * por confiables. Así que acá se verifica la firma de verdad, y además se relee el
   * usuario de la base, para que un usuario borrado no siga entrando con un token que
   * todavía no venció.
   */
  if (ruta === "/user" && incoming.method === "GET") {
    const token = readBearer(incoming);
    const claims = token === null ? null : verifyAccessToken(token);

    if (claims === null || typeof claims.sub !== "string") {
      authError(
        outgoing,
        401,
        "bad_jwt",
        "invalid JWT: unable to parse or verify signature",
      );
      return;
    }

    const row = await findUserById(claims.sub);

    if (row === null) {
      authError(
        outgoing,
        403,
        "user_not_found",
        "User from sub claim in JWT does not exist",
      );
      return;
    }

    json(outgoing, 200, asGoTrueUser(row));
    return;
  }

  if (ruta === "/logout" && incoming.method === "POST") {
    const token = readBearer(incoming);
    const claims = token === null ? null : verifyAccessToken(token);

    // Salir no falla nunca: un token vencido ya no sirve, y contestar un error haría
    // que la interfaz dejara la cookie puesta. Se descartan los refresh de la persona
    // cuando el token todavía es legible.
    if (claims !== null && typeof claims.sub === "string") {
      for (const [refresh, userId] of refreshTokens) {
        if (userId === claims.sub) {
          refreshTokens.delete(refresh);
        }
      }
    }

    outgoing.writeHead(204, { "cache-control": "no-store" });
    outgoing.end();
    return;
  }

  json(outgoing, 501, {
    message: `La API local no implementa ${incoming.method ?? "?"} /auth/v1${ruta}. Sólo entrar, leer el usuario, renovar y salir (scripts/local-api.mjs).`,
  });
}
