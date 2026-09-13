/**
 * Cada marca de terceros que se nombra en la interfaz tiene su logo, y el
 * logo se usa.
 *
 * Un documento que dice "siempre el logo de PayPal" no frena un tab nuevo
 * sin pictograma. Este script recorre el catálogo de `content/brands.ts`,
 * comprueba que el SVG exista y que `<BrandMark id="…">` aparezca en algún
 * componente. Si se agrega una marca al catálogo y nadie la pone, falla.
 *
 * Corre en `npm run verify` y en CI.
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { readdir } from "node:fs/promises";

const CATALOG = "content/brands.ts";
const MARCAS_DIR = path.join("public", "marcas");
const SURFACES = ["components", "app"];

const catalog = await readFile(CATALOG, "utf8");
const ids = [...catalog.matchAll(/^\s{2}([a-z]+): \{/gm)].map((match) => match[1]);

if (ids.length === 0) {
  console.error("No encontré marcas en content/brands.ts.");
  process.exit(1);
}

const problems = [];

async function collectTsx(dir, acc = []) {
  const names = await readdir(dir, { withFileTypes: true });

  for (const name of names) {
    const file = path.join(dir, name.name);

    if (name.isDirectory()) {
      await collectTsx(file, acc);
    } else if (name.name.endsWith(".tsx")) {
      acc.push(file);
    }
  }

  return acc;
}

const surfaces = (await Promise.all(SURFACES.map((dir) => collectTsx(dir)))).flat();
const files = await Promise.all(
  surfaces.map(async (file) => ({ file, text: await readFile(file, "utf8") })),
);

for (const id of ids) {
  const file = path.join(MARCAS_DIR, `${id}.svg`);

  try {
    await stat(file);
  } catch {
    problems.push(`${id}: falta ${file}.`);
    continue;
  }

  const svg = await readFile(file, "utf8");

  if (!svg.includes("<svg") || !svg.includes("currentColor")) {
    problems.push(
      `${id}: ${file} tiene que ser un SVG con fill="currentColor" para heredar la tinta.`,
    );
  }

  const used = files.some(
    ({ text }) =>
      /BrandMark|BrandLabel|ChannelLabel/.test(text) &&
      new RegExp(`["']${id}["']`).test(text),
  );

  if (!used) {
    problems.push(
      `${id}: el archivo está y nadie lo muestra. Poné <BrandMark id="${id}"> ` +
        `al lado del nombre en la interfaz.`,
    );
  }
}

if (problems.length > 0) {
  console.error("Problemas con las marcas de terceros:\n");

  for (const problem of problems) {
    console.error(`  ${problem}`);
  }

  process.exit(1);
}

console.log(
  `${String(ids.length)} marcas con archivo y <BrandMark> en la interfaz: ${ids.join(", ")}.`,
);
