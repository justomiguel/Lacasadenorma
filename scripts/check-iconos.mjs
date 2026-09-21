/**
 * Donde un control se reconoce de un vistazo, el icono va **antes** del
 * nombre, a 1.15 em de esa letra (ADR-047). Un párrafo no alcanza: este
 * script es la compuerta.
 *
 * Comprueba:
 * - cada `CopyField` tiene un `label` declarado en `COPY_FIELD_MARKS`
 * - el selector de país, los caminos, los canales, el contacto, el drawer
 *   y cada botón con caja envuelven la marca en `IdentifyingMark`
 * - el token `--identifying-mark: 1.15em` está y no hay `size={16}` ni
 *   `1.15em` suelto
 * - no entra un pack de iconos
 *
 * Corre en `npm run verify` y en CI.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { readdir } from "node:fs/promises";

const COPY_FIELD = path.join("components", "design-system", "copy-field.tsx");
const TOKENS = path.join("app", "globals.css");
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
    needles: ["HandsIcon", "BanknoteIcon", "BoxIcon", "IdentifyingMark"],
    why: "los tres caminos de /ayudar llevan pictograma a 1.15 em.",
  },
  {
    file: path.join("components", "catalog", "cover.tsx"),
    needles: ["BankIcon", "BanknoteIcon", "BoxIcon", "BrandLabel", "IdentifyingMark"],
    why: "traer, cubrir con plata, transferir y los medios llevan marca a 1.15 em.",
  },
  {
    file: path.join("components", "campaign", "contact-actions.tsx"),
    needles: ["PhoneIcon", "MailIcon", "IdentifyingMark"],
    why: "llamar y escribir llevan pictograma a 1.15 em.",
  },
  {
    file: COPY_FIELD,
    needles: ["IdentifyingMark"],
    why: "cada dato bancario lleva la marca a 1.15 em de la etiqueta.",
  },
  {
    file: path.join("components", "design-system", "flags.tsx"),
    needles: ["IdentifyingMark", "identifying-flag"],
    why: "el globo y la bandera miden en em de la letra del país.",
  },
  {
    file: path.join("components", "design-system", "brand-mark.tsx"),
    needles: ["identifying-mark"],
    why: "el logo de terceros comparte el 1.15 em.",
  },
  {
    file: path.join("components", "site", "account-chrome.tsx"),
    needles: ["IdentifyingMark"],
    why: "donaciones, cuenta, backoffice, métricas y salir llevan marca a 1.15 em.",
  },
  {
    file: path.join("components", "admin", "nav-bar.tsx"),
    needles: ["IdentifyingMark"],
    why: "cada grupo del backoffice lleva pictograma a 1.15 em.",
  },
  {
    file: path.join("components", "admin", "group-tabs.tsx"),
    needles: ["IdentifyingMark"],
    why: "cada pestaña del grupo lleva pictograma a 1.15 em.",
  },
  {
    file: path.join("components", "design-system", "work-nav.tsx"),
    needles: ["IdentifyingMark"],
    why: "reservas, la cuenta y el Backoffice llevan pictograma a 1.15 em.",
  },
  {
    file: path.join("components", "account", "account-panels.tsx"),
    needles: ["IdentifyingMark"],
    why: "foto, cómo aparecer, acceso y borrar llevan pictograma en el bloque.",
  },
  {
    file: path.join("components", "site", "language-switch.tsx"),
    needles: ["LocaleFlag"],
    why: "el idioma del pie lleva bandera antes del nombre (ADR-047).",
  },
  {
    file: path.join("components", "admin", "news-media-kind.tsx"),
    needles: ["CameraIcon", "VideoIcon", "IdentifyingMark"],
    why: "foto y video se reconocen de un vistazo al adjuntar (ADR-047).",
  },
  {
    file: path.join("components", "campaign", "help-cta.tsx"),
    needles: ["HelpActionLabel"],
    why: "Ayudar a reconstruir lleva las manos antes del nombre.",
  },
  {
    file: path.join("components", "design-system", "actions.tsx"),
    needles: ["IdentifyingMark", "HandsIcon"],
    why: "PrimaryAction, FileAction y Ayudar envuelven la marca.",
  },
  {
    file: path.join("components", "account", "fields.tsx"),
    needles: ["IdentifyingMark"],
    why: "el envío público lleva marca antes del nombre.",
  },
];

const BOXED_ACTION = [
  "primaryActionClass(",
  "compactPrimaryActionClass(",
  "compactOutlineActionClass(",
];
const BOXED_MARK = ["IdentifyingMark", "HelpActionLabel", "BrandLabel", "BrandMark"];

const problems = [];

const copyFieldSource = await readFile(COPY_FIELD, "utf8");
const markKeys = [
  ...copyFieldSource.matchAll(/^\s{2}"?([A-Za-zÁÉÍÓÚÜÑáéíóúüñ /]+)"?:\s+\w+Icon,/gm),
].map((match) => match[1].replaceAll('"', ""));

if (markKeys.length === 0) {
  problems.push(`${COPY_FIELD}: no encontré claves en COPY_FIELD_MARKS.`);
}

const tokens = await readFile(TOKENS, "utf8");

if (!tokens.includes("--identifying-mark: 1.15em")) {
  problems.push(`${TOKENS}: falta --identifying-mark: 1.15em (ADR-047).`);
}

if (!tokens.includes("@utility identifying-mark")) {
  problems.push(`${TOKENS}: falta @utility identifying-mark.`);
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

  if (text.includes("size={16}")) {
    problems.push(
      `${file}: size={16} en un pictograma identificador. Va en IdentifyingMark (1.15 em).`,
    );
  }

  if (text.includes("1.15em") && !file.endsWith("identifying-mark.test.tsx")) {
    problems.push(
      `${file}: 1.15em suelto. El tamaño identificador es la clase identifying-mark.`,
    );
  }

  if (BOXED_ACTION.some((needle) => text.includes(needle))) {
    const marked = BOXED_MARK.some((mark) => text.includes(mark));

    if (!marked) {
      problems.push(`${file}: un botón con caja lleva marca antes del nombre (ADR-047).`);
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
    `1.15 em, sin packs. País, caminos, canales, contacto, drawer, botones y novedades llevan pictograma.`,
);
