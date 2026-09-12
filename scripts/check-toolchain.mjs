/**
 * Las decisiones de herramientas que un merge no puede revertir sin avisar.
 *
 * El 12 de septiembre de 2026 entraron a `main` dos pull requests automáticos:
 * `typescript` 7.0.2 y `eslint` 10.10.0. Las dos cosas ya estaban prohibidas por
 * escrito —la constitución las nombra una por una en "Regla de versiones
 * verificadas", y `.github/dependabot.yml` tenía un comentario diciendo que una
 * mayor de ESLint «no es una actualización de dependencia: es una decisión»— y
 * entraron igual, porque un documento no frena un merge.
 *
 * El modo de falla fue silencioso donde importaba: `npm ci` terminó bien y dijo
 * "found 0 vulnerabilities". Lo que pasó por debajo es que `typescript-eslint` se
 * volvió insatisfacible (pide `typescript >=4.8.4 <6.1.0`), npm lo sacó del árbol
 * y del lockfile en lugar de fallar, y como `eslint.config.ts` lo importa por
 * nombre se cayeron las dos compuertas juntas, `typecheck` y `lint`. Nadie tocó
 * una línea de código del sitio y quedó todo rojo.
 *
 * Este script existe para que la próxima vez la respuesta llegue del lado del CI
 * y no del lado de la sorpresa. Comprueba tres cosas:
 *
 * 1. Las mayores decididas siguen siendo las decididas.
 * 2. Toda dependencia está fijada a una versión exacta, sin rangos.
 * 3. Todo paquete que un archivo de configuración importa por nombre está
 *    declarado en `package.json`, presente en el lockfile y presente en el árbol.
 *
 * Corre en `npm run verify` y en CI.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/**
 * La mayor de cada herramienta cuyo salto es una decisión y no una actualización.
 *
 * Agregar una entrada acá es la forma de registrar esa decisión; cambiar un número
 * es la forma de tomarla, y hay que venir a este archivo a hacerlo, que es donde
 * está escrito el motivo. `docs/research/2026-09-toolchain.md` tiene el detalle.
 */
const MAYORES_DECIDIDAS = {
  // TypeScript 7 es el port nativo a Go: no expone la API del compilador en
  // JavaScript, y de esa API dependen `typescript-eslint` y el typegen de Next.
  typescript: 6,
  // ESLint 10 saca de la caja cosas que `eslint-config-next` 16 todavía usa.
  eslint: 9,
};

const ARCHIVOS_DE_CONFIGURACION = [
  "eslint.config.ts",
  "next.config.ts",
  "playwright.config.ts",
  "postcss.config.mjs",
  "proxy.ts",
  "vitest.config.mts",
  "vitest.setup.ts",
];

const VERSION_EXACTA = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const IMPORT_CON_ORIGEN = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g;

const problemas = [];

const paquete = JSON.parse(await readFile("package.json", "utf8"));
const lockfile = JSON.parse(await readFile("package-lock.json", "utf8"));

const declaradas = { ...paquete.dependencies, ...paquete.devDependencies };

// ── 1: las mayores que son una decisión ──────────────────────────────────────

for (const [nombre, mayorEsperada] of Object.entries(MAYORES_DECIDIDAS)) {
  const version = declaradas[nombre];

  if (version === undefined) {
    problemas.push(
      `${nombre} no está declarado en package.json, y este proyecto decidió qué mayor usa. ` +
        "Si se sacó a propósito, sacá también su entrada de MAYORES_DECIDIDAS en este script.",
    );
    continue;
  }

  const mayor = Number(version.replace(/^\D+/, "").split(".")[0]);

  if (mayor !== mayorEsperada) {
    problemas.push(
      `${nombre} está en ${version} y este proyecto corre con la mayor ${String(mayorEsperada)}. ` +
        "El salto de mayor de esta herramienta no es una actualización de dependencia: es una " +
        "decisión, y ya rompió `main` una vez. Está explicado en " +
        "docs/research/2026-09-toolchain.md. Si la decisión se tomó, se cambia el número en " +
        "scripts/check-toolchain.mjs y se actualiza la constitución en el mismo commit.",
    );
  }
}

// ── 2: todo fijado, nada de rangos ───────────────────────────────────────────

for (const [nombre, version] of Object.entries(declaradas)) {
  if (!VERSION_EXACTA.test(version)) {
    problemas.push(
      `${nombre} está declarado como "${version}". Las dependencias de este proyecto se fijan a ` +
        "una versión exacta: un rango deja que el árbol cambie sin que cambie ningún archivo, y " +
        "entonces una falla no se puede reproducir ni bisecar.",
    );
  }
}

// ── 3: lo que la configuración importa por nombre ────────────────────────────

// El caso que nos rompió: un paquete que un archivo de configuración usa, que
// nadie declaró porque «ya venía» con otro, y que el día que el resolutor lo
// saca del árbol se lleva puesta la compuerta que lo importaba.

async function contenidoDe(directorio) {
  return new Set(await readdir(directorio).catch(() => []));
}

const raizDelArbol = await contenidoDe("node_modules");
const arbolDisponible = raizDelArbol.size > 0;
const scopesDelArbol = new Map();

for (const nombre of raizDelArbol) {
  if (nombre.startsWith("@")) {
    scopesDelArbol.set(nombre, await contenidoDe(path.join("node_modules", nombre)));
  }
}

function estaEnElArbol(nombre) {
  if (!nombre.startsWith("@")) {
    return raizDelArbol.has(nombre);
  }

  const [scope, sinScope] = nombre.split("/");

  return scopesDelArbol.get(scope)?.has(sinScope) === true;
}

function nombreDePaquete(especificador) {
  const partes = especificador.split("/");

  return especificador.startsWith("@") ? partes.slice(0, 2).join("/") : partes[0];
}

let importacionesRevisadas = 0;

for (const archivo of ARCHIVOS_DE_CONFIGURACION) {
  const fuente = await readFile(archivo, "utf8").catch(() => null);

  if (fuente === null) {
    continue;
  }

  for (const coincidencia of fuente.matchAll(IMPORT_CON_ORIGEN)) {
    const especificador = coincidencia[1];

    // Relativos, absolutos, built-ins de Node e imports internos del paquete no
    // se resuelven contra el árbol de dependencias.
    if (/^[./#]/.test(especificador) || especificador.startsWith("node:")) {
      continue;
    }

    const nombre = nombreDePaquete(especificador);
    importacionesRevisadas += 1;

    if (!(nombre in declaradas)) {
      problemas.push(
        `${archivo} importa "${especificador}" y ${nombre} no está declarado en package.json. ` +
          "Un paquete que se importa por nombre se declara por nombre, aunque hoy lo esté " +
          "instalando otro: el día que ese otro deje de traerlo, se cae este archivo.",
      );
    }

    if (arbolDisponible && !estaEnElArbol(nombre)) {
      problemas.push(
        `${archivo} importa "${especificador}" y ${nombre} no está en node_modules. ` +
          "Si la instalación no falló, es que el resolutor lo descartó por un conflicto de " +
          "peerDependencies: mirá qué otra versión se movió antes de reinstalar.",
      );
    }
  }
}

// ── El lockfile ──────────────────────────────────────────────────────────────

for (const nombre of Object.keys(declaradas)) {
  if (!(`node_modules/${nombre}` in (lockfile.packages ?? {}))) {
    problemas.push(
      `${nombre} está en package.json y no tiene entrada en package-lock.json. ` +
        "Correr npm install y commitear el lockfile.",
    );
  }
}

if (problemas.length > 0) {
  console.error("\nLas herramientas no están como se decidió:\n");

  for (const problema of problemas) {
    console.error(`  · ${problema}\n`);
  }

  process.exit(1);
}

console.log(
  `Herramientas verificadas: ${String(Object.keys(MAYORES_DECIDIDAS).length)} mayores decididas, ` +
    `${String(Object.keys(declaradas).length)} dependencias fijadas, ` +
    `${String(importacionesRevisadas)} importaciones de configuración` +
    `${arbolDisponible ? " resueltas contra node_modules" : " (sin node_modules: no se revisó el árbol)"}.`,
);
