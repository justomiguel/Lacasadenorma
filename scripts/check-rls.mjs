/**
 * `authenticated` ya no significa "alguien de confianza".
 *
 * Todas las policies de este proyecto se escribieron cuando tener sesión implicaba
 * ser una de las cinco personas que administran la campaña. Con el registro del
 * público abierto (ADR-027), `authenticated` pasa a significar **cualquiera con un
 * correo**, y una policy `to authenticated` sin predicado deja de ser una
 * comodidad para volverse un agujero.
 *
 * Las cuatro reglas que verifica este script ya estaban escritas en prosa, en
 * `specs/001-sitio-publico-campana/data-model.md` y en los comentarios de las
 * propias migraciones. La diferencia es que ahora una violación no compila: una
 * regla que sólo vive en un documento no frena nada (constitución § Restricciones
 * técnicas).
 *
 *   1. Una policy que alcanza a `authenticated` comprueba rol o propiedad.
 *   2. Ninguna policy usa `for all`.
 *   3. Toda función `security definer` fija `set search_path = ''`.
 *   4. Toda vista declara `security_invoker = true`.
 *
 * Las excepciones se declaran acá abajo, con su motivo, y no en la migración: una
 * migración ya aplicada no se edita. Agregar una entrada a esa lista es un diff
 * visible en un archivo de seguridad, que es exactamente la fricción que se busca.
 *
 * Corre en `npm run verify` y en `.github/workflows/db.yml`.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MIGRATIONS_DIR = "supabase/migrations";

/**
 * Policies que alcanzan a `authenticated` sin comprobar rol ni propiedad, y por
 * qué está bien en cada caso. Nada entra acá sin una razón que se sostenga sola.
 */
const ALLOWED_OPEN_POLICIES = new Map([
  [
    "fotos_select",
    "El bucket `fotos` es público: el archivo se sirve por URL sin sesión, así que " +
      "ocultar la fila no ocultaría nada y fingir lo contrario sería peor.",
  ],
  [
    "media_select_internal",
    "Mismo motivo: `media` describe archivos de un bucket público. La fila no dice " +
      "nada que el archivo no diga, y el `alt` es contenido publicado.",
  ],
  [
    "media_select_public",
    "Ídem para `anon`. Está en la lista porque la policy no lleva `to`, no porque " +
      "alcance a `authenticated`.",
  ],
  [
    "user_roles_read_by_auth_admin",
    "Alcanza sólo a `supabase_auth_admin`, que es el servidor de auth resolviendo el " +
      "rol para el hook del token. No es una identidad de aplicación.",
  ],
]);

/** Lo que cuenta como comprobar quién es quien consulta. */
const AUTHORIZATION_MARKERS = [
  /private\.has_min_role\s*\(/,
  /private\.can_read_ledger\s*\(/,
  /private\.can_read_donors\s*\(/,
  /auth\.uid\s*\(\s*\)/,
];

/** Quita comentarios de línea para no analizar SQL comentado. */
function withoutComments(sql) {
  return sql.replace(/--[^\n]*/g, "");
}

/** Las sentencias `create policy`, cada una hasta su punto y coma. */
function policyStatements(sql) {
  return [...sql.matchAll(/create\s+policy\s+([\w".]+)[\s\S]*?;/gi)].map((match) => ({
    name: match[1].replaceAll('"', ""),
    body: match[0],
  }));
}

/**
 * Los roles de la cláusula `to`. Sin cláusula, la policy alcanza a todos los roles,
 * que es lo mismo que alcanzar a `authenticated` y más callado.
 */
function policyRoles(body) {
  const match = /\bto\s+([\w\s,]+?)\s*(?:using|with\s+check)\b/i.exec(body);

  if (match === null) {
    return null;
  }

  return match[1]
    .split(",")
    .map((role) => role.trim().toLowerCase())
    .filter((role) => role.length > 0);
}

/**
 * Las cabeceras de función: desde `create function` hasta el `as $…$` que abre el
 * cuerpo. Todo lo que importa —`security definer`, `set search_path`— vive ahí, y
 * cortar antes del cuerpo evita pelear con el dollar quoting.
 */
function functionHeaders(sql) {
  return [
    ...sql.matchAll(
      /create\s+(?:or\s+replace\s+)?function\s+([\w".]+)\s*\(([\s\S]*?)\)([\s\S]*?)\bas\s+\$/gi,
    ),
  ].map((match) => ({
    name: match[1].replaceAll('"', ""),
    header: match[3],
  }));
}

function viewStatements(sql) {
  return [
    ...sql.matchAll(/create\s+(?:or\s+replace\s+)?view\s+([\w".]+)([\s\S]*?)\bas\b/gi),
  ].map((match) => ({
    name: match[1].replaceAll('"', ""),
    options: match[2],
  }));
}

const problems = [];

function report(file, subject, problem, consequence) {
  problems.push({ file, subject, problem, consequence });
}

const files = (await readdir(MIGRATIONS_DIR))
  .filter((name) => name.endsWith(".sql"))
  .sort();

for (const name of files) {
  const file = path.join(MIGRATIONS_DIR, name);
  const sql = withoutComments(await readFile(file, "utf8"));

  for (const policy of policyStatements(sql)) {
    // Regla 2: `for all` mezcla la condición de lectura con la de escritura, y una
    // de las dos queda sin revisar.
    if (/\bfor\s+all\b/i.test(policy.body)) {
      report(
        file,
        `policy ${policy.name}`,
        "usa `for all`",
        "Declarala por comando: `for all` esconde una de las dos condiciones.",
      );
    }

    // Regla 1: la que existe por ADR-027.
    const roles = policyRoles(policy.body);
    const reachesPublicAudience = roles === null || roles.includes("authenticated");
    const authorizes = AUTHORIZATION_MARKERS.some((marker) => marker.test(policy.body));

    if (reachesPublicAudience && !authorizes && !ALLOWED_OPEN_POLICIES.has(policy.name)) {
      report(
        file,
        `policy ${policy.name}`,
        roles === null
          ? "no tiene cláusula `to`, así que alcanza a todos los roles, y no comprueba rol ni propiedad"
          : "alcanza a `authenticated` y no comprueba rol ni propiedad",
        "Con el registro abierto, `authenticated` es cualquiera con un correo (ADR-027).\n" +
          "    Agregá `private.has_min_role(...)`, `private.can_read_ledger()`,\n" +
          "    `private.can_read_donors()` o un predicado sobre `auth.uid()`.\n" +
          "    Si la apertura es deliberada, declarala en ALLOWED_OPEN_POLICIES con su motivo.",
      );
    }
  }

  // Regla 3: sin `search_path` fijado, una función `security definer` resuelve
  // nombres en el esquema de quien la llama. Es lo que `db advisors` marca como
  // `function_search_path_mutable`, y el ejemplo de la documentación oficial de
  // Supabase lo omite (ADR-004).
  for (const fn of functionHeaders(sql)) {
    if (
      /\bsecurity\s+definer\b/i.test(fn.header) &&
      !/\bsearch_path\s*=/i.test(fn.header)
    ) {
      report(
        file,
        `función ${fn.name}`,
        "es `security definer` y no fija `set search_path`",
        "Agregá `set search_path = ''` y calificá cada nombre con su esquema.",
      );
    }
  }

  // Regla 4: las vistas de Postgres **bypasean RLS por defecto**. Una vista sin
  // esta opción sobre una tabla con datos personales los publica.
  for (const view of viewStatements(sql)) {
    if (!/security_invoker\s*=\s*true/i.test(view.options)) {
      report(
        file,
        `vista ${view.name}`,
        "no declara `security_invoker = true`",
        "Sin esa opción la vista corre con los privilegios de su dueño y sortea RLS.",
      );
    }
  }
}

if (problems.length > 0) {
  console.error("Reglas de acceso violadas en las migraciones:\n");

  for (const problem of problems) {
    console.error(`  ${problem.file}`);
    console.error(`    ${problem.subject} ${problem.problem}`);
    console.error(`    → ${problem.consequence}\n`);
  }

  console.error(
    `${problems.length} problema(s). Una policy que alcanza a \`authenticated\` sin predicado\n` +
      "no es una comodidad: es acceso para cualquiera que se registre en el sitio.",
  );
  process.exit(1);
}

const declared = ALLOWED_OPEN_POLICIES.size;

console.log(
  `Acceso verificado en ${files.length} migraciones: ` +
    `toda policy que alcanza a \`authenticated\` comprueba rol o propiedad ` +
    `(${declared} apertura(s) declarada(s)), ninguna usa \`for all\`, ` +
    "toda función `security definer` fija `search_path` y toda vista declara `security_invoker`.",
);
