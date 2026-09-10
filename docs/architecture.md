# Arquitectura

Cómo está organizado el código, por qué está organizado así, y cuál es el recorrido real de un pedido
y de una mutación, archivo por archivo.

El principio que ordena todo el resto: **las dependencias van en una sola dirección, y la última
frontera está en la base de datos**. Lo primero lo impone ESLint y rompe el build. Lo segundo importa
más de lo que parece: cada comprobación de permiso que hay en TypeScript existe para producir un
mensaje en castellano, no para proteger un dato. Si todas fallaran a la vez, la operación seguiría
siendo rechazada por una policy RLS. Es la única capa que no se puede saltear olvidándose de llamarla.

---

## 1. Las cinco capas

```
┌─ presentación ──────────────────────────────────────────────────────────┐
│  app/  components/          Server Components por defecto               │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ llama casos de uso
┌────────────────────────────▼────────────────────────────────────────────┐
│  src/application/           casos de uso, operaciones del backoffice,    │
│                             capacidades para agentes                    │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ depende de puertos
┌────────────────────────────▼────────────────────────────────────────────┐
│  src/domain/                TypeScript puro: dinero, porcentajes,        │
│                             permisos, entidades, puertos                │
└────────────────────────────▲────────────────────────────────────────────┘
                             │ implementa puertos
┌────────────────────────────┴────────────────────────────────────────────┐
│  src/infrastructure/        Supabase, auth, logging, SEO, archivos,      │
│                             límite de tasa, analítica                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────────┐
│  content/  supabase/        JSON versionado y migraciones SQL            │
└─────────────────────────────────────────────────────────────────────────┘
```

La flecha de infraestructura apunta **hacia arriba, al dominio**, y no al revés. Es lo que hace que el
dominio se pueda probar sin base de datos, sin red y sin navegador: 102 de los 319 tests corren sobre
`src/domain/` y ninguno necesita más que Node.

| Capa | Dónde | Qué contiene | Qué **no** puede importar |
| --- | --- | --- | --- |
| Presentación | `app/`, `components/` | Rutas, componentes, formularios, metadata | `src/infrastructure/supabase/*` |
| Aplicación | `src/application/` | Casos de uso, operaciones del backoffice, capacidades para agentes | `src/infrastructure/*`, `app/*`, `components/*` |
| Dominio | `src/domain/` | Dinero, porcentajes, progreso, transparencia, permisos, Markdown restringido, entidades, puertos | React, Next, Supabase, y las tres capas de arriba |
| Infraestructura | `src/infrastructure/` | Los adaptadores: Supabase, sesión, logger, SEO, archivos, límite de tasa | — |
| Persistencia | `content/`, `supabase/` | JSON validado con Zod, migraciones, policies, pruebas pgTAP | — |

### La regla es una regla de linter, no una convención

`eslint.config.ts` declara cuatro bloques de `no-restricted-imports`, uno por frontera, cada uno con
su mensaje:

| Archivos | Patrones prohibidos | Mensaje |
| --- | --- | --- |
| `src/domain/**/*.ts` | `react`, `react-dom`, `next`, `next/*`, `@supabase/*`, `@/app/*`, `@/components/*`, `@/src/infrastructure/*`, `@/src/application/*` | `domain/ no puede depender de UI, framework ni infraestructura (ADR-005).` |
| `src/application/**/*.ts` | `@/src/infrastructure/*`, `@/app/*`, `@/components/*` | `application/ depende de puertos de domain, no de infrastructure ni de UI (ADR-005).` |
| `src/application/**/*.{test,spec}.ts` | `@/src/infrastructure/*`, `@/components/*` | el mismo |
| `components/**/*.{ts,tsx}` | `@/src/infrastructure/supabase/*` | `Los componentes no acceden a la base de datos: usan casos de uso (ADR-005).` |

La tercera fila es la única excepción de todo el archivo y está comentada donde se declara: los tests
de `src/application/` **sí** pueden importar un adaptador de `app/`. El motivo es que la prueba de
equivalencia entre la ruta REST y el caso de uso tiene que sostener las dos puntas a la vez, y esa
prueba es la única verificación posible de la amenaza A5 —que el camino del agente y el de la persona
se separen sin que nadie lo note—. El código de producción de la capa mantiene la frontera completa,
que es donde una dependencia invertida hace daño.

Además, tres reglas que no son de capas y son igual de estructurales: `no-console` (salvo `warn` y
`error`), `no-empty` sin excepción para `catch`, y `@typescript-eslint/no-explicit-any`. Las tres
sirven al principio XII: ningún fallo silencioso.

---

## 2. TypeScript en estricto, y cuatro banderas más

`tsconfig.json` no se conforma con `strict: true`. Las que cambian cómo se escribe el código:

| Bandera | Qué cambia en la práctica |
| --- | --- |
| `noUncheckedIndexedAccess` | `array[0]` es `T \| undefined`. Obliga a decidir qué pasa con la lista vacía, que en este proyecto es un estado frecuente y diseñado |
| `exactOptionalPropertyTypes` | `{ a?: string }` no acepta `{ a: undefined }`. Por eso hay tantos `...(x === undefined ? {} : { x })` en la metadata y en los mappers: es deliberado |
| `noUnusedLocals` / `noUnusedParameters` | El código muerto no compila. Es lo que hizo visible que `PersonRepository` no tenía implementación |
| `verbatimModuleSyntax` | Los imports de tipo se escriben `import type`, y el linter los normaliza a la forma inline |

`npm run typecheck` corre `next typegen` antes de `tsc`. No es opcional: `PageProps` y `LayoutProps`
son tipos globales generados a partir de las rutas, y sin generarlos el typecheck falla en cada
página.

---

## 3. Los patrones que se usan, y dónde

Cinco, y cada uno resuelve un problema que se puede nombrar. No hay más
([ADR-005](./adr/005-arquitectura-capas.md)).

### Puertos y adaptadores

Los puertos viven en `src/domain/ports/`: `repositories.ts` (lectura pública), `admin.ts` (el
backoffice completo), `logger.ts` y `analytics.ts`. Los adaptadores viven en `src/infrastructure/`.

El puerto de lectura pública tiene una particularidad que vale más que su forma: **no existe ningún
método que devuelva el detalle de aportes**. `TransparencyRepository` ofrece `listReceivedTotals()`,
que devuelve totales por moneda ya agregados por una vista de la base. La ausencia es la garantía —un
aporte individual puede identificar a una persona (FR-014, amenaza I2)—, y está más arriba en la
cadena que cualquier comprobación: no se puede olvidar de filtrar lo que no se puede pedir.

Lo mismo con los borradores: los métodos se llaman `listPublishedMilestones`,
`findPublishedUpdateBySlug`, `listPublishedMethods`. No hay una bandera `incluirBorradores` que
alguien pueda pasar en `true` desde una página pública.

### Repositorio

Un objeto por agregado, implementado como literal dentro de `createSupabaseRepositories(client)` en
`src/infrastructure/supabase/repositories.ts`, y el mapeo de filas a entidades aislado en
`mappers.ts`. Los tests usan `src/application/test-support/fake-data-layer.ts` y
`fake-admin-gateway.ts`, que implementan los mismos puertos en memoria.

### Composition root

Dos, y sólo dos lugares donde se decide qué implementación se usa:

```ts
// src/infrastructure/data-layer.ts
export function getPublicDataLayer(): DataLayer {
  const client = createAnonSupabaseClient();

  if (client === null) {
    return { source: "content-only" };
  }

  return { source: "supabase", ...createSupabaseRepositories(client) };
}
```

El del backoffice es `getAdminDeps()` en `src/infrastructure/admin/context.ts`, que arma
`{ gateway, logger, actor }` con la sesión ya verificada.

No hay contenedor de inyección de dependencias. Con dos raíces y dependencias explícitas por
parámetro, un contenedor agregaría una capa de indirección y una forma nueva de que algo falle en
tiempo de ejecución en lugar de en compilación.

### Unión discriminada como resultado

Cuatro uniones sostienen el manejo de estados esperados, y ninguna usa excepciones para eso:

| Tipo | Dónde | Estados |
| --- | --- | --- |
| `DataLayer` | `src/application/data-layer.ts` | `supabase` \| `content-only` |
| `DataResult<T>` | `src/application/result.ts` | `ok` \| `unavailable` con razón `not-configured` \| `error` \| `not-published` |
| `AdminResult<T>` | `src/application/admin/core.ts` | `ok` \| `invalid` con errores por campo \| `rejected` \| `failed` |
| `AdminScope` | `src/infrastructure/admin/context.ts` | con base configurada \| sin base |

`DataResult` es el que más se nota en la interfaz. Sus tres razones de indisponibilidad se ven
distintas en pantalla porque son tres cosas distintas para quien mira, y confundirlas sería mentir:

```ts
export const UNAVAILABLE_MESSAGES: Record<UnavailableReason, string> = {
  "not-configured":
    "Esta parte del sitio todavía no está conectada a los datos de la campaña. En cuanto lo esté, aparece acá.",
  error:
    "No pudimos leer estos datos en este momento. Volvé a intentar en un rato: el problema es nuestro, no tuyo.",
  "not-published": "La campaña todavía no está publicada.",
};
```

`src/domain/errors.ts` tiene exactamente dos errores —`DomainError` y `NotAuthorizedError`— y se usan
para lo que sí es excepcional. Un dato que no está no es excepcional en este sitio: es un estado de
producto con su propio diseño.

### Objeto de valor

`Money<C>` en `src/domain/money.ts` es un entero en unidad mínima con su moneda en el tipo. No hay
`float` en ningún lado y no hay forma de sumar pesos con dólares sin que el compilador lo rechace:
`addMoney` exige la misma `C` en los dos operandos. `percentage()` clampea a `[0, 100]` y devuelve
`null` cuando no hay denominador, para que nunca se publique un "0 %" que en realidad significa "no
sabemos".

### Registro

`src/application/agent-capabilities/registry.ts` guarda las cinco capacidades y expone
`findCapability(name)` y `runCapability(name, rawInput, context)`. Existe porque hay cuatro
consumidores del mismo conjunto —la interfaz, la ruta REST, WebMCP y un eventual servidor MCP— y una
lista central es la forma de que no puedan divergir. Está en
[`docs/webmcp.md`](./webmcp.md).

### Lo que no hay, a propósito

Sin contenedor de DI, sin CQRS, sin event sourcing, sin fábricas, sin una clase por estrategia de
método de pago. Los métodos de aporte se distinguen por `PaymentMethodKind` y comparten un contrato de
renderizado; tres países no justifican una jerarquía. Y no hay repositorios de contenido: cuando no
hay base configurada, la capa de datos devuelve `{ source: "content-only" }` **sin repositorios**, en
lugar de repositorios falsos que devuelven listas vacías. La diferencia importa porque una lista vacía
y una base ausente se tienen que explicar distinto en pantalla.

---

## 4. El recorrido de un pedido: la home

`app/page.tsx` es un Server Component asíncrono. En orden:

| # | Qué pasa | Dónde |
| --- | --- | --- |
| 1 | `HomePage()` empieza a renderizar | `app/page.tsx` |
| 2 | `getPublicDataLayer()` | `src/infrastructure/data-layer.ts` |
| 3 | `createAnonSupabaseClient()` → `readSupabaseConfig()` | `src/infrastructure/supabase/server-client.ts`, `config.ts` |
| 4 | Sin configuración devuelve `{ source: "content-only" }` y no hay consulta | `data-layer.ts` |
| 5 | Con configuración, `createSupabaseRepositories(client)` | `src/infrastructure/supabase/repositories.ts` |
| 6 | `getCampaignOverview({ dataLayer, logger })` | `src/application/use-cases/get-campaign-overview.ts` |
| 7 | Sin base → `unavailable("not-configured")`; sin campaña publicada → `unavailable("not-published")` | mismo |
| 8 | `Promise.all` de cuatro lecturas: rubros, totales recibidos, gastos publicados, hitos publicados | repositorios |
| 9 | `summarizeFundraising`, `summarizeMilestones`, `summarizeTransparency` | `src/domain/progress.ts`, `transparency.ts` |
| 10 | `ok({ campaign, fundraising, milestones, budgetItems, transparency })` | `src/application/result.ts` |
| 11 | Si algo lanza: `logger.error("No se pudo leer el estado de la campaña")` → `unavailable("error")` | mismo |
| 12 | En paralelo, `getDonationMethods({ dataLayer, logger })` | `src/application/use-cases/get-donation-methods.ts` |
| 13 | La página elige entre los componentes de datos y `<Unavailable reason=… />` | `app/page.tsx` |

Tres cosas de este recorrido que son decisiones y no accidentes:

- **La agregación la hace el dominio, no la base ni el componente.** `summarizeTransparency` recibe
  totales, gastos y objetivo, y devuelve el saldo, el porcentaje ejecutado y el desglose por
  categoría. Es una función pura, y por eso el test que verifica que el saldo cierra no necesita
  PostgreSQL.
- **Los errores no se propagan hacia arriba.** El caso de uso los registra con contexto y devuelve
  `unavailable("error")`. La página no tiene un `try/catch`: tiene una rama.
- **`revalidate = 300`.** Cinco minutos de atraso máximo para las cifras, y las acciones del
  backoffice invalidan las rutas al publicar ([ADR-017](./adr/017-revalidacion.md)). En la práctica el
  dato aparece al instante; el ISR es el piso para lo que cambie fuera del backoffice.

---

## 5. El recorrido de una mutación: publicar una novedad

Desde el botón hasta la base, con la ruta pública invalidada al final:

| # | Qué pasa | Dónde |
| --- | --- | --- |
| 1 | `setUpdatePublishedAction(_state, formData)`, una Server Action | `app/admin/(panel)/novedades/actions.ts` |
| 2 | `getAdminDeps()` | `src/infrastructure/admin/context.ts` |
| 3 | `getAdminGateway()` → `createServerSupabaseClient()` → `createAdminGateway(client)` | `src/infrastructure/supabase/admin-repositories.ts` |
| 4 | `readViewer()` → `client.auth.getClaims()` → rol desde `app_metadata.user_role` | `src/infrastructure/auth/viewer.ts` |
| 5 | `setUpdatePublished(deps, Object.fromEntries(formData))` | `src/application/admin/updates.ts` |
| 6 | `perform({ permission: "contenido.escribir", schema: publishSchema, … })` | `src/application/admin/core.ts` |
| 7 | `actor === null` → `rejected` con `"Tu sesión venció. Volvé a entrar."` | mismo |
| 8 | `can(actor.role, "contenido.escribir")` → `rejected` con `"Tu rol no permite hacer esto."` | `src/domain/permissions.ts` |
| 9 | `publishSchema.safeParse(input)` → `invalid` con errores por campo | `updates.ts` |
| 10 | `gateway.updates.setUpdatePublished({ id, publishedAt })` | `admin-repositories.ts` |
| 11 | `gateway.audit.append({ action, entityTable, entityId, diff })` | `admin-repositories.ts` |
| 12 | `ok` con mensaje para la pantalla | `core.ts` |
| 13 | `revalidatePath("/admin/novedades")` y `revalidatePublicUpdates(slug)`: `/`, `/novedades`, `/novedades/<slug>`, `/sitemap.xml` | `actions.ts` |

`perform()` es la forma común de las quince operaciones del backoffice, y concentra tres
decisiones:

1. **El resultado es un valor, no una excepción.** Las cuatro formas de terminar —salió bien, el dato
   está mal, no tenés permiso, algo se rompió— son distintas para quien apretó el botón, y la unión
   obliga al formulario a decir algo en cada caso.
2. **El actor sale de la sesión verificada, nunca del formulario.** `Actor` es nullable a propósito:
   "no hay sesión" es un estado que el tipo obliga a manejar, y es exactamente el caso de una Server
   Action invocada por su ID sin cookie (amenaza T7).
3. **Si la auditoría falla, la operación falla entera.** Un cambio sin rastro es peor que un cambio
   que no se hizo (FR-016).

Y una que no está en `perform()` y conviene saber: **RLS es la frontera real**. Los pasos 8 y 9
producen mensajes; el paso 10 se ejecuta con el cliente de la sesión de esa persona, y si la policy
dice que no, la base rechaza el `update` aunque todo lo anterior se hubiera equivocado.

---

## 6. Los dos modos del sitio

No son dos configuraciones: son dos formas de estar desplegado, y las dos son correctas.

| | Con Supabase configurado | Sin configuración |
| --- | --- | --- |
| `getPublicDataLayer()` | `{ source: "supabase", …repositorios }` | `{ source: "content-only" }` |
| Contenido editorial | Se sirve | Se sirve igual |
| Cifras, gastos, hitos, cuentas | Se leen de la base | Se omiten con una explicación |
| `/api/public/*` | 200 con datos | 503, nunca 200 con ceros |
| `/api/public/norma-story` | 200 | 200: la historia no depende de la base |
| `/api/health` | `"dataSource": "supabase"` | `"dataSource": "content-only"` |
| `/admin` | Funciona | Explica que falta configuración |

Esto es FR-034 y SC-012, y hay una suite de Playwright entera dedicada a verificarlo
(`e2e/sin-datos/`). No es un modo degradado que se tolera: es el estado de cualquier clon nuevo del
repositorio, y la única forma de que otra persona pueda levantar el proyecto y verlo funcionando sin
pedirle credenciales a nadie.

Hay una consecuencia operativa que se descubre tarde si no está escrita: **`NEXT_PUBLIC_*` se
reemplaza por su valor al construir**, así que "el sitio con base" y "el sitio sin base" son dos
builds distintos, no dos arranques del mismo. Por eso `scripts/e2e.sh` construye una vez por modo, y
por eso deja una huella en `.next/e2e-modo` para que reusar un build no sea a ciegas. Está en
[`docs/testing.md`](./testing.md#5-los-dos-modos-y-por-qué-son-dos-builds).

---

## 7. Contenido: dos orígenes, elegidos por frecuencia de cambio

[ADR-007](./adr/007-arquitectura-contenido.md) parte el contenido en dos según cada cuánto cambia, no
según de qué habla:

| | `content/*.json` | Base de datos |
| --- | --- | --- |
| Qué | La historia, qué pasó, el alcance de la obra, las preguntas frecuentes, los textos legales | Cifras, gastos, hitos, cuentas, novedades, fotos |
| Cada cuánto cambia | Meses | Días |
| Quién lo edita | Un pull request | El backoffice, desde un teléfono |
| Cuándo se valida | Al importar el módulo, o sea al construir | Al guardar, con Zod, y otra vez con constraints de la base |
| Qué pasa si está mal | El build falla con el archivo y el campo | El formulario marca el campo |

La validación al importar es la parte que hace que esto funcione: `content/index.ts` llama
`parseContent(schema, data, fileName)` sobre cada archivo, y un campo faltante rompe el build con el
nombre del archivo y el nombre del campo. Nunca aparece una página a medias en producción.

No hay CMS. Diez archivos JSON y un esquema de Zod cubren el contenido que cambia cada meses, y el que
cambia seguido ya tiene un backoffice. Está en [`docs/content-guide.md`](./content-guide.md).

---

## 8. Un caso de uso, cuatro puertas

Las cinco capacidades de lectura se declaran una vez y se consumen desde cuatro lados. Es lo que hace
verificable la promesa de que un agente y una persona ven lo mismo (FR-032, amenaza A5):

```
                        ┌─ app/(páginas)         Server Components
capacidad declarada ────┼─ app/api/public/[…]    ruta REST, con límite de tasa
en el registro          ├─ components/site/webmcp.tsx   herramientas WebMCP
                        └─ (futuro) servidor MCP        ADR-009
```

Los cuatro terminan en el mismo caso de uso de `src/application/use-cases/`. WebMCP no consulta la
base: hace `fetch` a la misma ruta REST que cualquiera puede llamar, así que no hay un camino
privilegiado que se pueda quedar desactualizado. El detalle está en [`docs/webmcp.md`](./webmcp.md).

---

## 9. Caché y revalidación

| Ruta | Estrategia | Por qué |
| --- | --- | --- |
| `/norma`, `/que-paso`, `/legado`, `/riacho-conecta`, `/legales/*` | Estática | No dependen de la base |
| `/`, `/reconstruccion`, `/ayudar`, `/transparencia`, `/novedades`, `/novedades/[slug]`, `/sitemap.xml` | `revalidate = 300` más `revalidatePath` al publicar | Cifras frescas sin una consulta por visita |
| `/llms.txt` | `force-static` | Es un resumen del sitio, no un dato |
| `/api/public/*` | `public, max-age=60, stale-while-revalidate=300` | Respuestas chicas y cacheables en el borde |
| `/api/health` | `force-dynamic`, `no-store` | Un diagnóstico cacheado no es un diagnóstico |
| `/admin/*` | `private, no-store` por cabecera en `next.config.ts` | Nunca en un intermediario |

`cacheComponents` queda deshabilitado a propósito en esta versión
([ADR-011](./adr/011-cache-components.md)).

---

## 10. `proxy.ts` no es una frontera

Next 16 renombró `middleware.ts` a `proxy.ts`, y el nombre nuevo describe mejor lo que conviene que
sea: una capa de red delgada. Corre antes de cada navegación a `/admin`, y su único trabajo real es
darle a `@supabase/ssr` la oportunidad de renovar el token y escribir la cookie —un Server Component
no puede escribir cookies, acá sí se puede—.

El redirect a la pantalla de acceso que hay ahí es **optimista**: una conveniencia de producto, no una
protección. No protege nada por tres razones concretas: sólo mira si existe una sesión y no qué rol
tiene; no corre en las Server Actions, que son endpoints HTTP invocables por su ID; y el `matcher` es
una lista de rutas, y una lista se puede quedar corta cuando alguien agrega una ruta nueva. Es la
lección de CVE-2025-29927 y está anotada en el propio archivo.

Hay una cosa en `proxy.ts` que sí es crítica y es fácil de romper: los headers que `@supabase/ssr`
entrega en `setAll` **hay que copiarlos a la respuesta**. Son los `no-store` que acompañan a una
cookie de sesión, y sin ellos un CDN puede cachear la respuesta con el token de una persona y
servírsela a otra. Es la falla más grave que ese archivo podría causar, y sería silenciosa.

---

## 11. Las decisiones, y dónde están

Diecisiete ADRs. Los que hacen falta para entender la forma del código:

| ADR | Decisión | Por qué importa acá |
| --- | --- | --- |
| [001](./adr/001-framework.md) | Next.js 16 con App Router, versiones fijadas | Server Components por defecto es la razón de que haya tan poco JavaScript de cliente |
| [002](./adr/002-supabase.md) | Supabase como base, auth y almacenamiento | RLS obligatorio en todo lo expuesto |
| [003](./adr/003-autenticacion.md) | `getClaims()`, nunca `getSession()` | Verifica la firma en lugar de leer la cookie |
| [004](./adr/004-rbac.md) | Roles en tabla más claim en el token | El rol viene de `app_metadata`, que el usuario no puede escribir |
| [005](./adr/005-arquitectura-capas.md) | Cuatro capas y cinco patrones justificados | Es la base de todo este documento |
| [007](./adr/007-arquitectura-contenido.md) | Contenido partido por frecuencia de cambio | Explica por qué hay JSON *y* base |
| [008](./adr/008-webmcp.md) | WebMCP en un archivo aislado, sólo lectura | Todo el código de agentes se puede borrar en un commit |
| [009](./adr/009-mcp-futuro.md) | El registro de capacidades como frontera | La cuarta puerta ya tiene su lugar |
| [011](./adr/011-cache-components.md) | Sin `cacheComponents` en esta versión | |
| [012](./adr/012-design-system.md) | Sistema de diseño propio sobre tokens de Tailwind 4 | Ningún valor por defecto de Tailwind en producción |
| [013](./adr/013-base-datos-local.md) | Base de datos local sin Docker | El shim de plataforma y sus límites |
| [016](./adr/016-totales-recibidos-agregados.md) | El total recibido viene de una vista | Por eso el puerto no ofrece el detalle |
| [017](./adr/017-revalidacion.md) | ISR de cinco minutos más invalidación al publicar | |

El índice completo está en [`docs/adr/README.md`](./adr/README.md). La regla que los sostiene: si una
decisión importante no está en una spec, un plan, un ADR o una task **antes** de implementarse, el
trabajo se detiene y se documenta primero.
