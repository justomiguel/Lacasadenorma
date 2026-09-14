import { randomUUID } from "node:crypto";

import { createConfirmedOauthUser, findUserById } from "./db.mjs";
import { authError, json, readBody } from "./http.mjs";
import { issueSession } from "./sesion.mjs";

/**
 * OAuth del harness (ADR-039).
 *
 * Emula las dos rutas de GoTrue que hacen falta para el salto a una red:
 * `GET /authorize` y `POST /token?grant_type=pkce`. Lo que **no** emula es a
 * Google: no hay un hop a accounts.google.com. El authorize crea una cuenta
 * ya confirmada y redirige al callback del sitio con un `code`, y el canje
 * emite la sesión. Si `email` viene en la query —sólo para el e2e de
 * unificación— reusa esa fila en lugar de inventar una. El hop real se
 * prueba a mano, una vez, y está en el runbook.
 *
 * El destino del 302 se valida: sólo `/cuenta/oauth` y `/en/cuenta/oauth`,
 * en 127.0.0.1 o localhost. Un authorize que respetara cualquier
 * `redirect_to` convertiría el harness en un redirect abierto.
 */

const DESTINOS = new Set(["/cuenta/oauth", "/en/cuenta/oauth"]);
const HOSTS = new Set(["127.0.0.1", "localhost"]);

const pending = new Map();

function destinoPermitido(redirectTo) {
  if (typeof redirectTo !== "string" || redirectTo.length === 0) {
    return false;
  }

  try {
    const url = new URL(redirectTo);

    return HOSTS.has(url.hostname) && DESTINOS.has(url.pathname);
  } catch {
    return DESTINOS.has(redirectTo.split("?")[0] ?? "");
  }
}

function irA(outgoing, location) {
  outgoing.writeHead(302, {
    location,
    "cache-control": "no-store",
  });
  outgoing.end();
}

async function authorize(outgoing, parametros) {
  const provider = (parametros.get("provider") ?? "").trim().toLowerCase();
  const redirectTo = parametros.get("redirect_to") ?? "";

  if (provider.length === 0 || !destinoPermitido(redirectTo)) {
    authError(outgoing, 400, "validation_failed", "Missing provider or redirect_to");
    return;
  }

  const emailParam = parametros.get("email")?.trim() ?? "";
  const email =
    emailParam.length > 0 && emailParam.includes("@")
      ? emailParam
      : `oauth.${provider}.${randomUUID()}@local.test`;
  const row = await createConfirmedOauthUser(email, provider);

  if (row === null) {
    authError(outgoing, 500, "unexpected_failure", "No se pudo crear la cuenta social");
    return;
  }

  const code = randomUUID().replaceAll("-", "");

  // El verifier lo comprueba GoTrue. Acá el code es un UUID de un solo uso:
  // verificar el challenge duplicaría un detalle de encoding que no es lo que
  // estas pruebas afirman.
  pending.set(code, row.id);

  const destino = new URL(redirectTo, "http://127.0.0.1");
  destino.searchParams.set("code", code);
  irA(outgoing, destino.toString());
}

async function exchange(incoming, outgoing) {
  const body = await readBody(incoming);
  const code = typeof body.auth_code === "string" ? body.auth_code : "";
  const userId = pending.get(code);

  if (typeof userId !== "string") {
    authError(outgoing, 400, "flow_state_not_found", "Invalid PKCE code");
    return;
  }

  pending.delete(code);

  const row = await findUserById(userId);

  if (row === null) {
    authError(outgoing, 400, "user_not_found", "User from PKCE code does not exist");
    return;
  }

  json(outgoing, 200, await issueSession(row));
}

/** Devuelve `true` si la ruta era de OAuth y ya se contestó. */
export async function handleOauth(incoming, outgoing, ruta, parametros) {
  if (ruta === "/authorize" && incoming.method === "GET") {
    await authorize(outgoing, parametros);
    return true;
  }

  return false;
}

export async function exchangeOauthCode(incoming, outgoing) {
  await exchange(incoming, outgoing);
}
