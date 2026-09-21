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
      'email_confirmed_at', u.email_confirmed_at,
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

export function findUserByEmail(email) {
  return query(SELECT_USER.replace("%WHERE%", "u.email = lower(:'email')"), { email });
}

/**
 * El enlace del correo, guardado donde lo guarda la plataforma.
 *
 * `confirmation_token` y `recovery_token` son columnas de `auth.users` en GoTrue, y
 * el harness las usa como buzón: no hay servidor de correo acá, así que el enlace se
 * lee de la base en lugar de leerse de una bandeja de entrada.
 */
const COLUMNAS_DE_TOKEN = new Set(["confirmation_token", "recovery_token"]);

/**
 * El nombre de la columna es lo único que se pega en el SQL en lugar de pasarse como
 * variable, porque psql no interpola identificadores. Por eso se valida contra una
 * lista cerrada: el resto de este archivo está escrito para que nada que venga de la
 * red llegue al texto de una consulta, y una excepción sin guardia lo desharía.
 */
function columnaDeToken(columna) {
  if (!COLUMNAS_DE_TOKEN.has(columna)) {
    throw new Error(`Columna de token desconocida: ${columna}`);
  }

  return columna;
}

export function findUserByLinkToken(token, columna) {
  const nombre = columnaDeToken(columna);

  return query(
    SELECT_USER.replace("%WHERE%", `u.${nombre} is not null and u.${nombre} = :'token'`),
    { token },
  );
}

/** Crea la cuenta **sin confirmar**: la confirmación llega al canjear el enlace. */
export async function createUnconfirmedUser(email, password, token) {
  await query(
    `
      insert into auth.users
        (email, encrypted_password, raw_app_meta_data, confirmation_token, confirmation_sent_at)
      values (
        lower(:'email'),
        extensions.crypt(:'password', extensions.gen_salt('bf')),
        -- Lo que escribe GoTrue en un alta por correo. No es decorativo acá: la
        -- respuesta de un alta nueva y la de una dirección ya registrada tienen que
        -- ser idénticas, y cualquier campo que sólo aparezca en una de las dos
        -- convierte el formulario en el verificador de direcciones que no debe ser.
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        :'token',
        now()
      );
      select 'null'::json;
    `,
    { email, password, token },
  );

  return findUserByEmail(email);
}

function metadatosDeLaRed() {
  return `
    jsonb_strip_nulls(jsonb_build_object(
      'full_name', :'full_name',
      'name', :'full_name',
      'picture', nullif(:'picture', ''),
      'avatar_url', nullif(:'picture', '')
    ))
  `;
}

/**
 * Una cuenta que nació por OAuth: correo ya confirmado, sin contraseña.
 *
 * `email` nulo es el caso Apple-sin-correo: la fila existe para que el canje
 * emita sesión y `/cuenta/oauth` la cierre. `profile.fullName` y `picture`
 * son lo que la red habría mandado; el e2e los fija.
 */
export async function createConfirmedOauthUser(email, provider, profile = {}) {
  if (!/^[a-z][a-z0-9_]*$/.test(provider)) {
    throw new Error(`Proveedor OAuth inesperado: ${provider}`);
  }

  const full_name =
    typeof profile.fullName === "string" && profile.fullName.length > 0
      ? profile.fullName
      : `Quien entra con ${provider}`;
  const picture = typeof profile.picture === "string" ? profile.picture : "";
  const variables = { provider, full_name, picture };

  if (email === null) {
    return query(
      `
        insert into auth.users
          (email, raw_app_meta_data, raw_user_meta_data, email_confirmed_at)
        values (
          null,
          json_build_object(
            'provider', :'provider',
            'providers', jsonb_build_array(:'provider')
          ),
          ${metadatosDeLaRed()},
          now()
        )
        returning json_build_object(
          'id', id,
          'email', email,
          'app_metadata', raw_app_meta_data,
          'user_metadata', raw_user_meta_data,
          'email_confirmed_at', email_confirmed_at,
          'created_at', created_at
        );
      `,
      variables,
    );
  }

  const existing = await findUserByEmail(email);

  if (existing !== null) {
    await query(
      `
        update auth.users
        set
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_app_meta_data = jsonb_build_object(
            'provider', :'provider',
            'providers', (
              select coalesce(jsonb_agg(distinct p), jsonb_build_array(:'provider'))
              from jsonb_array_elements_text(
                coalesce(raw_app_meta_data->'providers', '[]'::jsonb)
                || jsonb_build_array(:'provider')
              ) as t(p)
            )
          ),
          raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
            || ${metadatosDeLaRed()}
        where email = lower(:'email');
        select 'null'::json;
      `,
      { ...variables, email },
    );

    return findUserByEmail(email);
  }

  await query(
    `
      insert into auth.users
        (email, raw_app_meta_data, raw_user_meta_data, email_confirmed_at)
      values (
        lower(:'email'),
        json_build_object(
          'provider', :'provider',
          'providers', jsonb_build_array(:'provider')
        ),
        ${metadatosDeLaRed()},
        now()
      );
      select 'null'::json;
    `,
    { ...variables, email },
  );

  return findUserByEmail(email);
}

export async function setRecoveryToken(email, token) {
  await query(
    `
      update auth.users
      set recovery_token = :'token', recovery_sent_at = now()
      where email = lower(:'email');
      select 'null'::json;
    `,
    { email, token },
  );
}

/**
 * Canjear el enlace: confirma el correo si hacía falta y **quema el token**.
 *
 * Que el token se borre no es prolijidad: un enlace de recuperación que sirve dos
 * veces es un enlace que sigue sirviendo después de que la persona ya cambió su
 * contraseña, y eso es justamente lo que la pantalla promete que no pasa.
 */
export async function consumeLinkToken(id, columna) {
  await query(
    `
      update auth.users
      set ${columnaDeToken(columna)} = null,
          email_confirmed_at = coalesce(email_confirmed_at, now())
      where id = :'id'::uuid;
      select 'null'::json;
    `,
    { id },
  );

  return findUserById(id);
}

/** Los tokens pendientes de una dirección: lo que el buzón del harness entrega. */
export function findPendingLink(email) {
  return query(
    `
      select coalesce((
        select json_build_object(
          'confirmation_token', u.confirmation_token,
          'recovery_token', u.recovery_token
        )
        from auth.users u
        where u.email = lower(:'email')
      ), 'null'::json);
    `,
    { email },
  );
}

export async function updatePassword(id, password) {
  await query(
    `
      update auth.users
      set encrypted_password = extensions.crypt(:'password', extensions.gen_salt('bf'))
      where id = :'id'::uuid;
      select 'null'::json;
    `,
    { id, password },
  );
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
