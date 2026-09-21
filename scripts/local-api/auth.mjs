import { handleAdmin } from "./admin.mjs";
import { findUserById, findUserByPassword } from "./db.mjs";
import { authError, json, readBearer, readBody } from "./http.mjs";
import { verifyAccessToken } from "./jwt.mjs";
import { handleOauth, exchangeOauthCode } from "./oauth.mjs";
import { handleRegistro } from "./registro.mjs";
import { asGoTrueUser, issueSession, refreshTokens } from "./sesion.mjs";

export async function handleAuth(incoming, outgoing, url) {
  const [ruta, consulta] = url.slice("/auth/v1".length).split("?");
  const parametros = new URLSearchParams(consulta ?? "");

  // Auth Admin: crear una cuenta sin confirmar y emitir el invite. Lo usa
  // `/admin/donantes` para cargar a quien donó por fuera.
  if (await handleAdmin(incoming, outgoing, ruta, parametros)) {
    return;
  }

  // Crear la cuenta, canjear el enlace del correo, pedir la recuperación y cambiar
  // la contraseña. Viven aparte porque llegaron con el registro abierto y porque
  // las cuatro tienen una decisión de seguridad adentro que conviene leer junta.
  if (await handleRegistro(incoming, outgoing, ruta)) {
    return;
  }

  if (await handleOauth(incoming, outgoing, ruta, parametros)) {
    return;
  }

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

      // Con `enable_confirmations = true`, una cuenta sin confirmar no entra. Es la
      // implicación entera de esa opción: si esto emitiera un token, tener sesión
      // dejaría de significar correo confirmado y las pantallas tendrían que
      // verificarlo cada una por su cuenta (contrato de cuentas, amenaza S3).
      if (row.email_confirmed_at === null) {
        authError(outgoing, 400, "email_not_confirmed", "Email not confirmed");
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

    if (grant === "pkce") {
      await exchangeOauthCode(incoming, outgoing);
      return;
    }

    authError(
      outgoing,
      400,
      "unsupported_grant_type",
      `La API local sólo emite tokens por contraseña, por refresh y por PKCE. Pediste: ${grant ?? "nada"}.`,
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
    message: `La API local no implementa ${incoming.method ?? "?"} /auth/v1${ruta}. Está emulado lo que usan las pantallas de cuenta y de backoffice (scripts/local-api.mjs).`,
  });
}
