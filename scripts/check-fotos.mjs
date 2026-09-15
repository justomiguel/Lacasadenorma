/**
 * Cada foto declarada tiene que existir, y sus dimensiones tienen que ser las
 * verdaderas.
 *
 * El esquema de contenido exige `width` y `height` en cada fotografía, y el
 * navegador los usa para reservar el espacio antes de descargar la imagen. Si el
 * número declarado no es el del archivo, el espacio reservado es el equivocado y
 * el texto salta cuando la foto llega: eso es CLS, y en este proyecto Core Web
 * Vitals es un requisito funcional, no una aspiración (principio VII).
 *
 * Zod no puede comprobar esto: valida que el número sea un entero positivo, no
 * que sea *ese* entero. Así que se comprueba acá, leyendo el encabezado del JPEG.
 *
 * También avisa de las fotos que están en `public/fotos/` o `public/medios/` y
 * nadie declara, **incluyendo subcarpetas**. Un archivo que no se muestra en
 * ninguna página es peso muerto en el repositorio, y si es una foto de una
 * persona, es peso muerto que no debería estar guardado.
 *
 * El catálogo (ADR-043) tiene una regla extra: cada título de
 * `docs/sql/catalogo-casa-basica.sql` y el del fixture tienen que tener una
 * foto de referencia en `catalogo-fotos.json`, con epígrafe que dice que es
 * ilustrativa y que no representa el objeto real, y esas fotos no pueden
 * colarse en el relato.
 *
 * Corre en `npm run verify` y en CI.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const CONTENT_DIR = "content";
const MEDIA_DIRS = [
  { dir: path.join("public", "fotos"), prefix: "/fotos/" },
  { dir: path.join("public", "medios"), prefix: "/medios/" },
];

function isMediaUrl(url) {
  return MEDIA_DIRS.some((entry) => url.startsWith(entry.prefix));
}

/**
 * Dimensiones reales de un JPEG, leídas de su primer marcador SOF.
 *
 * El archivo es una secuencia de segmentos que empiezan con `0xFF`. Los de tipo
 * SOF (*start of frame*) llevan el alto y el ancho en los bytes 3 a 7 de su carga.
 * Se lee ese y se corta: no hace falta decodificar la imagen para saber cuánto
 * mide, y no hace falta una dependencia para leer cinco bytes.
 */
function jpegSize(buffer) {
  if (buffer.readUInt16BE(0) !== 0xffd8) {
    return null;
  }

  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      return null;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    // SOF0 a SOF15, salteando los cuatro marcadores que no son SOF y caen en el
    // mismo rango: DHT (0xC4), JPGA (0xC8) y DAC (0xCC).
    const isStartOfFrame =
      marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

/** Cada objeto del JSON que se parezca a una fotografía declarada. */
function declaredPhotos(value) {
  if (Array.isArray(value)) {
    return value.flatMap(declaredPhotos);
  }

  if (value === null || typeof value !== "object") {
    return [];
  }

  const nested = Object.values(value).flatMap(declaredPhotos);

  return typeof value.url === "string" && isMediaUrl(value.url)
    ? [value, ...nested]
    : nested;
}

const problems = [];
const declared = new Set();

const jsonFiles = [];

async function collectJson(dir) {
  const names = await readdir(dir, { withFileTypes: true });

  for (const name of names) {
    const file = path.join(dir, name.name);

    if (name.isDirectory()) {
      await collectJson(file);
    } else if (name.name.endsWith(".json")) {
      jsonFiles.push(file);
    }
  }
}

await collectJson(CONTENT_DIR);

for (const file of jsonFiles) {
  const photos = declaredPhotos(JSON.parse(await readFile(file, "utf8")));
  const isCatalog = file.endsWith(`${path.sep}catalogo-fotos.json`);

  for (const photo of photos) {
    declared.add(photo.url);

    if (isCatalog) {
      if (!photo.url.startsWith("/fotos/catalogo/")) {
        problems.push(`${file}: ${photo.url} no vive en /fotos/catalogo/ (ADR-043).`);
      }

      const caption = typeof photo.caption === "string" ? photo.caption : "";
      const english = file.includes(`${path.sep}en${path.sep}`);
      const illustrative = english ? /illustrative/i : /ilustrativa/i;
      const notReal = english ? /does not represent/i : /no representa/i;

      if (!illustrative.test(caption) || !notReal.test(caption)) {
        problems.push(
          `${file}: ${photo.url} no dice en el epígrafe que es ilustrativa y que no representa el objeto real.`,
        );
      }
    } else if (photo.url.startsWith("/fotos/catalogo/")) {
      problems.push(
        `${file}: una foto editorial no puede vivir en /fotos/catalogo/ (ADR-043).`,
      );
    }

    const onDisk = path.join("public", photo.url);
    let buffer;

    try {
      buffer = await readFile(onDisk);
    } catch {
      problems.push(`${file}: declara ${photo.url} y el archivo no existe.`);
      continue;
    }

    const real = jpegSize(buffer);

    if (real === null) {
      problems.push(`${file}: no pude leer las dimensiones de ${photo.url}.`);
      continue;
    }

    if (real.width !== photo.width || real.height !== photo.height) {
      problems.push(
        `${file}: ${photo.url} declara ${photo.width}×${photo.height} y mide ` +
          `${real.width}×${real.height}. El espacio reservado sería el equivocado.`,
      );
    }
  }
}

async function listJpeg(dir, prefix, relative = "") {
  const names = await readdir(path.join(dir, relative), { withFileTypes: true });
  const found = [];

  for (const name of names) {
    const rel = path.join(relative, name.name);

    if (name.isDirectory()) {
      found.push(...(await listJpeg(dir, prefix, rel)));
      continue;
    }

    if (!name.name.endsWith(".jpg") && !name.name.endsWith(".jpeg")) {
      continue;
    }

    found.push(`${prefix}${rel.split(path.sep).join("/")}`);
  }

  return found;
}

for (const { dir, prefix } of MEDIA_DIRS) {
  for (const url of await listJpeg(dir, prefix)) {
    if (!declared.has(url)) {
      problems.push(
        `${path.join("public", url.replace(/^\//, ""))}: está en el repositorio y ningún contenido ` +
          `la declara. Publicala o borrala.`,
      );
    }
  }
}

const FIXTURE_TITLE = "Chapas del techo (datos de desarrollo)";
const sql = await readFile(path.join("docs", "sql", "catalogo-casa-basica.sql"), "utf8");
const seedTitles = [...sql.matchAll(/\(\d+,\s*'[a-z_]+',\s*'([^']+)'/g)].map(
  (match) => match[1],
);
const requiredTitles = [...seedTitles, FIXTURE_TITLE];

for (const locale of ["es", "en"]) {
  const file = path.join("content", locale, "catalogo-fotos.json");
  const photos = JSON.parse(await readFile(file, "utf8"));
  const keys = Object.keys(photos);

  for (const title of requiredTitles) {
    if (photos[title] === undefined) {
      problems.push(`${file}: falta la foto de referencia de «${title}» (ADR-043).`);
    }
  }

  for (const title of keys) {
    if (!requiredTitles.includes(title)) {
      problems.push(
        `${file}: «${title}» no está en el catálogo básico ni en el fixture.`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error("Problemas con las fotografías declaradas:\n");

  for (const problem of problems) {
    console.error(`  ${problem}`);
  }

  console.error(
    "\nLas dimensiones se corrigen con las del archivo, no al revés: son las que " +
      "reservan el espacio y evitan que el texto salte cuando la foto llega.",
  );
  process.exit(1);
}

console.log(
  `${declared.size} fotografías declaradas, todas presentes y con sus dimensiones reales.`,
);
