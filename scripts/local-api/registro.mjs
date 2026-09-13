import { randomUUID } from "node:crypto";

import {
  consumeLinkToken,
  createUnconfirmedUser,
  findUserByEmail,
  findUserById,
  findUserByLinkToken,
  setRecoveryToken,
  updatePassword,
} from "./db.mjs";
import { authError, json, readBearer, readBody } from "./http.mjs";
import { verifyAccessToken } from "./jwt.mjs";
import { asGoTrueUser, issueSession } from "./sesion.mjs";

/**
 * El registro abierto, del lado del harness (ADR-027).
 *
 * Emula las cuatro rutas de GoTrue que hacen falta para que una persona se cree una
 * cuenta y la recupere: `/signup`, `/verify`, `/recover` y `PUT /user`. Lo que
 * **no** emula es el correo, y ésa es la única sustitución: el token que GoTrue
 * mandaría por mail queda en `auth.users`, y el buzón del harness lo lee de ahí.
 *
 * Las tres decisiones que la aplicación dice que toma —registrarse no crea sesión,
 * una dirección ya registrada contesta igual que una nueva, y recuperar contesta lo
 * mismo exista o no la cuenta— están **implementadas acá igual que en la
 * plataforma**. Si el harness las simplificara, la prueba pasaría en verde contra un
 * servidor más hablador que el de producción y no verificaría nada.
 */

/** Ocho caracteres, el mínimo de GoTrue. */
const MIN_PASSWORD_LENGTH = 8;

function nuevoToken() {
  return randomUUID().replaceAll("-", "");
}

/**
 * La cuenta que se devuelve cuando la dirección ya estaba registrada.
 *
 * GoTrue contesta un usuario con `identities: []` y sin sesión, con un identificador
 * que no es el de nadie. La pantalla no puede distinguirlo de un alta real, que es
 * exactamente el punto: el formulario público no sirve para averiguar si una
 * dirección tiene cuenta en este sitio.
 */
function cuentaObfuscada(email) {
  const ahora = new Date().toISOString();

  return {
    id: randomUUID(),
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: null,
    confirmed_at: null,
    last_sign_in_at: ahora,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: ahora,
    updated_at: ahora,
    is_anonymous: false,
  };
}

async function signup(incoming, outgoing) {
  const body = await readBody(incoming);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (email.length === 0 || !email.includes("@")) {
    authError(outgoing, 400, "validation_failed", "Unable to validate email address");
    return;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    authError(outgoing, 422, "weak_password", "Password should be at least 8 characters");
    return;
  }

  const existente = await findUserByEmail(email);

  if (existente !== null) {
    json(outgoing, 200, cuentaObfuscada(email));
    return;
  }

  const row = await createUnconfirmedUser(email, password, nuevoToken());

  if (row === null) {
    authError(outgoing, 500, "unexpected_failure", "No se pudo crear la cuenta");
    return;
  }

  // Sin `session` en la respuesta: con la confirmación activada, registrarse no
  // inicia sesión. `_sessionResponse` de supabase-js lee el usuario del cuerpo
  // cuando no encuentra un `access_token`, así que la forma correcta es el usuario
  // pelado y no `{ user: … }`.
  json(outgoing, 200, asGoTrueUser(row));
}

const COLUMNA_POR_TIPO = {
  signup: "confirmation_token",
  email: "confirmation_token",
  invite: "confirmation_token",
  recovery: "recovery_token",
};

async function verify(incoming, outgoing) {
  const body = await readBody(incoming);
  const token = typeof body.token_hash === "string" ? body.token_hash : "";
  const columna = COLUMNA_POR_TIPO[body.type];

  if (columna === undefined || token.length === 0) {
    authError(outgoing, 403, "otp_expired", "Email link is invalid or has expired");
    return;
  }

  const row = await findUserByLinkToken(token, columna);

  if (row === null) {
    authError(outgoing, 403, "otp_expired", "Email link is invalid or has expired");
    return;
  }

  const confirmado = await consumeLinkToken(row.id, columna);

  if (confirmado === null) {
    authError(outgoing, 500, "unexpected_failure", "No se pudo canjear el enlace");
    return;
  }

  json(outgoing, 200, await issueSession(confirmado));
}

async function recover(incoming, outgoing) {
  const body = await readBody(incoming);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const row = email.length === 0 ? null : await findUserByEmail(email);

  if (row !== null) {
    await setRecoveryToken(email, nuevoToken());
  }

  // 200 con cuerpo vacío exista o no la cuenta. Es lo que hace GoTrue y es de lo que
  // depende que la pantalla de recuperación no sea un verificador de direcciones.
  json(outgoing, 200, {});
}

async function updateOwnUser(incoming, outgoing) {
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

  const body = await readBody(incoming);

  if (typeof body.password === "string") {
    if (body.password.length < MIN_PASSWORD_LENGTH) {
      authError(
        outgoing,
        422,
        "weak_password",
        "Password should be at least 8 characters",
      );
      return;
    }

    await updatePassword(claims.sub, body.password);
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
}

/** Devuelve `true` si la ruta era de registro y ya se contestó. */
export async function handleRegistro(incoming, outgoing, ruta) {
  if (ruta === "/signup" && incoming.method === "POST") {
    await signup(incoming, outgoing);
    return true;
  }

  if (ruta === "/verify" && incoming.method === "POST") {
    await verify(incoming, outgoing);
    return true;
  }

  if (ruta === "/recover" && incoming.method === "POST") {
    await recover(incoming, outgoing);
    return true;
  }

  if (ruta === "/user" && incoming.method === "PUT") {
    await updateOwnUser(incoming, outgoing);
    return true;
  }

  return false;
}
