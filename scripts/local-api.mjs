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
 * ## Qué no es
 *
 * No es Supabase. No hay GoTrue, ni Storage, ni Realtime. `/auth/v1` responde 501
 * con un mensaje explícito en lugar de fallar raro: el backoffice se prueba contra
 * un proyecto de Supabase de verdad, y eso está documentado en el runbook.
 *
 * La clave anónima que imprime es un JWT firmado con un secreto de desarrollo que
 * está escrito acá. **No es un secreto**: sólo sirve contra esta base, que se
 * borra entera en cada reset.
 *
 * Uso: node scripts/local-api.mjs
 *      node scripts/local-api.mjs --print-anon-key   (sólo imprime la clave)
 */

import { execFile, spawn } from "node:child_process";
import { createHmac } from "node:crypto";
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
      outgoing.writeHead(501, { "content-type": "application/json" });
      outgoing.end(
        JSON.stringify({
          message:
            "La API local no incluye autenticación. El backoffice se prueba contra un proyecto de Supabase real (docs/runbook.md).",
        }),
      );
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
