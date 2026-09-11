import { defineConfig, devices } from "@playwright/test";

/**
 * Los nueve flujos críticos, en dos modos.
 *
 * La suite corre dos veces contra dos sitios distintos, y esa es la decisión de
 * diseño importante de este archivo:
 *
 * - **sin datos**: el sitio construido sin una sola credencial de Supabase. Es el
 *   estado de un clon nuevo del repositorio y el estado al que vuelve el sitio si
 *   un día se cae la base. Verifica FR-034 y SC-012: contenido editorial entero,
 *   ninguna cifra inventada, la ausencia explicada con palabras.
 * - **con datos**: el sitio contra la API local de `scripts/local-api.mjs`
 *   —PostgREST de verdad sobre el Postgres local, con el fixture cargado—. Es el
 *   único modo donde los flujos 3, 4, 5 y 7 tienen algo que afirmar: no se puede
 *   comprobar que el saldo cierra si no hay ningún gasto.
 *
 * No alcanza con levantar dos servidores del mismo build: Next reemplaza las
 * variables `NEXT_PUBLIC_*` por su valor **durante la construcción**, así que
 * "hay base" y "no hay base" son dos builds diferentes. `scripts/e2e.sh` es el
 * que construye cada uno con su entorno y después invoca esto; por eso el modo
 * llega en `E2E_MODO` y no se elige acá.
 *
 * El modo con datos también emite sesiones, y ahí conviene saber dónde cae el
 * límite. Lo sustituido es la superficie HTTP de GoTrue; la cadena que decide una
 * autorización es real: bcrypt contra `auth.users`, los claims que arma el
 * `custom_access_token_hook` de la migración invocado como `supabase_auth_admin`,
 * y un token firmado con el secreto que valida PostgREST, así que las policies RLS
 * deciden cada lectura y cada escritura del flujo 9 (`e2e/con-datos/publicar.spec.ts`).
 * Lo que el shim no puede afirmar está en `docs/testing.md` §2 y en el runbook.
 */

const MODO = process.env.E2E_MODO === "con-datos" ? "con-datos" : "sin-datos";

const PUERTO = Number(process.env.PORT ?? (MODO === "con-datos" ? 3211 : 3210));
const baseURL = `http://127.0.0.1:${String(PUERTO)}`;

const LOCAL_API_PORT = Number(process.env.LOCAL_API_PORT ?? 54321);

/** Las suites del otro modo. `comun/` corre en los dos. */
const OTRO_MODO = MODO === "con-datos" ? /e2e\/sin-datos\// : /e2e\/con-datos\//;

/**
 * El flujo del portapapeles sólo corre en Chromium: es el único navegador que
 * sabe conceder el permiso sin intervención. `testIgnore` de un proyecto reemplaza
 * al de la raíz en lugar de sumarse, así que la exclusión del otro modo se repite.
 */
const SIN_PORTAPAPELES = [OTRO_MODO, /portapapeles/];

/**
 * En modo con datos, además del sitio hay que levantar PostgREST. La base ya viene
 * migrada y con el fixture: eso lo hace `scripts/e2e.sh` antes, porque recrear un
 * esquema no es algo que deba pasar mientras Playwright cuenta los segundos de
 * arranque.
 *
 * Cuando la corrida entra por `scripts/e2e.sh` —o sea siempre, en CI—, la API ya está
 * levantada antes de acá: **el build la necesita**, porque las páginas estáticas se
 * prerenderizan leyendo la base. Esta declaración es para quien invoca
 * `npx playwright test` a mano, y por eso reusa la que encuentre en lugar de fallar.
 */
const servidores = [
  ...(MODO === "con-datos"
    ? [
        {
          command: "node scripts/local-api.mjs",
          // La comprobación pide una tabla real: que el puerto escuche no dice que
          // PostgREST ya haya leído el esquema.
          url: `http://127.0.0.1:${String(LOCAL_API_PORT)}/rest/v1/campaigns?select=id&limit=1`,
          // Éste sí se reusa: no depende del build, y quien esté desarrollando lo
          // tiene levantado con `npm run api:local`. Apunta a la misma base local
          // que acabó de migrar el script, así que reusarlo no cambia qué se lee.
          reuseExistingServer: true,
          timeout: 60_000,
          stdout: "pipe" as const,
          stderr: "pipe" as const,
        },
      ]
    : []),
  {
    // Siempre el servidor de producción, nunca `next dev`, y en los dos entornos
    // igual: `next dev` volvería a leer `.env.local`, que en una máquina de
    // desarrollo tiene la base configurada, y el modo sin datos dejaría de
    // probar lo único que existe para probar.
    command: `npx next start --port ${String(PUERTO)}`,
    url: baseURL,
    // El build lo hizo `scripts/e2e.sh` con el entorno de este modo. Reusar un
    // servidor que ya estaba escuchando sería reusar el build anterior.
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
  },
];

export default defineConfig({
  testDir: "./e2e",
  testIgnore: OTRO_MODO,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Un solo worker en CI: los proyectos comparten un único servidor, y correr en
  // paralelo hace que los tiempos de carga midan la contención de la máquina.
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: { baseURL, trace: "on-first-retry", screenshot: "only-on-failure" },
  projects: [
    {
      name: "escritorio",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
    {
      name: "movil",
      use: { ...devices["iPhone 15"] },
      testIgnore: SIN_PORTAPAPELES,
    },
    {
      name: "safari",
      use: { ...devices["Desktop Safari"] },
      testIgnore: SIN_PORTAPAPELES,
    },
  ],
  webServer: servidores,
});
