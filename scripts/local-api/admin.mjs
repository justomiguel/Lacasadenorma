import { randomUUID } from "node:crypto";

import { findUserByEmail, query, setRecoveryToken } from "./db.mjs";
import { authError, json, readBearer, readBody } from "./http.mjs";
import { SERVICE_ROLE_KEY, verifyAccessToken } from "./jwt.mjs";
import { asGoTrueUser } from "./sesion.mjs";

/**
 * Auth Admin del harness: `createUser`, `listUsers` y `generateLink`.
 *
 * Lo que acá es real: la fila va a `auth.users` con bcrypt y, si se pide
 * `email_confirm`, el correo ya confirmado. El invite de GoTrue no convive
 * con un correo confirmado: `generateLink({ type: "invite" })` responde
 * 422 `email_exists`. Entonces «Volver a generar» pide `type: "recovery"`,
 * que ya existía en `/recover` y escribe el mismo `recovery_token`. El
 * token de invite vive en `confirmation_token`. Lo sustituido es la
 * superficie HTTP.
 */

/** GoTrue: invite sobre un correo ya confirmado es 422 `email_exists`. */
export function generateInviteRejected(row) {
  if (row === null) {
    return { status: 404, error_code: "user_not_found", msg: "User not found" };
  }

  if (row.email_confirmed_at != null) {
    return {
      status: 422,
      error_code: "email_exists",
      msg: "A user with this email address has already been registered",
    };
  }

  return null;
}

/** Recovery sí convive con un correo confirmado: es el camino de reingreso. */
export function generateRecoveryRejected(row) {
  if (row === null) {
    return { status: 404, error_code: "user_not_found", msg: "User not found" };
  }

  return null;
}

function esClaveDeServicio(incoming) {
  const token = readBearer(incoming);

  if (token === SERVICE_ROLE_KEY) {
    return true;
  }

  const claims = token === null ? null : verifyAccessToken(token);

  return claims !== null && claims.role === "service_role";
}

function entero(valor, respaldo, minimo, maximo) {
  const n = Number.parseInt(typeof valor === "string" ? valor : "", 10);

  if (!Number.isFinite(n)) {
    return respaldo;
  }

  return Math.min(maximo, Math.max(minimo, n));
}

async function insertAuthUser(email, password, confirmed) {
  if (confirmed) {
    await query(
      `
        insert into auth.users
          (email, encrypted_password, raw_app_meta_data, email_confirmed_at)
        values (
          lower(:'email'),
          extensions.crypt(:'password', extensions.gen_salt('bf')),
          '{"provider": "email", "providers": ["email"]}'::jsonb,
          now()
        );
        select 'null'::json;
      `,
      { email, password },
    );
  } else {
    await query(
      `
        insert into auth.users
          (email, encrypted_password, raw_app_meta_data)
        values (
          lower(:'email'),
          extensions.crypt(:'password', extensions.gen_salt('bf')),
          '{"provider": "email", "providers": ["email"]}'::jsonb
        );
        select 'null'::json;
      `,
      { email, password },
    );
  }

  return findUserByEmail(email);
}

async function listUsers(offset, limit) {
  return query(
    `
      select coalesce((
        select json_agg(json_build_object(
          'id', u.id,
          'email', u.email,
          'app_metadata', u.raw_app_meta_data,
          'user_metadata', u.raw_user_meta_data,
          'email_confirmed_at', u.email_confirmed_at,
          'created_at', u.created_at
        ) order by u.created_at)
        from (
          select id, email, raw_app_meta_data, raw_user_meta_data,
                 email_confirmed_at, created_at
            from auth.users
           order by created_at
           offset (:'offset')::int
           limit (:'limit')::int
        ) u
      ), '[]'::json);
    `,
    { offset: String(offset), limit: String(limit) },
  );
}

async function setInviteToken(email, token) {
  await query(
    `
      update auth.users
         set confirmation_token = :'token',
             confirmation_sent_at = now()
       where email = lower(:'email');
      select 'null'::json;
    `,
    { email, token },
  );
}

async function createUser(incoming, outgoing) {
  const body = await readBody(incoming);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password =
    typeof body.password === "string" && body.password.length > 0
      ? body.password
      : randomUUID();

  if (email.length === 0 || !email.includes("@")) {
    authError(outgoing, 400, "validation_failed", "Unable to validate email address");
    return;
  }

  if ((await findUserByEmail(email)) !== null) {
    authError(
      outgoing,
      422,
      "email_exists",
      "A user with this email address has already been registered",
    );
    return;
  }

  const row = await insertAuthUser(email, password, body.email_confirm === true);

  if (row === null) {
    authError(outgoing, 500, "unexpected_failure", "No se pudo crear la cuenta");
    return;
  }

  json(outgoing, 200, asGoTrueUser(row));
}

async function listUsersRoute(outgoing, parametros) {
  const page = entero(parametros.get("page"), 1, 1, 10_000);
  const perPage = entero(parametros.get("per_page"), 50, 1, 1_000);
  const users = await listUsers((page - 1) * perPage, perPage);

  json(outgoing, 200, { users: Array.isArray(users) ? users : [] });
}

async function generateLink(incoming, outgoing) {
  const body = await readBody(incoming);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const type = typeof body.type === "string" ? body.type : "";
  const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo : "";

  if (email.length === 0 || (type !== "invite" && type !== "recovery")) {
    authError(
      outgoing,
      400,
      "validation_failed",
      "generateLink only emulates invite and recovery",
    );
    return;
  }

  const row = await findUserByEmail(email);
  const rejected =
    type === "invite" ? generateInviteRejected(row) : generateRecoveryRejected(row);

  if (rejected !== null) {
    authError(outgoing, rejected.status, rejected.error_code, rejected.msg);
    return;
  }

  const token = randomUUID().replaceAll("-", "");

  if (type === "invite") {
    await setInviteToken(email, token);
  } else {
    await setRecoveryToken(email, token);
  }

  json(outgoing, 200, {
    ...asGoTrueUser(row),
    action_link: redirectTo,
    email_otp: token,
    hashed_token: token,
    redirect_to: redirectTo,
    verification_type: type,
  });
}

/** Devuelve `true` si la ruta era de Admin y ya se contestó. */
export async function handleAdmin(incoming, outgoing, ruta, parametros) {
  if (!ruta.startsWith("/admin/")) {
    return false;
  }

  if (!esClaveDeServicio(incoming)) {
    authError(outgoing, 403, "not_admin", "This endpoint requires the service role key");
    return true;
  }

  if (ruta === "/admin/users" && incoming.method === "POST") {
    await createUser(incoming, outgoing);
    return true;
  }

  if (ruta === "/admin/users" && incoming.method === "GET") {
    await listUsersRoute(outgoing, parametros);
    return true;
  }

  if (ruta === "/admin/generate_link" && incoming.method === "POST") {
    await generateLink(incoming, outgoing);
    return true;
  }

  return false;
}
