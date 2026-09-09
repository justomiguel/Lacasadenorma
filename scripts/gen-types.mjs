/**
 * Genera los tipos de TypeScript de la base sin Docker.
 *
 * `supabase gen types --local` levanta la plataforma entera en contenedores, que
 * en este entorno no existen (ADR-013). Este script usa la misma librería que el
 * CLI por debajo —`@supabase/postgrest-typegen`, extraída de postgres-meta— sobre
 * una conexión directa. La salida es la misma que produciría el CLI.
 *
 * Uso:
 *   DATABASE_URL=... node scripts/gen-types.mjs <archivo> [--check]
 *
 * Con `--check` no escribe: falla si el archivo del repositorio no coincide con
 * el esquema de la base. Es la compuerta de CI que detecta una migración aplicada
 * sin regenerar los tipos, que si no se descubre recién en el build siguiente.
 */

import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

import { introspect } from "@supabase/postgrest-typegen/introspection";
import {
  generateTypescript,
  sortGeneratorMetadata,
} from "@supabase/postgrest-typegen/generation";
import pg from "pg";

const HEADER = `/**
 * Generado por scripts/gen-types.mjs a partir de las migraciones. No editar a
 * mano: \`npm run db:types\` lo reescribe, y CI verifica que coincida con el
 * esquema (\`npm run db:verify\`).
 */

`;

const [outFile, flag] = process.argv.slice(2);

if (outFile === undefined) {
  console.error(
    "Falta el archivo de salida: node scripts/gen-types.mjs <archivo> [--check]",
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

let generated;

try {
  // `private` queda fuera a propósito: sus funciones son la frontera de
  // autorización y no deben ser invocables desde el cliente tipado.
  const metadata = await introspect(client, { includedSchemas: ["public"] });

  generated =
    HEADER +
    (await generateTypescript(sortGeneratorMetadata(metadata), {
      postgrestVersion: "13",
      detectOneToOneRelationships: true,
    }));
} finally {
  await client.end();
}

if (flag === "--check") {
  const current = await readFile(outFile, "utf8").catch(() => null);

  if (current === null) {
    console.error(`No existe ${outFile}. Corré \`npm run db:types\`.`);
    process.exit(1);
  }

  if (current !== generated) {
    console.error(
      `${outFile} no coincide con el esquema de la base. Corré \`npm run db:types\` y commiteá el resultado.`,
    );
    process.exit(1);
  }

  console.log(`${outFile} está al día.`);
} else {
  await writeFile(outFile, generated, "utf8");
  console.log(`Escrito ${outFile}.`);
}
