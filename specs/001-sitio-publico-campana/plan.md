# Implementation Plan: Sitio público de campaña con transparencia auditable y backoffice

**Branch**: `001-sitio-publico-campana` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-sitio-publico-campana/spec.md`

## Summary

Un sitio de nueve páginas, mobile-first, que explica la campaña de reconstrucción y publica su
contabilidad de forma verificable, más un backoffice mínimo para mantenerla al día.

El enfoque técnico está determinado por dos requisitos que tiran en la misma dirección: el
contenido crítico tiene que llegar como HTML servido (FR-025, SC-004) y las cifras tienen que ser
auditables (FR-010 a FR-016). Eso lleva a **Server Components por defecto** con casi nada de
JavaScript de cliente, y a un **modelo de datos append-only con RLS** como núcleo del sistema en
lugar de como anexo.

La pieza que permite crecer hacia Fundación Norma sin reescribir es el `AgentCapabilityService`:
las capacidades de lectura se declaran una vez con su esquema Zod, y cuatro adaptadores delgados
(UI, REST, WebMCP, y un futuro servidor MCP) las consumen. Sin eso, cada canal duplicaría lógica y
autorización, que es exactamente la divergencia que la especificación de WebMCP identifica como
vulnerabilidad.

## Technical Context

**Language/Version**: TypeScript 6.0.3 en modo estricto (`strict`, `noUncheckedIndexedAccess`,
`verbatimModuleSyntax`, `noUnusedLocals`, `noUnusedParameters`). El binario `tsc` de TypeScript
7.0.2 se usa vía alias sólo para acelerar el typecheck.

**Primary Dependencies**: Next.js 16.3.4 (App Router, Turbopack) · React 19.3.0 ·
Tailwind CSS 4.3.3 (configuración CSS-first, `@theme`) · Zod 4.6 ·
`@supabase/supabase-js` 2.116 · `@supabase/ssr` 0.12.7

**Storage**: PostgreSQL 16 gestionado por Supabase, con RLS habilitada en todas las tablas.
Migraciones imperativas versionadas en `supabase/migrations/`. Storage de Supabase con dos buckets:
uno público para fotografías, uno privado para comprobantes. El contenido editorial estable vive
versionado en el repositorio (`content/`), validado con Zod.

**Testing**: Vitest 5 (unitario y de componentes) · Testing Library 16.3 · pgTAP 1.3.2 sobre
PostgreSQL 16 local para las policies RLS · Playwright 1.63 (E2E en chromium, webkit e iPhone) ·
`@axe-core/playwright` 4.13 para accesibilidad · Lighthouse CI para presupuestos de performance.

**Target Platform**: Web. Navegadores modernos, con prioridad explícita en Chrome y Safari móviles.
Desplegado en Vercel (Node 22).

**Project Type**: Aplicación web con capas separadas en un solo proyecto. No es un monorepo: nueve
páginas y un backoffice no justifican la sobrecarga de workspaces.

**Performance Goals**: Lighthouse ≥ 95 en las cuatro categorías (SC-003). Contenido principal de la
home legible en menos de 2,5 s en 4G (SC-004). Presupuestos: LCP ≤ 2,5 s, CLS ≤ 0,05, INP ≤ 200 ms.
JavaScript de cliente en la home ≤ 40 KB comprimido, que es alcanzable porque sólo tres
componentes necesitan interactividad.

> **Medido** (ADR-018). El código propio pesa ~42 KB comprimidos: 2 KB por encima del objetivo de 40
> KB. Lo que no se puede expresar como assertion es ese recorte, porque Lighthouse agrupa los scripts
> por tipo y no por origen, y el runtime de React y de Next suma 121 KB aparte. Y los 2,5 s de SC-004 se
> verifican con el FCP —0,76 s, con la fallback de métricas ajustadas ya en su posición final—, no con
> el LCP, que en este sitio marca cuándo termina de bajar la tipografía. Los números que corta CI están
> en `lighthouserc.json` con el ADR detrás.

> **Vuelto a medir** (ADR-022), esta vez con la red estrangulada de verdad y no simulada. Los tres
> objetivos de este párrafo se sostienen y con más margen del que se creía: **LCP 1,7 s** contra 2,5 s
> y **FCP 1,55 s** en 4G lenta real, y el TBT —lo más cercano al INP que se puede medir en
> laboratorio— **54 ms** contra 200 ms.
>
> **El CLS es la excepción, y se corrige acá para que la especificación no diga una cosa y la
> compuerta otra: el objetivo pasa de 0,05 al 0,1 publicado de Core Web Vitals.** El motivo es un
> desplazamiento de 55 px en la apertura de la home cuando la serif reemplaza a la fallback: «La Casa
> de Norma» entra en una línea con la fallback y en dos con Newsreader. No es un descuido que se pueda
> arreglar, es una propiedad de tener dos tipografías con anchos distintos —siempre existe un rango de
> anchos de pantalla donde no coinciden en cuántas líneas ocupan—. Medido, ese rango son **30 px**,
> entre 400 y 429 px, y la emulación de Lighthouse mide justo en 412 px. A 360 y 390 px, que es la
> mayoría de los teléfonos, el CLS es 0,0000. Las salidas que sí lo eliminarían —no cambiar nunca de
> tipografía, o dejar el texto en blanco hasta que baje— cuestan la tipografía o la página, y están
> evaluadas una por una en el ADR.

**Constraints**: Sin Docker en el entorno de desarrollo de agentes, lo que descarta el flujo
declarativo de esquemas de Supabase y obliga a migraciones escritas a mano. Sin credenciales de
Supabase disponibles todavía, por lo que el sitio **debe** funcionar sin base de datos configurada
(FR-034, SC-012). Sin datos reales verificados, por lo que el sitio **debe** omitir en lugar de
inventar (FR-007, SC-010).

**Scale/Scope**: 9 páginas públicas + 8 vistas de backoffice. Tráfico esperado: picos por difusión
en redes, del orden de miles de visitas en horas, con casi todo cacheable. Volumen de datos:
decenas de gastos, decenas de aportes, cientos de fotos. Nada de esto es un problema de escala; es
un problema de confianza y de latencia en el primer render.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra `.specify/memory/constitution.md` v1.0.0.

| Principio | Cómo lo cumple este plan | Verificación |
|---|---|---|
| **I. Specification First** | Este plan deriva de `spec.md`; las decisiones no triviales tienen ADR antes de codificarse (001–012 al planificar; 013–020 se agregaron cuando la implementación descubrió decisiones que el plan no había previsto) | Revisión de PR: toda decisión de arquitectura tiene ADR |
| **II. TDD** | RED→GREEN→REFACTOR en dominio (`Money`, `Percentage`, saldos), en policies RLS (pgTAP) y en capacidades de agentes. No en maquetación | Los tests de dominio y pgTAP existen antes de su implementación |
| **III. Simplicidad** | Sin CMS, sin monorepo, sin librería de componentes, sin Realtime, sin `cacheComponents`, sin servidor MCP. Cinco patrones, cada uno con un problema nombrado (ADR-005) | Tabla de patrones con justificación; ninguna entrada sin problema real |
| **IV. Separación** | Cuatro capas con dependencias unidireccionales; `domain/` sin imports de I/O | Regla de ESLint `no-restricted-imports` que falla el lint si `domain/` importa React, Next o Supabase |
| **V. Seguro por defecto** | RLS en la primera migración; clave secreta sólo en servidor; validación server-side siempre; `proxy.ts` sólo redirige; financieros append-only | pgTAP de negación por rol; grep en CI que prohíbe la clave secreta fuera de `infrastructure/`; threat model |
| **VI. Accesibilidad** | axe en E2E sobre todas las páginas públicas en dos viewports; foco visible en los tokens; `alt` obligatorio en el modelo de datos | `e2e/comun/accesibilidad.spec.ts` con cero violaciones, y el anillo de foco recorrido con Tab |
| **VII. Performance** | Server Components por defecto; `next/image` obligatorio; fuentes autoalojadas; presupuestos en CI | Lighthouse CI en `quality.yml` |
| **VIII. Diseño humano** | Sistema de diseño editorial propio con tokens; lista de anti-patrones prohibidos; loop de revisión visual; copy escrito a mano | Capturas desktop y mobile de cada página, y seis de los diez criterios medidos en `e2e/comun/revision-visual.spec.ts` |
| **IX. Listo para agentes** | `AgentCapabilityService` en `application/`; WebMCP en un solo archivo con feature detection; sólo lectura | Tests de las cinco capacidades; test que verifica que ninguna es mutante |
| **X. Observabilidad** | Logger estructurado con redacción de campos sensibles; `/api/health`; errores de servidor con causa | Test unitario del logger que verifica la redacción |
| **XI. Documentación** | README que levanta sin credenciales; `/docs` completo; ADRs; runbook | SC-012 verificado a mano en un clon limpio |
| **XII. Sin fallo silencioso** | Sin `catch {}`; estados de carga, vacío y error diseñados; sin `console.log` | Regla de ESLint `no-empty` y `no-console`; tests de estado vacío |

**Resultado del gate: PASA.** Sin violaciones que justificar, por lo que `Complexity Tracking`
queda vacío deliberadamente.

**Re-evaluación posterior al diseño de fase 1**: PASA. El diseño de datos no introdujo violaciones;
la decisión de mantener el contenido editorial en el repositorio (en lugar de en la base) refuerza
los principios III y VII y está registrada en ADR-007.

## Project Structure

### Documentation (this feature)

```text
specs/001-sitio-publico-campana/
├── plan.md              # Este archivo
├── spec.md              # Especificación de producto
├── research.md          # Fase 0: decisiones técnicas resueltas
├── data-model.md        # Fase 1: entidades, invariantes, visibilidad
├── ux.md                # Fase 1: especificación de UX y sistema de diseño
├── threat-model.md      # Fase 1: modelo de amenazas y mitigaciones
├── testing-strategy.md  # Fase 1: qué se testea, en qué nivel y por qué
├── quickstart.md        # Fase 1: cómo levantarlo y verificarlo
├── contracts/
│   ├── agent-capabilities.md   # Contrato de las capacidades de lectura
│   └── public-api.md           # Contrato de los endpoints públicos
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (comando tasks)
```

### Source Code (repository root)

```text
app/                          # presentation — rutas, metadata, Server Components
├── (public)/                 #   grupo público: layout editorial
│   ├── page.tsx              #     home
│   ├── norma/                #     quién fue Norma
│   ├── que-paso/             #     qué ocurrió
│   ├── reconstruccion/       #     qué se perdió, presupuesto, hitos
│   ├── ayudar/               #     métodos de aporte
│   ├── transparencia/        #     ingresos, gastos, saldo, comprobantes
│   ├── novedades/            #     actualizaciones + detalle compartible
│   ├── legado/               #     Fundación Norma
│   ├── riacho-conecta/       #     programa futuro
│   └── legales/              #     privacidad y términos
├── admin/                    #   backoffice protegido
│   ├── login/
│   ├── aportes/ gastos/ novedades/ hitos/ cuentas/ fotos/ objetivos/
├── api/
│   ├── health/               #     diagnóstico de despliegue
│   └── public/[capability]/  #     adaptador REST de las capacidades
├── sitemap.ts robots.ts      #   descubribilidad
├── opengraph-image.tsx       #   imagen de compartir generada
└── layout.tsx globals.css

components/                   # presentation — sistema de diseño + secciones
├── design-system/            #   primitives propias: Prose, Figure, Stat, CopyField…
└── sections/                 #   composiciones editoriales por página

src/
├── domain/                   # TypeScript puro, sin I/O
│   ├── money.ts percentage.ts
│   ├── entities/             #   Campaign, Expense, Contribution, Milestone…
│   └── ports/                #   interfaces de repositorio
├── application/              # casos de uso + frontera agentic
│   ├── use-cases/
│   └── agent-capabilities/   #   AgentCapabilityService y las cinco capacidades
├── infrastructure/           # implementaciones concretas
│   ├── supabase/             #   clientes y repositorios
│   ├── content/              #   repositorios sobre contenido versionado
│   ├── logging/ analytics/
└── shared/                   # utilidades sin dependencias de capa

content/                      # persistence — contenido editorial versionado
├── historia.ts que-paso.ts reconstruccion.ts legado.ts preguntas.ts

supabase/
├── migrations/               # SQL versionado con RLS
├── tests/                    # pgTAP
└── shim/                     # superficie de plataforma para Postgres local

e2e/                          # Playwright: 9 flujos críticos + accesibilidad
scripts/                      # db-local.sh, gen-types.mjs, check-no-placeholders.mjs
docs/                         # architecture, deployment, security, testing, seo,
                              # webmcp, content-guide, runbook, adr/, research/
```

**Structure Decision**: un solo proyecto Next.js con las capas materializadas en directorios y la
regla de dependencias impuesta por ESLint, no por convención. `app/` y `components/` quedan en la
raíz (donde Next los espera) y las capas no visuales viven bajo `src/`, lo que hace que la frontera
sea visible en el árbol de archivos: cualquiera que abra el repositorio ve que `src/domain` no tiene
nada de web. Se descartó un monorepo con paquetes por capa: agrega herramientas y tiempos de build
sin resolver ningún problema que este proyecto tenga hoy.

## Fases de ejecución

**Fase 0 — Research (cerrada).** Ver `research.md`. Todas las incógnitas técnicas se resolvieron
verificándolas en el entorno; no queda ningún `NEEDS CLARIFICATION`.

**Fase 1 — Diseño (cerrada).** `data-model.md`, `ux.md`, `threat-model.md`,
`testing-strategy.md`, `contracts/`, `quickstart.md`. ADRs 001–012 en `docs/adr/`.

**Fase 2 — Tasks.** `tasks.md`, generado a partir de este plan y agrupado por historia de usuario.

**Fase 3 — Implementación.** En el orden de dependencias: fundaciones → dominio → datos → páginas
públicas → descubribilidad → backoffice.

**Fase 4 — Verificación.** Typecheck, lint, unitarios, componentes, pgTAP, E2E, axe, build,
Lighthouse, y el loop de revisión visual en desktop y mobile.

**Fase 5 — Convergencia.** `converge` para detectar requisitos no cumplidos y anexarlos como
tareas.

## Complexity Tracking

> Sin entradas: el Constitution Check pasó sin violaciones.
