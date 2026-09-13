import { findPendingLink } from "./db.mjs";
import { json } from "./http.mjs";

/**
 * El buzón: la única pieza del harness que no emula a Supabase sino al correo.
 *
 * Una prueba de registro tiene que abrir el enlace que llega por mail, y acá no hay
 * servidor de correo. GoTrue guarda el token de ese enlace en `auth.users`
 * —`confirmation_token` y `recovery_token`—, así que esto lo lee de ahí y lo
 * devuelve. Es el mismo token que viajaría en el mail, canjeado por la misma ruta
 * `/verify`: lo sustituido es el transporte, no el mecanismo.
 *
 * Vive fuera de `/auth/v1` y con otro prefijo **a propósito**. Si estuviera colgado
 * de la API de autenticación se leería como parte de ella, y algún día alguien
 * podría pensar que la plataforma tiene algo parecido. No lo tiene, y no debería:
 * un endpoint que entrega tokens de correo por dirección es, en producción, una
 * toma de cuentas ajenas en un GET.
 */
export async function handleBuzon(incoming, outgoing, url) {
  const [ruta, consulta] = url.slice("/harness/v1".length).split("?");
  const email = new URLSearchParams(consulta ?? "").get("email");

  if (ruta !== "/buzon" || incoming.method !== "GET" || email === null) {
    json(outgoing, 404, {
      message: "El buzón del harness sólo contesta GET /harness/v1/buzon?email=…",
    });
    return;
  }

  const fila = await findPendingLink(email);

  if (fila === null) {
    json(outgoing, 404, { message: `No hay ninguna cuenta con la dirección ${email}.` });
    return;
  }

  // El tipo va junto con el token porque `verifyOtp` lo pide, y decidirlo acá evita
  // que cada prueba tenga que acordarse de cuál corresponde a qué pantalla.
  if (typeof fila.recovery_token === "string") {
    json(outgoing, 200, { type: "recovery", token_hash: fila.recovery_token });
    return;
  }

  if (typeof fila.confirmation_token === "string") {
    json(outgoing, 200, { type: "signup", token_hash: fila.confirmation_token });
    return;
  }

  json(outgoing, 404, {
    message: `La cuenta ${email} no tiene ningún enlace pendiente: ya se canjeó o nunca se pidió.`,
  });
}
