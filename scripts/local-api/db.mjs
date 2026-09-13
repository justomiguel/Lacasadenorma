import { spawn } from "node:child_process";

import { DB_URL } from "./config.mjs";

/**
 * Una consulta a la base local.
 *
 * Los valores van como variables de psql y se interpolan con `:'nombre'`, que es la
 * forma que **cita el valor como literal SQL** en lugar de pegarlo en el texto. No
 * es un detalle de estilo: la contraseña y el correo llegan de la red, y concatenar
 * los habría convertido en una inyección de SQL en la primera comilla. Se usa la
 * entrada estándar y no `--command` porque psql sólo interpola variables cuando el
 * SQL entra por ahí.
 *
 * Cada consulta devuelve **una fila y una columna**, siempre JSON: así el resultado
 * se lee con `JSON.parse` y no hay que separar campos por un delimitador.
 */
export function query(sqlText, variables = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      DB_URL,
      "--no-psqlrc",
      "--quiet",
      "--tuples-only",
      "--no-align",
      "--set",
      "ON_ERROR_STOP=1",
    ];

    for (const [name, value] of Object.entries(variables)) {
      args.push("--set", `${name}=${value}`);
    }

    const child = spawn("psql", args, { stdio: ["pipe", "pipe", "pipe"] });

    let salida = "";
    let error = "";

    child.stdout.on("data", (chunk) => {
      salida += chunk;
    });
    child.stderr.on("data", (chunk) => {
      error += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(error.trim() || `psql terminó con código ${String(code)}`));
        return;
      }

      try {
        resolve(JSON.parse(salida.trim() || "null"));
      } catch {
        reject(new Error(`La consulta no devolvió JSON: ${salida.trim()}`));
      }
    });

    child.stdin.end(sqlText);
  });
}

const SELECT_USER = `
  select coalesce((
    select json_build_object(
      'id', u.id,
      'email', u.email,
      'app_metadata', u.raw_app_meta_data,
      'user_metadata', u.raw_user_meta_data,
      'created_at', u.created_at
    )
    from auth.users u
    where %WHERE%
  ), 'null'::json);
`;

/**
 * Verifica la contraseña **en la base**, con bcrypt, contra la misma columna que usa
 * la plataforma. `crypt(clave, hash)` vuelve a hashear con el salt que el hash ya
 * trae adentro, así que comparar el resultado con el hash es la comparación correcta
 * y no hay ninguna forma de que una clave equivocada pase.
 */
export function findUserByPassword(email, password) {
  return query(
    SELECT_USER.replace(
      "%WHERE%",
      `u.email = lower(:'email')
       and u.encrypted_password is not null
       and u.encrypted_password = extensions.crypt(:'password', u.encrypted_password)`,
    ),
    { email, password },
  );
}

export function findUserById(id) {
  return query(SELECT_USER.replace("%WHERE%", "u.id = :'id'::uuid"), { id });
}

/**
 * Los claims los arma la función de la migración, no este archivo.
 *
 * `set local role supabase_auth_admin` es la parte que hace que esto valga: el hook
 * no es `security definer`, así que corre con los privilegios de quien lo llama, y
 * allá quien lo llama es siempre ese rol. Ejecutarlo como el superusuario local
 * habría dado el resultado correcto por el motivo equivocado —y de hecho fue así
 * como un `grant` que faltaba pasó desapercibido hasta la migración 20260910090000—.
 */
export async function claimsFromHook(userId, claims) {
  const resultado = await query(
    `
      begin;
      set local role supabase_auth_admin;
      select public.custom_access_token_hook(:'event'::jsonb) -> 'claims';
      commit;
    `,
    { event: JSON.stringify({ user_id: userId, claims }) },
  );

  if (resultado === null) {
    throw new Error("El hook del token no devolvió claims.");
  }

  return resultado;
}
