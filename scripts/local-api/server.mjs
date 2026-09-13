import { execFile, spawn } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

import { handleAuth } from "./auth.mjs";
import {
  API_PORT,
  BIN_DIR,
  DB_URL,
  JWT_SECRET,
  POSTGREST_PORT,
  POSTGREST_VERSION,
} from "./config.mjs";
import { json } from "./http.mjs";
import { ANON_KEY } from "./jwt.mjs";

const execFileAsync = promisify(execFile);
const BIN_PATH = join(BIN_DIR, "postgrest");

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
export async function startLocalApi() {
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
        json(outgoing, 500, {
          code: 500,
          error_code: "unexpected_failure",
          msg: error.message,
        });
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
