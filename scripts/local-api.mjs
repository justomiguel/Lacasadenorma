#!/usr/bin/env node
/**
 * API local compatible con Supabase, sin Docker (amplía el ADR-013).
 *
 * ## Por qué existe
 *
 * `scripts/db-local.sh` da una base de datos real con las migraciones y las
 * policies aplicadas, y eso alcanza para pgTAP. Lo que no da es **PostgREST**, y
 * sin PostgREST el código que de verdad se despliega —los repositorios de
 * `src/infrastructure/supabase/`— no se ejecuta nunca fuera de producción. Sus
 * mapeadores, sus `select` con columnas nombradas y su manejo de errores quedarían
 * sin verificar hasta el primer despliegue, que es el peor momento para
 * descubrir que una columna no existe.
 *
 * Esto levanta PostgREST contra la base local y lo publica en la forma que espera
 * `@supabase/supabase-js`: el prefijo `/rest/v1`. Con eso, `npm run dev`, las
 * pruebas E2E y la revisión visual usan exactamente el mismo camino de datos que
 * producción.
 *
 * ## La parte de autenticación, y dónde está el límite
 *
 * `/auth/v1` implementa las cuatro rutas que usa el backoffice: entrar, leer el
 * usuario del token, renovar y salir. Existe por el flujo crítico 9 —publicar una
 * novedad—, que sin una sesión no se puede recorrer, y que antes era un
 * procedimiento manual del runbook.
 *
 * El límite importa más que la lista de rutas, porque una prueba que verifica el
 * doble en lugar del original no verifica nada. Lo que acá es **real**:
 *
 * - La contraseña se compara con bcrypt contra `auth.users.encrypted_password`,
 *   con `extensions.crypt()`, igual que la guarda la plataforma.
 * - Los claims del token los arma `public.custom_access_token_hook`, la función de
 *   la migración, invocada **con el rol `supabase_auth_admin`**: los mismos
 *   privilegios que tiene el servidor de auth allá. Esto ya encontró un `grant`
 *   que faltaba (migración 20260910090000).
 * - El token se firma con el secreto que PostgREST valida, así que las policies
 *   RLS deciden cada lectura y cada escritura de la sesión.
 * - `GET /user` **verifica la firma HMAC y el vencimiento** antes de contestar. No
 *   es un detalle: `getClaims()` de supabase-js, cuando el token es HS256, delega
 *   la verificación justamente en esta ruta. Si contestara 200 sin mirar la firma,
 *   un token fabricado pasaría y la propiedad que se quiere probar sería falsa.
 *
 * Lo que acá es un **sustituto**: la superficie HTTP de GoTrue y la administración
 * de la sesión (emitir, rotar y vencer refresh tokens, que viven en memoria de este
 * proceso en lugar de en `auth.refresh_tokens`). Es transporte; no es donde se
 * decide una autorización.
 *
 * Lo que sigue sin existir: registro, recuperación de contraseña, OAuth, MFA,
 * Storage y Realtime. Cualquier otra ruta de `/auth/v1` responde 501 con un mensaje
 * explícito en lugar de fallar raro.
 *
 * ## Sobre las credenciales de este archivo
 *
 * La clave anónima que imprime es un JWT firmado con un secreto de desarrollo que
 * está escrito acá. **No es un secreto**: sólo sirve contra esta base, que se
 * borra entera en cada reset.
 *
 * Uso: node scripts/local-api.mjs
 *      node scripts/local-api.mjs --print-anon-key   (sólo imprime la clave)
 */

import { execFile, spawn } from "node:child_process";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const POSTGREST_VERSION = "v16.2";
const BIN_DIR = ".local/bin";
const BIN_PATH = join(BIN_DIR, "postgrest");

/**
 * El mismo secreto de desarrollo que documenta Supabase para su entorno local.
 * Está en claro a propósito: si estuviera en una variable, alguien lo trataría
 * como un secreto y lo copiaría a producción.
 */
const JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long";

const DB_URL =
  process.env.LOCAL_DATABASE_URL ??
  "postgresql://norma_local:norma_local@127.0.0.1:5432/norma_dev";

const POSTGREST_PORT = Number(process.env.POSTGREST_PORT ?? 54331);
const API_PORT = Number(process.env.LOCAL_API_PORT ?? 54321);

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

/** JWT HS256 a mano: no hace falta una dependencia para firmar dos objetos. */
function signJwt(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

const ANON_KEY = signJwt({
  role: "anon",
  iss: "supabase-local",
  iat: 1_757_376_000,
  exp: 2_072_995_200,
});

/**
 * `scripts/e2e.sh` necesita la misma clave para construir el sitio, y copiarla allá
 * dejaría dos definiciones de una credencial que se desincronizan.
 */
if (process.argv.includes("--print-anon-key")) {
  process.stdout.write(`${ANON_KEY}\n`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Autenticación
// ─────────────────────────────────────────────────────────────────────────────

/** Lo mismo que usa GoTrue por defecto. Una hora alcanza para cualquier suite. */
const SESSION_SECONDS = 3600;

/**
 * Los refresh tokens, en memoria.
 *
 * En la plataforma viven en `auth.refresh_tokens`. Acá no: reiniciar este proceso
 * invalida las sesiones abiertas, que para una suite de pruebas es lo correcto —una
 * sesión que sobrevive al reset de la base sería una sesión mintiendo—. Se rotan en
 * cada uso, como hace GoTrue.
 */
const refreshTokens = new Map();

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
function query(sqlText, variables = {}) {
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
function findUserByPassword(email, password) {
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

function findUserById(id) {
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
async function claimsFromHook(userId, claims) {
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

/**
 * Verifica firma y vencimiento de un token emitido acá.
 *
 * La comparación de la firma es con `timingSafeEqual`. En un script local no
 * cambia nada práctico, pero la alternativa es escribir `===` sobre un MAC, que es
 * exactamente el patrón que después alguien copia a un lugar donde sí importa.
 */
function verifyAccessToken(token) {
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

function readBearer(incoming) {
  const header = incoming.headers["authorization"];

  if (typeof header !== "string" || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return header.slice("bearer ".length).trim();
}

function readBody(incoming) {
  return new Promise((resolve, reject) => {
    let crudo = "";

    incoming.on("data", (chunk) => {
      crudo += chunk;
    });
    incoming.on("end", () => {
      if (crudo.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(crudo));
      } catch {
        resolve({});
      }
    });
    incoming.on("error", reject);
  });
}

function json(outgoing, status, body) {
  outgoing.writeHead(status, {
    "content-type": "application/json",
    // Una respuesta con un token adentro no se cachea en ninguna parte.
    "cache-control": "no-store",
  });
  outgoing.end(JSON.stringify(body));
}

/** Los mismos códigos que devuelve GoTrue: la aplicación los registra y los mira. */
function authError(outgoing, status, code, message) {
  json(outgoing, status, { code: status, error_code: code, msg: message });
}

async function handleAuth(incoming, outgoing, url) {
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
      authError(outgoing, 403, "user_not_found", "User from sub claim in JWT does not exist");
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

async function ensurePostgrest() {
  if (existsSync(BIN_PATH)) {
    return;
  }

  const arch = process.arch === "arm64" ? "aarch64" : "x86-64";
  const url = `https://github.com/PostgREST/postgrest/releases/download/${POSTGREST_VERSION}/postgrest-${POSTGREST_VERSION}-linux-static-${arch}.tar.xz`;

  console.error(`Descargando PostgREST ${POSTGREST_VERSION}…`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`No se pudo descargar PostgREST: HTTP ${String(response.status)}`);
  }

  await mkdir(BIN_DIR, { recursive: true });

  const archive = join(tmpdir(), "postgrest.tar.xz");
  await pipeline(Readable.fromWeb(response.body), createWriteStream(archive));
  await execFileAsync("tar", ["-xf", archive, "-C", BIN_DIR]);
  await chmod(BIN_PATH, 0o755);
}

async function writeConfig() {
  const path = join(tmpdir(), "postgrest-norma.conf");

  await writeFile(
    path,
    [
      `db-uri = "${DB_URL}"`,
      'db-schemas = "public"',
      'db-anon-role = "anon"',
      `jwt-secret = "${JWT_SECRET}"`,
      `server-port = ${String(POSTGREST_PORT)}`,
      'server-host = "127.0.0.1"',
      "db-pool = 4",
      // Sin esto, PostgREST cachea el esquema y una migración nueva no se ve.
      "db-channel-enabled = true",
      "",
    ].join("\n"),
    "utf8",
  );

  return path;
}

/**
 * `supabase-js` pide `/rest/v1/campaigns`; PostgREST sirve `/campaigns`. Es la
 * única diferencia de forma entre los dos, y se resuelve reescribiendo la ruta.
 *
 * El reenvío es en crudo con `node:http` y no con `fetch` para conservar tal cual
 * los encabezados `Range` y `Prefer` que PostgREST usa para paginar y para
 * devolver la fila insertada.
 */
async function main() {
  await ensurePostgrest();

  const configPath = await writeConfig();

  const postgrest = spawn(BIN_PATH, [configPath], {
    stdio: ["ignore", "inherit", "inherit"],
  });

  postgrest.on("exit", (code) => {
    console.error(`PostgREST terminó con código ${String(code)}`);
    process.exit(code ?? 1);
  });

  const server = createServer((incoming, outgoing) => {
    const url = incoming.url ?? "/";

    if (url.startsWith("/auth/v1")) {
      handleAuth(incoming, outgoing, url).catch((error) => {
        // Principio XII: si la base no contesta o el hook falla, se dice cuál fue el
        // error. Un 500 vacío acá se ve, del otro lado, como "esos datos no coinciden
        // con ninguna cuenta", que es exactamente la pista equivocada.
        console.error(`Error en ${url}: ${error.message}`);
        json(outgoing, 500, { code: 500, error_code: "unexpected_failure", msg: error.message });
      });
      return;
    }

    if (!url.startsWith("/rest/v1")) {
      outgoing.writeHead(404, { "content-type": "application/json" });
      outgoing.end(JSON.stringify({ message: "La API local sólo emula /rest/v1." }));
      return;
    }

    const proxied = httpRequest(
      {
        host: "127.0.0.1",
        port: POSTGREST_PORT,
        method: incoming.method,
        path: url.slice("/rest/v1".length) || "/",
        headers: { ...incoming.headers, host: `127.0.0.1:${String(POSTGREST_PORT)}` },
      },
      (upstream) => {
        outgoing.writeHead(upstream.statusCode ?? 502, upstream.headers);
        upstream.pipe(outgoing);
      },
    );

    proxied.on("error", (error) => {
      outgoing.writeHead(502, { "content-type": "application/json" });
      outgoing.end(
        JSON.stringify({ message: `No se pudo alcanzar PostgREST: ${error.message}` }),
      );
    });

    incoming.pipe(proxied);
  });

  server.listen(API_PORT, "127.0.0.1", () => {
    console.error("");
    console.error("API local lista. Pegá esto en .env.local:");
    console.error("");
    console.error(`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${String(API_PORT)}`);
    console.error(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}`);
    console.error("");
  });

  const shutdown = () => {
    postgrest.kill("SIGTERM");
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

await main();
