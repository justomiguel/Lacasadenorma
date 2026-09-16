/**
 * Donde un control se reconoce de un vistazo, el icono va al lado del nombre
 * (ADR-047). Un párrafo no alcanza: este script es la compuerta.
 *
 * Comprueba:
 * - cada `CopyField` tiene un `label` declarado en `COPY_FIELD_MARKS`
 * - el selector de país, los caminos de ayudar, los canales de la ficha y
 *   llamar/escribir llevan su marca
 * - no entra un pack de iconos
 *
 * Corre en `npm run verify` y en CI.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { readdir } from "node:fs/promises";

const COPY_FIELD = path.join("components", "design-system", "copy-field.tsx");
const SURFACES = ["components", "app"];
const PACKS = [
  "lucide-react",
  "@heroicons",
  "react-icons",
  "@tabler/icons-react",
  "phosphor-react",
  "@phosphor-icons/react",
];

const REQUIRED = [
  {
    file: path.join("components", "campaign", "country-selector.tsx"),
    needles: ["CountryMark"],
    why: "el tab de país lleva bandera o globo (ADR-047).",
  },
  {
    file: path.join("components", "campaign", "donation-selector.tsx"),
    needles: ["CountryMark"],
    why: "sin JavaScript los h3 de país también llevan marca.",
  },
  {
    file: path.join("components", "campaign", "help-paths.tsx"),
    needles: ["HandsIcon", "BanknoteIcon", "BoxIcon"],
    why: "los tres caminos de /ayudar llevan pictograma.",
  },
  {
    file: path.join("components", "catalog", "cover.tsx"),
    needles: ["BankIcon", "BoxIcon", "BrandLabel"],
    why: "traer, transferir y los medios llevan marca.",
  },
  {
    file: path.join("components", "campaign", "contact-actions.tsx"),
    needles: ["PhoneIcon", "MailIcon"],
    why: "llamar y escribir llevan pictograma.",
  },
];

const problems = [];

const copyFieldSource = await readFile(COPY_FIELD, "utf8");
const markKeys = [
  ...copyFieldSource.matchAll(/^\s{2}"?([A-Za-zÁÉÍÓÚÜÑáéíóúüñ /]+)"?:\s+\w+Icon,/gm),
].map((match) => match[1].replaceAll('"', ""));

if (markKeys.length === 0) {
  problems.push(`${COPY_FIELD}: no encontré claves en COPY_FIELD_MARKS.`);
}

async function collectTsx(dir, acc = []) {
  const names = await readdir(dir, { withFileTypes: true });

  for (const name of names) {
    const file = path.join(dir, name.name);

    if (name.isDirectory()) {
      await collectTsx(file, acc);
    } else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) {
      acc.push(file);
    }
  }

  return acc;
}

const files = (await Promise.all(SURFACES.map((dir) => collectTsx(dir)))).flat();
const contents = await Promise.all(
  files.map(async (file) => ({ file, text: await readFile(file, "utf8") })),
);

const usedLabels = [];

for (const { file, text } of contents) {
  for (const pack of PACKS) {
    if (text.includes(`from "${pack}`) || text.includes(`from '${pack}`)) {
      problems.push(
        `${file}: no se importa ${pack}. Los pictogramas salen de icons.tsx.`,
      );
    }
  }

  for (const match of text.matchAll(/<CopyField\b([^>]*)>/g)) {
    const attrs = match[1];
    const label = attrs.match(/\blabel="([^"]+)"/)?.[1];

    if (label === undefined) {
      problems.push(`${file}: un CopyField no declara label="…" en la misma etiqueta.`);
      continue;
    }

    usedLabels.push({ file, label });

    if (!markKeys.includes(label)) {
      problems.push(
        `${file}: CopyField label="${label}" no está en COPY_FIELD_MARKS. ` +
          `Agregá el pictograma en icons.tsx y la entrada en el mapa.`,
      );
    }
  }
}

for (const required of REQUIRED) {
  let text;

  try {
    text = await readFile(required.file, "utf8");
  } catch {
    problems.push(`${required.file}: no está y ${required.why}`);
    continue;
  }

  for (const needle of required.needles) {
    if (!text.includes(needle)) {
      problems.push(`${required.file}: falta ${needle}; ${required.why}`);
    }
  }
}

if (usedLabels.length === 0) {
  problems.push("No encontré ningún <CopyField>. La transferencia los necesita.");
}

if (problems.length > 0) {
  console.error("Problemas con los iconos que identifican (ADR-047):\n");

  for (const problem of problems) {
    console.error(`  ${problem}`);
  }

  process.exit(1);
}

console.log(
  `${String(usedLabels.length)} CopyField con marca, ${String(markKeys.length)} etiquetas en el mapa, ` +
    `sin packs. País, caminos, canales y contacto llevan pictograma.`,
);
