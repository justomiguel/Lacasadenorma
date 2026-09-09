/**
 * La clave secreta de Supabase no puede llegar al navegador (amenaza I4).
 *
 * Next inyecta en el bundle del cliente **cualquier** variable con prefijo
 * `NEXT_PUBLIC_`, y sólo esas. El error real no es escribir el prefijo por
 * accidente: es leer una variable sin prefijo desde un módulo que termina
 * incluido en el cliente, porque entonces Next la reemplaza por `undefined` y el
 * código falla en silencio, o —peor— alguien "lo arregla" agregando el prefijo.
 *
 * Este script comprueba tres cosas, en orden de qué tan barato es equivocarse:
 *
 * 1. Ninguna variable con prefijo `NEXT_PUBLIC_` tiene un nombre que anuncie un
 *    secreto (`SECRET`, `SERVICE_ROLE`, `PRIVATE`, `PASSWORD`, `TOKEN`).
 * 2. Ningún archivo con `"use client"` lee `process.env` de algo que no empiece
 *    con `NEXT_PUBLIC_`.
 * 3. Si existe un build en `.next/`, la clave secreta no aparece en ningún
 *    archivo servido al navegador. Es la comprobación que no depende de leer
 *    bien el código: mira el resultado.
 *
 * Corre en `npm run verify` y en CI.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const FORBIDDEN_IN_PUBLIC_NAMES = /^NEXT_PUBLIC_.*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|TOKEN)/;

const SOURCE_DIRS = ["app", "components", "src", "content"];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts"]);
const CLIENT_BUNDLE_DIR = ".next/static";

const problems = [];

async function filesUnder(dir, keep) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => null);

  if (entries === null) {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && keep(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

// ── 1 y 2: el código fuente ──────────────────────────────────────────────────

for (const dir of SOURCE_DIRS) {
  for (const file of await filesUnder(dir, (name) => SOURCE_EXTENSIONS.has(path.extname(name)))) {
    const source = await readFile(file, "utf8");
    const isClientModule = /^\s*["']use client["']/m.test(source);

    for (const match of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      const name = match[1];

      if (FORBIDDEN_IN_PUBLIC_NAMES.test(name)) {
        problems.push(
          `${file}: la variable ${name} lleva prefijo NEXT_PUBLIC_ y un nombre de secreto. ` +
            "Todo lo que lleva ese prefijo se compila dentro del bundle del navegador.",
        );
      }

      if (isClientModule && !name.startsWith("NEXT_PUBLIC_")) {
        problems.push(
          `${file}: es un módulo de cliente y lee process.env.${name}, que no llega al navegador. ` +
            "Pasá el valor desde un componente de servidor.",
        );
      }
    }
  }
}

// ── 3: el bundle, si existe ──────────────────────────────────────────────────

const secret = process.env.SUPABASE_SECRET_KEY?.trim();
const bundleFiles = await filesUnder(CLIENT_BUNDLE_DIR, (name) => name.endsWith(".js"));

if (bundleFiles.length === 0) {
  console.log("No hay build en .next/static: se omite la revisión del bundle.");
} else {
  for (const file of bundleFiles) {
    const code = await readFile(file, "utf8");

    if (secret !== undefined && secret.length > 16 && code.includes(secret)) {
      problems.push(`${file}: contiene el valor de SUPABASE_SECRET_KEY.`);
    }

    // Las claves nuevas de Supabase llevan prefijo por tipo. `sb_secret_` en un
    // archivo del navegador es una filtración, sin importar de dónde salió.
    if (/sb_secret_[A-Za-z0-9_-]{10,}/.test(code) || /"service_role"/.test(code)) {
      problems.push(`${file}: contiene una credencial de servidor.`);
    }
  }

  console.log(`Revisados ${String(bundleFiles.length)} archivos del bundle del navegador.`);
}

if (problems.length > 0) {
  console.error("\nCredenciales o variables de servidor en código de cliente:\n");

  for (const problem of problems) {
    console.error(`  · ${problem}`);
  }

  process.exit(1);
}

console.log("Ninguna credencial de servidor llega al navegador.");
