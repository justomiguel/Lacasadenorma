/**
 * Ninguna cifra, fecha o dato de ejemplo puede llegar a la pantalla.
 *
 * Es la regla más importante del proyecto (riesgo R4, SC-010): un sitio que pide
 * plata y muestra un CBU de relleno o un monto inventado pierde lo único que
 * tiene. Un `TODO` en un comentario es normal; un `TODO` en el texto que lee una
 * persona es un fallo de producto.
 *
 * Este script busca marcadores de relleno en:
 *
 *   - `content/`: todos los valores de texto de los JSON versionados.
 *   - `app/` y `components/`: los literales de cadena, que es donde vive el texto
 *     que se renderiza.
 *
 * No busca en comentarios de código ni en `docs/`, donde un `TODO` es legítimo.
 *
 * Corre en `npm run verify` y en CI.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/**
 * Marcadores en mayúsculas y con límites de palabra, para no confundir el `todo`
 * castellano ("todo lo que entra") con el marcador `TODO`.
 */
const MARKERS = [
  /\bTODO\b/,
  /\bFIXME\b/,
  /\bTBD\b/,
  /\bPENDIENTE\b/,
  // En mayúsculas, como el resto: en minúsculas choca con la variante
  // `placeholder:` de Tailwind, que aparece en el atributo `class` de cada campo de
  // formulario y no es texto que nadie lea.
  /\bPLACEHOLDER\b/,
  /\blorem ipsum\b/i,
  /X{4,}/,
  /\bcompletar acá\b/i,
  /\bdato de ejemplo\b/i,
  /\b0{3,}-0{3,}\b/,
];

const CONTENT_DIR = "content";
const CODE_DIRS = ["app", "components"];
const CODE_EXTENSIONS = new Set([".ts", ".tsx"]);

/** Cadenas literales de un archivo TypeScript, sin comentarios. */
function stringLiterals(source) {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  return [...withoutComments.matchAll(/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g)].map(
    (match) => match[0],
  );
}

/** Todos los valores de texto de un JSON, recursivamente. */
function textValues(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(textValues);
  }

  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(textValues);
  }

  return [];
}

async function filesUnder(dir, keep) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });

  return entries
    .filter((entry) => entry.isFile() && keep(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

const findings = [];

function check(file, texts) {
  for (const text of texts) {
    for (const marker of MARKERS) {
      if (marker.test(text)) {
        findings.push({ file, marker: String(marker), text: text.slice(0, 120) });
      }
    }
  }
}

for (const file of await filesUnder(CONTENT_DIR, (name) => name.endsWith(".json"))) {
  check(file, textValues(JSON.parse(await readFile(file, "utf8"))));
}

for (const dir of CODE_DIRS) {
  for (const file of await filesUnder(dir, (name) =>
    CODE_EXTENSIONS.has(path.extname(name)),
  )) {
    if (file.includes(".test.") || file.includes(".spec.")) {
      continue;
    }

    check(file, stringLiterals(await readFile(file, "utf8")));
  }
}

if (findings.length > 0) {
  console.error("Se encontraron marcadores de relleno en texto que se muestra:\n");

  for (const finding of findings) {
    console.error(`  ${finding.file}\n    ${finding.marker} → ${finding.text}\n`);
  }

  console.error(
    "Un dato ausente se omite; un dato de ejemplo se publica como si fuera cierto.\n" +
      "Quitá el marcador o dejá el campo en null y omitilo en la interfaz.",
  );
  process.exit(1);
}

console.log("Sin marcadores de relleno en el contenido ni en la interfaz.");
