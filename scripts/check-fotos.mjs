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
 * También avisa de las fotos que están en `public/fotos/` y nadie declara. Un
 * archivo que no se muestra en ninguna página es peso muerto en el repositorio,
 * y si es una foto de una persona, es peso muerto que no debería estar guardado.
 *
 * Corre en `npm run verify` y en CI.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const CONTENT_DIR = "content";
const PHOTO_DIR = path.join("public", "fotos");
const PUBLIC_PREFIX = "/fotos/";

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

  return typeof value.url === "string" && value.url.startsWith(PUBLIC_PREFIX)
    ? [value, ...nested]
    : nested;
}

const problems = [];
const declared = new Set();

const contentFiles = (await readdir(CONTENT_DIR)).filter((name) =>
  name.endsWith(".json"),
);

for (const name of contentFiles) {
  const file = path.join(CONTENT_DIR, name);
  const photos = declaredPhotos(JSON.parse(await readFile(file, "utf8")));

  for (const photo of photos) {
    declared.add(photo.url);

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

for (const name of await readdir(PHOTO_DIR)) {
  if (!declared.has(`${PUBLIC_PREFIX}${name}`)) {
    problems.push(
      `${path.join(PHOTO_DIR, name)}: está en el repositorio y ningún contenido ` +
        `la declara. Publicala o borrala.`,
    );
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
