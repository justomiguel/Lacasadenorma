# Investigación: toolchain JS/TS verificado

**Fecha de verificación:** 2026-09-09 · **Entorno:** Ubuntu 24.04, Node v22.14.0, npm 10.9.7

Todo lo de este documento se comprobó ejecutándolo (scaffolding real, build real, lint real), no
se tomó de documentación ni de conocimiento previo. Es la fuente de verdad para las versiones del
proyecto.

---

## 1. Las versiones `latest` son mutuamente incompatibles

| Paquete | `latest` en npm | Resultado real |
|---|---|---|
| `typescript` | 7.0.2 | TS 7 es el port nativo en Go. **No expone la API de compilador en JS**: `exports["."]` es sólo `./lib/version.cjs`. `typescript-eslint@8.70.0` declara peer `typescript: ">=4.8.4 <6.1.0"` y aborta: `Error: typescript-eslint does not support TS 7.0.` |
| `eslint` | 10.10.0 | `eslint-plugin-react@7.37.5` topea en `^9.7`; `eslint-plugin-import` y `eslint-plugin-jsx-a11y` topean en `^9`. Como `eslint-config-next` depende de los tres, el lint muere: `TypeError: contextOrFilename.getFilename is not a function` |

`create-next-app@16.3.4` genera deliberadamente `typescript: "^5"` y `eslint: "^9"`, no toma
`latest`. Eso confirma la lectura.

**Regla del proyecto:** antes de fijar una dependencia se verifican sus `peerDependencies`. El tag
`latest` no es una recomendación de compatibilidad.

### Esto ya pasó, y así se vio

El 12 de septiembre de 2026 se aceptaron los pull requests **#3** (`typescript` 7.0.2) y **#4**
(`eslint` 10.10.0) y se mergearon a `main`. Las dos filas de la tabla de arriba se cumplieron, y el
modo de falla fue peor que un error de instalación:

1. `npm ci` **terminó bien**, con «found 0 vulnerabilities». No hubo ninguna señal ahí.
2. Pero `typescript-eslint@8.70.0` se volvió insatisfacible, así que npm lo **sacó del árbol**: dejó de
   estar en `node_modules` y desapareció del `package-lock.json`.
3. `eslint.config.ts` lo importa por nombre, así que se cayeron **las dos** compuertas a la vez:
   `npm run typecheck` con `eslint.config.ts(4,22): error TS2307: Cannot find module
   'typescript-eslint'`, y `npm run lint` con una excepción al cargar la config.

Es decir: la dependencia que faltaba no era una que el código usara en tiempo de ejecución, era la que
sostiene el linter, y el síntoma no apareció hasta correr las tareas. CI lo marcó —`CI`, `Calidad` y
`E2E` en rojo en `main`—, pero recién después del merge.

Dos cosas cambiaron por esto:

- **`typescript-eslint` pasa a estar declarado en `package.json`.** La línea de más abajo dice «no
  duplicar» lo que ya trae `eslint-config-next`, y sigue valiendo para los *plugins* y las *configs*:
  no se declaran `eslint-plugin-react` ni `jsx-a11y` ni `import`. Pero `typescript-eslint` no se usa
  por herencia de la config: se **importa por nombre** en `eslint.config.ts`, y un paquete que se
  importa se declara. Se fija en la misma 8.70.0 que ya resolvía, así que no hay copia nueva: una sola
  entrada en el lock y un solo directorio en `node_modules`, verificado.
- **Dependabot deja de proponer las mayores de `typescript` y de `eslint`**, con la razón escrita en
  `.github/dependabot.yml`. El acuerdo de ese archivo ya decía que una mayor de ESLint «es una
  decisión», pero estaba en un comentario, y un comentario no frena un merge.

## 2. Versiones elegidas

```
next 16.3.4 · react 19.3.0 · react-dom 19.3.0
typescript 6.0.3        (última con API de compilador en JS; satisface el techo <6.1.0 de typescript-eslint)
eslint 9.39.5           (npm marca deprecado; es cosmético, no hay alternativa compatible)
eslint-config-next 16.3.4   (ya trae jsx-a11y, react, react-hooks, import, typescript-eslint 8: no duplicar)
tailwindcss 4.3.3 + @tailwindcss/postcss
vitest 5.0.0 + @vitejs/plugin-react 6 (requiere Vite 8)
@testing-library/react 16.3.3 · jest-dom 7.0.1 · user-event 14.6.7 · jsdom 30
@playwright/test 1.63.0 · @axe-core/playwright 4.13.0
zod 4.6.0 · @supabase/supabase-js 2.116.0 · @supabase/ssr 0.12.7
@types/node ^24   (Vitest 5 pide ^22 || >=24; el scaffold genera ^20)
```

Node mínimo: 20.9.0 (`engines` de next). Se usa 22+.

## 3. Trampas de Next.js 16 (para quien viene de Next 14/15)

Next 16 instala su propia documentación en `node_modules/next/dist/docs/` (~200 archivos md) y
genera un `AGENTS.md` que advierte explícitamente: *"This is NOT the Next.js you know"*. Ese
bloque lo reescribe `next dev` en cada ejecución.

1. **`params` y `searchParams` son Promises.** El shim de compatibilidad de Next 15 se eliminó.
   Igual `cookies()`, `headers()`, `draftMode()`. Nuevos en 16: `params` e `id` en
   `opengraph-image`/`twitter-image`/`icon`, e `id` en `sitemap`.
2. **`PageProps` / `LayoutProps` / `RouteContext` son globales generados**, no imports. Viven en
   `.next/types/routes.d.ts`, que está en `.gitignore`. **Hay que correr `next typegen` antes de
   `tsc --noEmit` y antes de `eslint`**, o falla con `TS2304: Cannot find name 'LayoutProps'`.
3. **`middleware.ts` → `proxy.ts`**, y la función exportada pasa a llamarse `proxy`. Corre sólo en
   runtime Node (no configurable). Tener los dos archivos rompe el build.
   `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.
4. **`next lint` fue eliminado y `next build` ya no linea.** Se usa `eslint` directo.
5. **`next build` ahora typechequea el proyecto completo, incluidos los tests**
   (`experimental.useTypeScriptCli` por defecto en 16.3). Un error en un `.test.tsx` rompe el
   build de producción.
6. **`revalidateTag` requiere segundo argumento**: `revalidateTag('tag', 'max')`. Nuevos:
   `updateTag(tag)` y `refresh()`. `cacheLife`/`cacheTag` perdieron el prefijo `unstable_`.
7. **`cacheComponents: true`** reemplaza a `experimental.dynamicIO`, `experimental.useCache`,
   `experimental.ppr` y `experimental_ppr`. Con esa flag encendida, leer datos de request fuera de
   `<Suspense>` es **error de build**. Se decidió no habilitarla (ver ADR-011).
8. **Turbopack es el default en `dev` y en `build`.** Un `webpack` config custom rompe el build
   (escape: `next build --webpack`). `experimental.turbopack` pasó a top-level `turbopack`.
9. **`next dev` y `next build` usan directorios distintos** (`.next/dev` vs `.next`). Consecuencia:
   `process.argv.includes('dev')` ya no funciona en `next.config`.
10. **El output del build ya no reporta tamaños de bundle** (`size`, `First Load JS` se quitaron
    por imprecisos en RSC). No se puede assertar sobre ellos en CI; hay que usar Lighthouse.
11. **Defaults de `next/image` más estrictos:** `qualities` default `[75]` y un `quality` fuera de
    la lista **se ajusta silenciosamente** al más cercano; `minimumCacheTTL` pasó de 60s a 4h;
    `16` salió de `imageSizes`; `maximumRedirects` es 3. `images.domains` está deprecado.
12. **Rutas paralelas requieren `default.js` explícito** en cada slot o el build falla.
13. **Eliminados:** AMP, `serverRuntimeConfig`/`publicRuntimeConfig`/`getConfig()`,
    `unstable_rootParams`, `devIndicators.appIsrStatus`.
14. **Next ya no sobrescribe `scroll-behavior`** durante la navegación. Si se define
    `scroll-behavior: smooth` global, hay que agregar `data-scroll-behavior="smooth"` al `<html>`.

Sin cambios respecto de lo esperado: `next/font/google` y `next/font/local`, `metadata` /
`generateMetadata`, los exports `viewport` / `generateViewport`, y los Route Handlers.

## 4. Trampas de TypeScript 6/7

Opciones **eliminadas** (error duro en TS 7, deprecación escapable en TS 6):

```
target=ES5 · moduleResolution=node10 · downlevelIteration · baseUrl
moduleResolution=classic · module=amd/umd/systemjs/none · esModuleInterop=false
```

`baseUrl` se reemplaza por `paths` relativos a la raíz del proyecto. Defaults cambiados:
`strict` es `true`, `module` es `esnext`, y **`types` ahora es `[]` por defecto** — hay que
declarar `"types": ["node"]` explícitamente. `moduleResolution: "bundler"` es soportado y
recomendado. `ignoreDeprecations: "6.0"` **no** rescata las opciones eliminadas.

Truco de velocidad usado en el proyecto: `typescript` fijo en 6.0.3 (para que
`typescript-eslint` y el editor funcionen) más un alias `tsgo: npm:typescript@^7.0.2` invocado por
ruta explícita en el script de typecheck. Medido: **0,32 s contra 1,90 s** en un proyecto chico.
El alias `@typescript/native` que aparece en el blog de TS **no es un paquete real** (404 en el
registry), es sólo una etiqueta de ejemplo.

## 5. Tailwind 4.3: configuración CSS-first

- `@import "tailwindcss"` reemplaza a `@tailwind base/components/utilities`.
- **`tailwind.config.js` ya no se descubre automáticamente**; requiere `@config "../ruta.js"`.
- Los tokens se declaran en `@theme` y *son* la API: `--color-ink-muted` genera `text-ink-muted`,
  `bg-ink-muted`, `border-ink-muted`. Además quedan disponibles como custom properties CSS.
- Prefijos con significado: `--color-*`, `--spacing-*`, `--text-*`, `--font-*`, `--ease-*`,
  `--radius-*`, `--shadow-*`, `--breakpoint-*`.
- Modificadores compuestos en un solo token: `--text-display--line-height`,
  `--text-display--letter-spacing`, `--text-display--font-weight`.
- `darkMode: 'class'` se expresa como `@custom-variant dark (&:where(.dark, .dark *))`.
- `@utility nombre { ... }` define utilidades propias.
- `oklch()` se convierte automáticamente a hex con upgrade por `@supports`.
- En Next se usa `@tailwindcss/postcss`, **no** `@tailwindcss/vite`.
- `@theme inline` resuelve las referencias en el valor emitido; `@theme` plano es lo normal.

## 6. ESLint 9 flat config

- `eslint.config.ts` se carga nativamente en 9.39.
- Los subpaths `eslint-config-next/core-web-vitals` y `eslint-config-next/typescript` exportan
  arrays y se esparcen. La forma `extends: ["next/core-web-vitals"]` ya no existe.
- `typescript-eslint` está en major **8** (8.70.0), no 9 ni 10. `eslint-config-next` ya lo trae.
- Para lint con tipos: `parserOptions.projectService: true` (reemplaza a `project: './tsconfig.json'`).
- **`@typescript-eslint/require-await` hay que apagarlo**: Next exige `async` en funciones que no
  hacen `await` (Server Actions, `generateStaticParams`, funciones con `"use cache"`, y
  `headers()` en `next.config.ts`). Con `recommendedTypeChecked` produce errores en código
  idiomático.
- `eslint-config-prettier/flat` va último.

## 7. Vitest 5

- **`vitest.workspace.ts` ya no existe**; es `test.projects` inline en la config.
- Usar extensión **`.mts`** si el `package.json` no es `"type": "module"`, o Vite avisa que el
  loader nativo no soportará ESM en CJS.
- **`vite-tsconfig-paths` es obsoleto**: `resolve.tsconfigPaths: true` es nativo en Vite 8.
- `@vitejs/plugin-react@6` requiere Vite 8.
- `import "@testing-library/jest-dom/vitest"` (subpath `/vitest`).
- Hay que excluir `e2e/**` o Vitest intenta correr los specs de Playwright.
- **RTL no puede renderizar un Server Component async.** Se lo invoca como función y se renderiza
  el elemento resuelto: `render(await Componente())`. Eso no ejercita la frontera RSC; eso va a
  Playwright.

## 8. Playwright 1.63 en CI

`npx playwright install --with-deps` sigue siendo correcto. Si se cachea
`~/.cache/ms-playwright`, en cache hit hay que correr igual `playwright install-deps` (las libs de
apt no están en ese directorio). Imagen oficial alternativa:
`mcr.microsoft.com/playwright:v1.63.0-noble`.

## 9. Suite verificada

En `/tmp/probe-final` (Next 16.3.4 + React 19.3 + TS 6.0.3/7.0.2 + ESLint 9.39.5 + Tailwind 4.3.3
+ Vitest 5 + Playwright 1.63, con Server Action, Route Handler, `proxy.ts` y cliente Supabase):

```
typecheck    PASS      lint        PASS      format:check  PASS
test:coverage PASS     build       PASS      e2e           PASS
```
