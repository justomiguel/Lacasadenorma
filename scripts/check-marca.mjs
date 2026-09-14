/**
 * Cada variante del símbolo tiene archivo, y las medidas son las del PNG.
 *
 * Un documento que dice "las doce están recortadas" no frena un recorte que se
 * movió o un id nuevo sin archivo. Este script recorre `content/marca.ts`,
 * comprueba que el PNG exista y que el IHDR coincida. No exige que todas se
 * pinten: estar disponibles es el punto del catálogo.
 *
 * Lo que sí exige: que el chrome (`SiteMark`) y la tarjeta de compartir usen
 * **original**, y que el login, la cuenta y las legales lo pinten. Si el
 * encabezado, el backoffice o Facebook empiezan a mostrar otra variante, falla.
 *
 * Corre en `npm run verify` y en CI.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const CATALOG = "content/marca.ts";
const MARCA_DIR = path.join("public", "marca");
const CHROME = "components/site/mark.tsx";
const CARD = "src/infrastructure/seo/share-card.tsx";
const SURFACES = [
  { file: "components/site/header.tsx", needle: "SiteMark", why: "el encabezado" },
  { file: "components/site/mobile-menu.tsx", needle: "SiteMark", why: "el menú" },
  { file: "components/site/footer.tsx", needle: "SiteMark", why: "el pie" },
  { file: "components/admin/shell.tsx", needle: "SiteMark", why: "el backoffice" },
  { file: "app/(es)/admin/login/page.tsx", needle: "SiteMark", why: "el login" },
  {
    file: "components/account/auth-shell.tsx",
    needle: "PageHeader mark",
    why: "las pantallas de cuenta",
  },
  {
    file: "components/site/legal-document.tsx",
    needle: "PageHeader mark",
    why: "privacidad y términos",
  },
  {
    file: "components/screens/not-found-screen.tsx",
    needle: "PageHeader mark",
    why: "el 404",
  },
  {
    file: "app/global-not-found.tsx",
    needle: "NotFoundScreen",
    why: "el 404 de una URL que no calza",
  },
  {
    file: "app/(en)/en/[...unmatched]/page.tsx",
    needle: "notFound()",
    why: "el 404 en inglés",
  },
  {
    file: "components/site/page-header.tsx",
    needle: "SiteMark",
    why: "el membrete de página",
  },
];

const catalog = await readFile(CATALOG, "utf8");
const variants = [
  ...catalog.matchAll(/\n\s+(?:([A-Za-z][\w]*)|"([^"]+)"):\s*\{([^}]+)\}/g),
].map((match) => {
  const id = match[1] ?? match[2] ?? "";
  const body = match[3] ?? "";
  const src = body.match(/src:\s*"([^"]+)"/)?.[1];
  const width = Number(body.match(/width:\s*(\d+)/)?.[1]);
  const height = Number(body.match(/height:\s*(\d+)/)?.[1]);

  return { id, src, width, height };
});

if (variants.length === 0) {
  console.error("No encontré variantes en content/marca.ts.");
  process.exit(1);
}

const problems = [];

if (!catalog.includes("DEFAULT_MARK = MARK_VARIANTS.original")) {
  problems.push("DEFAULT_MARK tiene que ser MARK_VARIANTS.original.");
}

function pngSize(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    return null;
  }

  if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    return null;
  }

  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const original = variants.find((variant) => variant.id === "original");

if (original === undefined) {
  problems.push("Falta la variante original en el catálogo.");
}

for (const variant of variants) {
  if (
    variant.src === undefined ||
    !Number.isFinite(variant.width) ||
    !Number.isFinite(variant.height)
  ) {
    problems.push(`${variant.id}: el catálogo no declara src, width y height.`);
    continue;
  }

  const file = path.join("public", variant.src.replace(/^\//, ""));

  try {
    await stat(file);
  } catch {
    problems.push(`${variant.id}: falta ${file}.`);
    continue;
  }

  const size = pngSize(await readFile(file));

  if (size === null) {
    problems.push(`${variant.id}: ${file} no es un PNG.`);
    continue;
  }

  if (size.width !== variant.width || size.height !== variant.height) {
    problems.push(
      `${variant.id}: ${file} mide ${String(size.width)}×${String(size.height)}, ` +
        `el catálogo dice ${String(variant.width)}×${String(variant.height)}.`,
    );
  }
}

const listed = new Set(
  variants.map((variant) => path.basename(variant.src ?? "")).filter(Boolean),
);
const onDisk = (await readdir(MARCA_DIR)).filter((name) => name.endsWith(".png"));

for (const name of onDisk) {
  if (!listed.has(name)) {
    problems.push(
      `${path.join(MARCA_DIR, name)} no está en el catálogo. Recortar no alcanza: hay que declararlo.`,
    );
  }
}

const chrome = await readFile(CHROME, "utf8");
const card = await readFile(CARD, "utf8");

if (!chrome.includes("DEFAULT_MARK") && !chrome.includes("/marca/simbolo.png")) {
  problems.push(`${CHROME} tiene que pintar DEFAULT_MARK (original).`);
}

if (!card.includes("DEFAULT_MARK") && !card.includes("/marca/simbolo.png")) {
  problems.push(`${CARD} tiene que pintar DEFAULT_MARK (original).`);
}

for (const surface of SURFACES) {
  const text = await readFile(surface.file, "utf8");

  if (!text.includes(surface.needle)) {
    problems.push(`${surface.file} tiene que llevar el símbolo en ${surface.why}.`);
  }
}

if (original !== undefined && chrome.includes("/marca/terracota.png")) {
  problems.push(`${CHROME} no puede usar terracota: ADR-024 la sacó del producto.`);
}

if (problems.length > 0) {
  console.error("Problemas con la marca propia:\n");

  for (const problem of problems) {
    console.error(`  ${problem}`);
  }

  process.exit(1);
}

console.log(
  `${String(variants.length)} variantes con archivo y medidas: ${variants.map((variant) => variant.id).join(", ")}.`,
);
