# Fase 0 — Research

Todas las incógnitas técnicas del plan, resueltas. Cada decisión se verificó ejecutándola en este
entorno el 2026-09-09; los informes completos con fuentes están en `docs/research/`.

No queda ningún `NEEDS CLARIFICATION`.

---

## R-01 · ¿Qué versiones del stack son realmente instalables?

**Decisión**: `next` 16.3.4, `react` 19.3.0, `typescript` **6.0.3**, `eslint` **9.39.5**,
`tailwindcss` 4.3.3, `vitest` 5.0.0, `@playwright/test` 1.63.0, `zod` 4.6.0,
`@supabase/ssr` 0.12.7.

**Motivo**: las versiones `latest` de `typescript` (7.0.2) y `eslint` (10.10.0) rompen el
ecosistema hoy. TS 7 es el port nativo en Go y no expone la API de compilador en JS, así que
`typescript-eslint` aborta con `does not support TS 7.0`. ESLint 10 rompe
`eslint-plugin-react@7.37.5` con `contextOrFilename.getFilename is not a function`. Se comprobó
instalando y ejecutando ambas combinaciones. `create-next-app` genera deliberadamente `^5` y `^9`.

**Alternativas descartadas**: usar `latest` (no compila); quedarse en Next 15 (perderíamos las
mejoras de Server Components sin ganar nada, y habría que migrar igual).

**Consecuencia**: se agrega una regla a la constitución: se verifican `peerDependencies`, no tags.

---

## R-02 · ¿Se habilita `cacheComponents` de Next 16?

**Decisión**: **no** en esta versión. Ver ADR-011.

**Motivo**: con `cacheComponents: true`, leer `params`, `searchParams`, `cookies()` o hacer `fetch`
sin cachear fuera de `<Suspense>` es **error de build**, no advertencia. Para un sitio casi
estático el beneficio (Partial Prerendering) es marginal frente al costo de tener que estructurar
cada página en un hijo cacheado y un hijo dinámico. El principio III (simplicidad) y el orden de
prioridad del norte (simplicidad antes que sofisticación técnica) resuelven el empate.

**Se reevalúa** cuando haya tráfico real medido y un caso donde el TTFB importe.

---

## R-03 · ¿Cómo se trabaja con Supabase sin Docker y sin credenciales?

**Decisión**: PostgreSQL 16 de apt + un *shim* de plataforma + `supabase migration up --db-url` +
`supabase db advisors --db-url` + pgTAP por `psql` + generación de tipos con
`@supabase/postgrest-typegen` sobre `pg`.

**Motivo**: Docker no existe en el entorno. Se midió qué comandos del CLI funcionan con `--db-url`:
`migration up`, `migration list`, `db push`, `db query`, `db lint` y `db advisors` funcionan;
`gen types`, `db diff`, `db pull` y `test db` **requieren** Docker porque construyen una shadow
database o corren pgTAP en contenedor. Los dos que faltaban tienen sustitutos exactos: el generador
de tipos se extrajo a un paquete agnóstico del driver, y pgTAP se instala por apt.

**Consecuencia importante**: como `db diff` necesita Docker, **el flujo declarativo de esquemas
queda descartado** y las migraciones se escriben a mano. Eso además evita las limitaciones
conocidas de `db diff`, que no rastrea `alter policy`, comentarios ni `security_invoker`.

**Alternativas descartadas**: `embedded-postgres` (no trae pgTAP ni `plpgsql_check`, es beta y
empaqueta Postgres 18, que diverge de la versión de Supabase); mockear los repositorios (no puede
verificar si una policy RLS es correcta, que es justamente lo que hay que verificar).

---

## R-04 · ¿Cómo se testean las policies RLS de verdad?

**Decisión**: pgTAP, ejecutando cada aserción con la identidad simulada como lo hace PostgREST:

```sql
set local role authenticated;
set local request.jwt.claims = '{"sub":"…","app_metadata":{"user_role":"editor"}}';
```

**Motivo**: es el único mecanismo que prueba la policy y no una abstracción sobre ella. Cubre
además los casos de **negación**, que son los que importan: que `anon` no lea comprobantes, que
`editor` no toque cuentas bancarias, que `auditor` no escriba nada.

**Detalle que hay que respetar**: pgTAP reporta las fallas en su salida, **no** en el exit code. El
runner tiene que parsear `not ok` y salir 1, o los tests fallan en silencio (lo que violaría el
principio XII).

---

## R-05 · ¿Cómo se escriben las policies para que pasen el linter?

**Decisión**: envolver **la llamada `auth.*()` en sí** en un subselect, declarar las escrituras
**por comando** (nunca `for all`), y fusionar "propio o admin" en una sola policy con `or`.

**Motivo**: `supabase db advisors` marca `auth_rls_initplan` si se envuelve la expresión entera en
lugar de la llamada:

```sql
-- marcado
using ((select auth.jwt() -> 'app_metadata' ->> 'user_role') = 'admin')
-- limpio
using (((select auth.jwt()) -> 'app_metadata' ->> 'user_role') = 'admin')
```

Y marca `multiple_permissive_policies` si hay dos policies permisivas para el mismo rol y comando,
lo que ocurre inevitablemente cuando se usa `for all` (que incluye `SELECT` y colisiona con la
policy de lectura). Se comprobó A/B: sólo la forma envuelta pasa.

---

## R-06 · ¿Cómo se modela RBAC?

**Decisión**: tabla `user_roles` como fuente de verdad **más** `custom_access_token_hook` que
desnormaliza el rol al claim `app_metadata.user_role`. Ver ADR-004.

**Motivo**: la tabla permite administrar y auditar; el claim evita un join por fila en cada policy.
El rol **debe** ir en `app_metadata`, no en `user_metadata`, porque este último es editable por el
usuario y usarlo para autorizar es una vulnerabilidad (lo documenta la skill oficial de Supabase).
La función necesita `set search_path = ''` o `db advisors` la marca `function_search_path_mutable`
— el ejemplo de la documentación oficial de Supabase omite eso.

**Limitación aceptada**: los claims son tan frescos como el último refresh del token, así que un
cambio de rol tarda hasta la rotación. Para cuatro personas administrando un sitio, es aceptable y
queda documentado en el runbook.

---

## R-07 · ¿Cuál es la API real de WebMCP?

**Decisión**: `document.modelContext.registerTool(tool, { signal })`, con retorno de valor JSON
serializable (o string), anotaciones `readOnlyHint`/`untrustedContentHint`/`consequentialHint`, y
declaración de tipos propia de ~30 líneas.

**Motivo**: `navigator.modelContext.provideContext({ tools })` **fue eliminado**;
`{ content: [{ type: "text" }] }` es la forma de MCP, no de WebMCP; `requestUserInteraction()` no
existe en la especificación actual. El paquete npm `webmcp` es un stub abandonado de 2025, y
`@mcp-b/webmcp-types@5.1.0` va atrasado (le falta `consequentialHint` y `execute` está tipado sin
`{ signal }`).

**Consecuencia de riesgo**: la API tuvo dos renombres con ruptura en 2026, WebKit está formalmente
en contra y la revisión del TAG está incompleta. Todo el código WebMCP va en **un** archivo, detrás
de feature detection, sin dependencias. Ver ADR-008.

**Consecuencia de seguridad**: como no existe primitiva de confirmación humana, **ninguna
herramienta puede mover dinero**. Se implementan cinco herramientas de sólo lectura.

---

## R-08 · ¿Cuánto esfuerzo merece llms.txt y la optimización para agentes?

**Decisión**: un `llms.txt` escrito a mano, enlazado con `<link rel="describedby">`. Sin pipeline,
sin gemelos `.md`, sin `llms-full.txt`.

**Motivo**: la evidencia converge en cinco estudios independientes. Ahrefs, sobre 137.000 sitios:
el 97% de los archivos nunca son leídos. Un estudio de logs midió 3.990 fetches de `robots.txt` de
los crawlers de OpenAI contra 7 de `llms.txt`; Perplexity, cero. Search Atlas encontró que la
adopción no predice citación una vez controlada la autoridad del dominio. Google declara
explícitamente que no lo usa. Y `llms-full.txt` **no existe en la especificación** (ni v1 ni v2).

**Dónde sí conviene poner el esfuerzo**: datos originales conciliados con fecha visible, y frescura.
Perplexity cita contenido de menos de 30 días al 82% contra 37% para contenido de más de un año, y
el 62% de sus citas viene de dominios `.org` y `.edu`. Los montos conciliados de este sitio son
datos que ningún modelo puede obtener de otra fuente.

---

## R-09 · ¿Qué datos estructurados son honestos y útiles?

**Decisión**: `Organization` + `WebSite` en la home, `Person` con `deathDate` **sólo si la familia
publicó las fechas**, `Article` en las novedades, `BreadcrumbList` en páginas internas, y
`DonateAction` como `potentialAction` en la página de aportes.

**Motivo y descartes**: los rich results de `FAQPage` desaparecieron de Google el 7 de mayo de 2026,
así que el markup no gana nada (se incluye sólo porque las preguntas están visibles, a costo cero).
`SearchAction` está inerte desde noviembre de 2024. `NGO` y `nonprofitStatus` **no se usan** porque
Fundación Norma todavía no tiene personería: afirmarlo sería markup engañoso. `DonateAction` **no**
produce un botón en Google, pese a lo que se repite en blogs de SEO; se incluye por honestidad
semántica. Prohibidos: `Review`/`AggregateRating` sobre la campaña, `Offer`/`Product` para una
donación, y cualquier `DonateAction` completado en página pública (afirmaría que una donación
ocurrió).

---

## R-10 · ¿Cómo se escriben los tokens de un sistema de diseño propio?

**Decisión**: Tailwind 4.3 con configuración CSS-first: los tokens se declaran en `@theme` y
Tailwind genera las utilidades. Sin librería de componentes.

**Motivo**: en Tailwind 4 los tokens **son** la API — `--color-ink-muted` genera `text-ink-muted`,
`bg-ink-muted` y `border-ink-muted`, y además queda disponible como custom property para CSS a
mano. Eso da exactamente lo que pide el principio VIII: identidad propia, sin heredar el aspecto de
`shadcn/ui`, y sin escribir CSS a mano para todo.

**Detalles verificados**: `tailwind.config.js` ya no se descubre automáticamente (requiere
`@config`); el modo oscuro por clase se declara con `@custom-variant`; en Next se usa
`@tailwindcss/postcss`, no el plugin de Vite; `oklch()` se convierte a hex automáticamente con
upgrade por `@supports`.

---

## R-11 · ¿Cómo funciona el contenido editable sin construir un CMS?

**Decisión**: dos fuentes según la frecuencia de cambio. El contenido editorial estable (historia,
relato del accidente, textos de secciones, preguntas frecuentes) vive **versionado en el
repositorio** en `content/*.ts`, validado con Zod. Los datos que cambian seguido (montos, gastos,
hitos, novedades, fotos, cuentas) viven en **Supabase** y se editan desde el backoffice.
Ver ADR-007.

**Motivo**: un CMS para nueve páginas es sobrearquitectura y agrega un proveedor que puede fallar o
cobrar. Pero pedirle a quien administra que edite un archivo TypeScript para publicar un avance
sería inaceptable, y es exactamente lo que hace que la transparencia se desactualice (riesgo R1).
La división por frecuencia de cambio resuelve las dos cosas.

**Beneficio adicional**: hace posible FR-034 y SC-012 — el sitio levanta y se ve completo sin
credenciales, porque todo el contenido narrativo está en el repositorio.

---

## R-12 · ¿Cómo se evita que un dato de ejemplo llegue a producción?

**Decisión**: tres capas. (a) Los datos no verificados se marcan con un estado explícito en el
modelo y la UI **omite** la sección en lugar de renderizar un placeholder. (b) `content/` declara
los campos pendientes con un tipo que obliga a manejarlos. (c) Un script en CI
(`check-no-placeholders`) falla el build de producción si detecta marcadores de pendiente en
contenido publicable.

**Motivo**: es el riesgo más probable con consecuencia grave del proyecto (R4). Un CBU inventado
hace que alguien transfiera al vacío. La mitigación no puede depender de que alguien se acuerde.
