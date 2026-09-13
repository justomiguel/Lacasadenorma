import { createHmac, timingSafeEqual } from "node:crypto";

import { JWT_SECRET } from "./config.mjs";

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

/** JWT HS256 a mano: no hace falta una dependencia para firmar dos objetos. */
export function signJwt(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

export const ANON_KEY = signJwt({
  role: "anon",
  iss: "supabase-local",
  iat: 1_757_376_000,
  exp: 2_072_995_200,
});

/**
 * Verifica firma y vencimiento de un token emitido acá.
 *
 * La comparación de la firma es con `timingSafeEqual`. En un script local no
 * cambia nada práctico, pero la alternativa es escribir `===` sobre un MAC, que es
 * exactamente el patrón que después alguien copia a un lugar donde sí importa.
 */
export function verifyAccessToken(token) {
  const partes = token.split(".");

  if (partes.length !== 3) {
    return null;
  }

  const [header, payload, signature] = partes;
  const esperada = createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const recibida = Buffer.from(signature, "utf8");
  const calculada = Buffer.from(esperada, "utf8");

  if (recibida.length !== calculada.length || !timingSafeEqual(recibida, calculada)) {
    return null;
  }

  let claims;

  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) {
    return null;
  }

  return claims;
}
