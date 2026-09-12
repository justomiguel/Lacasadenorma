---
description: "Tareas de implementación para el sitio público de campaña con transparencia auditable y backoffice"
---

# Tasks: Sitio público de campaña con transparencia auditable y backoffice

**Input**: Design documents from `/specs/001-sitio-publico-campana/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `ux.md`,
`threat-model.md`, `testing-strategy.md`, `contracts/`

**Tests**: obligatorios en dominio, policies RLS y capacidades de agentes (constitución II). No
obligatorios en maquetación, donde verifica el loop de revisión visual.

**Organization**: agrupadas por historia de usuario, en orden de dependencias.

**Estado**: las 135 tareas están hechas. Lo que queda no son tareas de esta lista sino datos que sólo
puede traer una persona: las seis fotos con espacio reservado, las fechas de Norma, el relevamiento de
la obra y las cuentas de aporte reales. No frenan el build: por diseño van en `null` y la interfaz
omite la sección o reserva el espacio y dice qué va a ir ahí (fase 2, regla del dato ausente). Están
enumerados uno por uno en `docs/content-guide.md`, sección 3.

## Format: `[ID] [P?] [Story] Descripción`

`[P]` = paralelizable (archivos distintos, sin dependencias entre sí).
`[US1]`…`[US5]` = historia de usuario a la que pertenece.

## Path Conventions

`app/` rutas · `components/` presentación · `src/domain` · `src/application` ·
`src/infrastructure` · `content/` contenido versionado · `supabase/` datos · `e2e/` Playwright ·
`scripts/` utilidades · `docs/` documentación

---

## Phase 1: Setup (infraestructura compartida)

- [x] T001 Inicializar el proyecto Next 16 con TypeScript estricto, Tailwind 4 y las versiones
      fijadas del ADR-001 (`package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`)
- [x] T002 [P] Configurar ESLint 9 flat config con `eslint-config-next`, reglas type-aware, y
      `require-await` desactivado; incluir `no-restricted-imports` que impone las capas del ADR-005
- [x] T003 [P] Configurar Prettier y `.editorconfig`
- [x] T004 [P] Configurar Vitest 5 (`vitest.config.mts`, `vitest.setup.ts`) con jsdom y Testing
      Library
- [x] T005 [P] Configurar Playwright con proyectos chromium, webkit e iPhone 15
- [x] T006 [P] Crear `.env.example` con todas las variables documentadas y sin valores
- [x] T007 [P] Crear `AGENTS.md` que traduzca la constitución a instrucciones operativas
- [x] T008 Definir los design tokens de `ux.md` en `app/globals.css` con `@theme` y cargar las
      fuentes con `next/font`
- [x] T009 [P] Configurar los headers de seguridad del modelo de amenazas en `next.config.ts`

**Checkpoint**: `npm run dev` levanta, `npm run lint` y `npm run typecheck` pasan.

---

## Phase 2: Foundational (bloquea todas las historias)

⚠️ Ninguna historia puede completarse antes de esta fase.

- [x] T010 [P] Test unitario de `Money`: rechaza no-enteros, rechaza sumar monedas distintas, formatea
      es-AR (**RED antes de T012**)
- [x] T011 [P] Test unitario de `Percentage`: acota a 0–100, devuelve `null` sin denominador
      (**RED antes de T013**)
- [x] T012 Implementar `src/domain/money.ts`
- [x] T013 Implementar `src/domain/percentage.ts`
- [x] T014 [P] Definir entidades de dominio en `src/domain/entities/` según `data-model.md`
- [x] T015 [P] Definir puertos de repositorio en `src/domain/ports/`
- [x] T016 Test unitario de las reglas de agregación: saldo por moneda, porcentaje ejecutado,
      exclusión de anulados, coincidencia entre detalle y total (SC-007)
- [x] T017 Implementar las reglas de agregación en `src/domain/`
- [x] T018 [P] Logger estructurado con redacción por lista de claves, más su test (amenaza I5)
- [x] T019 [P] Puerto de analítica con implementación nula por defecto (ADR-010)
- [x] T020 Esquemas Zod del contenido versionado y cargador que falla en build si falta un campo
- [x] T021 Contenido editorial inicial en `content/` con los campos pendientes marcados
      explícitamente (ADR-007, riesgo R4)
- [x] T022 Repositorios sobre contenido versionado, que permiten que el sitio funcione sin base
      (FR-034)
- [x] T023 Primitivas del sistema de diseño de `ux.md` en `components/design-system/`
- [x] T024 [P] Tests de componente de las primitivas interactivas: `CopyField`, `CountryTabs`,
      `ProgressBar`, `Ledger`
- [x] T025 Layout raíz con tipografía, saltos de navegación, encabezado y pie
- [x] T026 `AgentCapabilityService` con el registro tipado y `readOnly: true` como literal
      (contrato de capacidades)
- [x] T027 Test que falla si alguna capacidad registrada declara mutación (amenaza A1)

**Checkpoint**: dominio con cobertura completa, primitivas renderizando, sitio levanta sin
credenciales.

---

## Phase 3: User Story 1 — Entender y decidir en treinta segundos (P1) 🎯 MVP

### Tests

- [x] T028 [P] [US1] E2E: la home en 360 px muestra nombre, propuesta y acción principal sin
      desplazarse (flujo 1)
- [x] T029 [P] [US1] E2E: las nueve preguntas están respondidas en el HTML servido (flujo 2)
- [x] T030 [P] [US1] E2E: cambiar de país muestra los datos correctos, también sin JavaScript
      (flujo 4)
- [x] T031 [P] [US1] E2E: copiar un dato bancario deja el valor exacto en el portapapeles y lo
      anuncia; ejecutado también sólo con teclado (flujo 5)
- [x] T032 [P] [US1] E2E: un método de aporte no publicado no aparece en ninguna parte (FR-007)

### Implementación

- [x] T033 [US1] Caso de uso `getCampaignOverview` con su test de aplicación
- [x] T034 [US1] Secciones editoriales de la home según el orden de `ux.md`
- [x] T035 [US1] Sección de apertura con retrato a sangrado y espacio reservado honesto si no hay foto
- [x] T036 [US1] Página `/ayudar` con los tres países, instrucciones y copiado por campo
- [x] T037 [US1] Página `/norma` con ensayo fotográfico
- [x] T038 [US1] Página `/que-paso`, que cierra en qué se necesita ahora
- [x] T039 [US1] Página `/reconstruccion` con rubros, hitos y avance
- [x] T040 [US1] Barra de progreso que omite el porcentaje cuando no hay objetivo cargado
- [x] T041 [US1] Sección de preguntas: pregunta como encabezado, respuesta directa debajo
- [x] T042 [US1] Acción de compartir con `navigator.share` y enlaces reales como respaldo
- [x] T043 [US1] Barra inferior persistente de ayuda en mobile, que no tapa contenido
- [x] T044 [US1] Estados vacío y de datos pendientes en todas las secciones de la home

**Checkpoint**: la campaña se entiende y se puede colaborar. **El proyecto ya cumple su propósito.**

---

## Phase 4: User Story 2 — Verificar que la plata se usó como se dijo (P1)

### Tests

- [x] T045 [P] [US2] pgTAP: `anon` no lee `contributions` (amenaza I2)
- [x] T046 [P] [US2] pgTAP: `anon` no lee `expense_receipts` (amenaza I1)
- [x] T047 [P] [US2] pgTAP: `anon` no ve filas con `published_at` nulo
- [x] T048 [P] [US2] pgTAP: toda vista tiene `security_invoker` (amenaza I3)
- [x] T049 [P] [US2] pgTAP: toda llamada `auth.*()` en una policy está envuelta en subselect
- [x] T050 [P] [US2] pgTAP: existe índice en cada columna que filtra una policy
- [x] T051 [P] [US2] pgTAP: nadie, ni `owner`, puede borrar de `audit_log` (amenaza T2)
- [x] T052 [P] [US2] E2E: la suma del detalle coincide con los totales y no hay acceso a comprobantes
      (flujo 7)

### Implementación

- [x] T053 [US2] Shim de plataforma en `supabase/shim/` con roles, esquemas y privilegios por defecto
- [x] T054 [US2] `scripts/db-local.sh` con los subcomandos `reset`, `migrate`, `lint`, `advisors`,
      `test`, `types`, `verify`
- [x] T055 [US2] `scripts/gen-types.mjs` sin Docker con `@supabase/postgrest-typegen`
- [x] T056 [US2] Migración: extensiones, enums, `campaigns`, `budget_items`, con RLS habilitada
- [x] T057 [US2] Migración: `contributions`, `expenses`, `expense_receipts`, `milestones`
- [x] T058 [US2] Migración: `updates`, `update_media`, `media`, `people`, `payment_methods`
- [x] T059 [US2] Migración: `user_roles`, `audit_log`, `private.has_min_role`,
      `custom_access_token_hook`
- [x] T060 [US2] Migración: policies RLS completas según la matriz de `data-model.md`
- [x] T061 [US2] Migración: vista `campaign_totals` con `security_invoker = true`
- [x] T062 [US2] Migración: buckets de Storage y sus policies
- [x] T063 [US2] Repositorios Supabase que implementan los puertos
- [x] T064 [US2] Casos de uso de transparencia con sus tests de aplicación
- [x] T065 [US2] Página `/transparencia` con cifras, libro de gastos y método explicado
- [x] T066 [US2] Aviso visible cuando la conciliación tiene más de treinta días
- [x] T067 [US2] Página `/novedades` y `/novedades/[slug]`

**Checkpoint**: `npm run db:verify` en verde, transparencia publicada y verificable.

---

## Phase 5: User Story 4 — Encontrar el proyecto desde un buscador o un asistente (P2)

### Tests

- [x] T068 [P] [US4] E2E: metadata de OpenGraph correcta en todas las páginas (flujo 6)
- [x] T069 [P] [US4] Test de los datos estructurados: sólo contenido visible, sin figura legal
      inexistente, sin fechas estimadas
- [x] T070 [P] [US4] Tests de las cinco capacidades: forma de salida y ausencia de datos privados
      (amenaza A6)
- [x] T071 [P] [US4] Test de equivalencia entre el adaptador REST y el caso de uso (amenaza A5)

### Implementación

- [x] T072 [US4] Metadata por página con canónicas y `generateMetadata`
- [x] T073 [P] [US4] `sitemap.ts` y `robots.ts` con un único bloque permisivo
- [x] T074 [P] [US4] `opengraph-image.tsx` generada con la tipografía del sitio
- [x] T075 [P] [US4] JSON-LD: `Organization`, `WebSite`, `Person`, `Article`, `BreadcrumbList`,
      `DonateAction`
- [x] T076 [P] [US4] `llms.txt` escrito a mano y enlazado con `rel="describedby"`
- [x] T077 [US4] Implementar las cinco capacidades de lectura
- [x] T078 [US4] Adaptador REST en `app/api/public/` con límite de tasa y `503` explícito
- [x] T079 [US4] Adaptador WebMCP en un solo archivo con feature detection y tipos propios
- [x] T080 [P] [US4] `app/api/health` con `dataSource`

**Checkpoint**: el sitio es indexable, compartible y consultable por agentes.

---

## Phase 6: User Story 3 — Publicar un avance en dos minutos desde el teléfono (P2)

### Tests

- [x] T081 [P] [US3] pgTAP: matriz completa de rol × tabla × operación (amenazas E1, E2)
- [x] T082 [P] [US3] pgTAP: sólo `owner` escribe en `payment_methods` (amenaza T1)
- [x] T083 [P] [US3] pgTAP: `anon` no puede ejecutar `private.has_min_role` (amenaza E3)
- [x] T084 [P] [US3] pgTAP: un rol declarado en `user_metadata` no otorga permisos (amenaza S3)
- [x] T085 [P] [US3] Test de integración: un SVG renombrado a `.png` es rechazado (amenaza T6)
- [x] T086 [P] [US3] Test: una acción de servidor sin sesión válida es rechazada (amenaza T7)
- [x] T087 [P] [US3] E2E: login, roles insuficientes y publicación de una actualización (flujos 8 y 9)

### Implementación

- [x] T088 [US3] Clientes de Supabase para navegador y servidor, con los headers de `setAll` copiados
- [x] T089 [US3] `proxy.ts` con redirect optimista, documentado como no-frontera
- [x] T090 [US3] `/admin/login` y cierre de sesión
- [x] T091 [US3] Layout de `/admin` con revalidación de permisos en cada carga
- [x] T092 [US3] Guardas de autorización server-side reutilizables por rol
- [x] T093 [US3] `/admin/novedades`: crear, editar y publicar, con `alt` obligatorio en las fotos
- [x] T094 [US3] `/admin/gastos`: registrar, anular y subir comprobante al bucket privado
- [x] T095 [US3] `/admin/aportes`: registrar, anular y marcar conciliación
- [x] T096 [US3] `/admin/hitos` y `/admin/objetivos`
- [x] T097 [US3] `/admin/cuentas`: sólo `owner`, con validación de esquema antes de publicar
- [x] T098 [US3] Registro en `audit_log` en toda mutación financiera
- [x] T099 [US3] Revalidación por etiquetas al publicar, con `revalidateTag(tag, 'max')`

**Checkpoint**: el sitio se mantiene al día desde un teléfono.

---

## Phase 7: User Story 5 — Conocer el capítulo siguiente (P3)

- [x] T100 [P] [US5] Página `/legado` sobre Fundación Norma, sin afirmar personería inexistente
- [x] T101 [P] [US5] Página `/riacho-conecta` con los temas del programa
- [x] T102 [P] [US5] Páginas `/legales/privacidad` y `/legales/terminos`

---

## Phase 8: Polish y transversales

- [x] T103 [P] Suite de accesibilidad con axe sobre todas las páginas públicas, en dos viewports
- [x] T104 [P] `scripts/check-no-placeholders.mjs` y su integración en el build (riesgo R4)
- [x] T105 [P] Script en CI que verifica que la clave secreta no aparece en código de cliente
      (amenaza I4)
- [x] T106 [P] Workflow `ci.yml`
- [x] T107 [P] Workflow `db.yml` con Postgres de apt
- [x] T108 [P] Workflow `e2e.yml`
- [x] T109 [P] Workflow `quality.yml` con Lighthouse y presupuestos
- [x] T110 [P] Higiene del repositorio: `CODEOWNERS`, plantillas de PR e issues, Dependabot
- [x] T111 [P] `README.md` que permita levantar el proyecto desde cero sin credenciales
- [x] T112 [P] `docs/architecture.md`, `deployment.md`, `security.md`, `testing.md`, `seo.md`,
      `webmcp.md`, `content-guide.md`, `runbook.md`, `privacy.md`
- [x] T113 Loop de revisión visual: capturas en 360 px y 1440 px de cada página, análisis, corrección
      y nueva captura, hasta cumplir los criterios de aceptación visual de `ux.md`
- [x] T114 Verificación final completa: typecheck, lint, unitarios, componentes, pgTAP, build, E2E,
      axe

---

## Phase 9: Cerrar el flujo 9, y los dos defectos que aparecieron al cerrarlo

T087 quedó cumplido a medias durante un tiempo: los flujos 8 y 9 tenían cobertura de aplicación y de
pgTAP, pero el recorrido con sesión real no estaba automatizado. La razón era buena mientras duró —la
API local no tenía autenticación, y un servidor de auth falso habría verificado el servidor falso—, así
que el flujo 9 vivía como verificación manual en el runbook.

Se cerró poniendo el límite en otro lado: se sustituye la superficie HTTP de GoTrue y nada más. La
contraseña la verifica bcrypt en la base, los claims los arma el hook de la migración invocado como
`supabase_auth_admin`, el token lo valida PostgREST y las policies RLS deciden cada escritura.

**Eso encontró dos defectos que ninguna prueba existente podía ver**, porque los dos vivían en la
costura entre pgTAP —que verificaba que las policies fueran las del documento, y lo eran— y las pruebas
de aplicación, que usan puertos en memoria que aceptan cualquier entrada.

### Tests

- [x] T115 pgTAP RED: `public.custom_access_token_hook` invocado con el rol `supabase_auth_admin`,
      que es el que lo invoca de verdad. Fallaba con `permission denied for schema private`
- [x] T116 pgTAP: `insert` directo sobre `audit_log` falla por falta de privilegio para los cuatro
      roles, y `record_audit()` lo permite para los cuatro y lo niega sin rol (amenaza T2)
- [x] T117 E2E RED: flujo 9 con sesión real en los tres navegadores — borrador sin camino público,
      publicación, lista, `sitemap.xml`, despublicación, rastro de auditoría escrito con un rol y leído
      con otro, y un `auditor` rechazado también cuando le habla directo a la base

### Implementación

- [x] T118 `20260910090000`: `usage` sobre `private` y `execute` sobre `private.role_rank` para
      `supabase_auth_admin`. **Sin esto ninguna sesión se habría podido emitir en producción**
- [x] T119 `20260910091000` y [ADR-019](../../docs/adr/019-auditoria-por-funcion.md):
      `public.record_audit()` `security definer` con comprobación de rol propia, y revocación del
      `insert` de tabla. La policy anterior pedía `admin`, así que publicar como `editor` dejaba la
      fila publicada, no escribía el rastro y mostraba un error
- [x] T120 Shim, fixture y soporte de E2E: `auth.users.encrypted_password` en formato bcrypt,
      `pgcrypto` en `extensions`, los cuatro usuarios del backoffice, y la superficie de auth de
      `scripts/local-api.mjs` (`/token`, `/user`, `/logout`)
- [x] T121 Actualizar la documentación que esto invalida: `testing.md`, `runbook.md` §7,
      `security.md`, `data-model.md`, `threat-model.md`, `testing-strategy.md`, ADR-013 y el índice de
      ADR

**Checkpoint**: los nueve flujos críticos tienen cobertura automática en los tres navegadores, y lo
que queda como verificación manual es sólo lo que el shim no puede sustituir: Storage, los enlaces
firmados y el comportamiento de GoTrue.

---

## Phase 10: El loop de revisión visual, y los tres hallazgos que dejó

**Objetivo**: cerrar los diez criterios de `ux.md` §12 con evidencia, no con una casilla marcada.

La pasada completa —once páginas, 360 px y 1440 px, capturas de pliegue y de página entera— encontró
tres defectos, y **ninguno de los tres se veía en una captura**. Eso es el resultado más útil de la
fase: mirar sirve para juzgar, no para medir, y los criterios que son una medida tenían que dejar de
depender de que alguien los mirara.

### Hallazgos y corrección

- [x] T122 `--container-measure` en `em` y no en `ch`. `1ch` es el ancho de avance del «0», así que
      el token decía 68 caracteres y entregaba entre 98 y 104 en las once páginas. Calibrado midiendo
      los tres tamaños de prosa: `26em` deja la medida entre 61 y 66 (`ux.md` §2)
- [x] T123 La barra de ayuda del teléfono se retira mientras la acción primaria está en pantalla. Sobre
      el pliegue de la home duplicaba el botón de la apertura: dos llamadas idénticas al mismo destino
      y cuatro superficies con acento donde el sistema admite tres. Por omisión visible, así que sin
      JavaScript se comporta como antes (`ux.md` §9)
- [x] T124 Las reglas del encabezado y del pie van a sangrado, como la de la apertura. Caían en una
      tercera extensión —ni a sangrado ni alineada con la columna—, y el sitio ahora distingue dos:
      las que cierran una banda y las que dividen contenido (`ux.md` §4)

### Lo que quedó medido, para que no vuelva a pasar

- [x] T125 `e2e/comun/revision-visual.spec.ts`: seis de los diez criterios, en las once páginas, los
      tres navegadores y los dos modos. Desborde horizontal, medida de la prosa contra el ancho real
      del carácter, superficies con acento sobre el pliegue, la firma del template —gradientes,
      sombras, desenfoques, esquinas de más de 2 px—, números tabulares y proporción declarada de cada
      imagen
- [x] T126 El anillo de foco, recorriendo con Tab **todo** lo enfocable de cada página
      (`accesibilidad.spec.ts`). axe no tiene ninguna regla de foco visible, y un `outline-none` en un
      componente nuevo no rompería nada más
- [x] T127 `components/site/help-bar.test.tsx`: la barra se retira, vuelve, no se va con el foco
      adentro, y su HTML servido ya trae la acción
- [x] T128 Cerrar `ux.md` §12 con la evidencia de cada uno de los diez criterios, y dejar escrito lo
      que el loop vio y decidió **no** cambiar: en escritorio la columna de prosa es angosta por
      aritmética del criterio 4, y el lado derecho está reservado para la fotografía que falta

**Checkpoint**: los diez criterios visuales están cerrados; seis los sostiene CI en cada corrida y
cuatro siguen siendo un juicio, con las capturas como material de trabajo.

---

## Phase 11: La auditoría de cierre, y los dos hallazgos que dejó

**Objetivo**: verificar el backoffice operación por operación contra el código, no contra la memoria
de haberlo escrito.

El recorrido de las quince operaciones encontró una: `audit` era un parámetro **opcional** de
`perform`, y tres operaciones de contenido no lo pasaban. Ninguna violaba FR-016 —que pide el rastro
para los datos financieros— pero ninguna estaba documentada como excepción, y una de las tres,
`saveMilestone`, es hermana exacta de `saveBudgetItem`, que sí auditaba. No era una decisión: era un
olvido que el signo de pregunta del tipo hacía posible.

- [x] T129 `audit` obligatorio en `PerformOptions`. Una operación nueva sin rastro no compila
      ([ADR-020](../../docs/adr/020-rastro-obligatorio.md))
- [x] T130 Las tres entradas que faltaban, con su `diff` redactado: `update.created` /
      `update.updated` sin el cuerpo, `update.photo_added` colgado de la novedad y no de la foto, y
      `milestone.created` / `milestone.updated` con el estado y la publicación
- [x] T131 Tests de las tres, y uno que comprueba que toda clave de `AUDIT_ACTION_LABELS` cumple el
      `check` de la base: una clave mal escrita compilaba, pasaba contra el puerto en memoria y
      recién fallaba contra Postgres, en el `insert` del rastro
- [x] T132 Documentar la invariante donde se busca: `docs/security.md` §3, `data-model.md`, el índice
      de ADR y las cifras de `testing.md`

La verificación de la propia auditoría dejó el segundo hallazgo, y éste era del harness: una corrida
de `con-datos` devolvió veinte pruebas rojas en los flujos 3, 4, 5 y 7 con el fixture cargado y la API
contestando.

- [x] T133 `scripts/e2e.sh` borra `.next/cache/fetch-cache` antes de construir. Next guarda en disco
      cada lectura de Supabase, las entradas viven la ventana de `revalidate` y **sobreviven al build
      siguiente**: dos builds separados por menos de cinco minutos hornean los mismos datos, y si el
      primero corrió con la base vacía el segundo no tiene una sola cifra
- [x] T134 Y después de construir, el script mira lo construido: las cuatro páginas con cifras tienen
      que traer un `data-figure` o corta con un error que dice qué mirar. El modo de falla es silencioso
      por diseño —la página muestra la rama del dato ausente en lugar de romperse (FR-034)—, así que
      sin la guardia la corrida gasta seis minutos para devolver fallos que parecen de la aplicación
- [x] T135 Documentar el mecanismo en `testing.md` §5 y el diagnóstico en `runbook.md` §8, incluida la
      consecuencia fuera del harness: Vercel restaura la caché de build entre despliegues, así que un
      deploy puede prerenderizar cifras leídas hasta cinco minutos antes

**Checkpoint**: "toda operación del backoffice deja rastro" pasa de ser una frase en un comentario a
una propiedad que sostiene el compilador, y el harness ya no puede construir un sitio sin datos y
llamarlo una falla de la aplicación.

---

## Phase 12: La segunda dirección visual

**Objetivo**: que el sitio se vea como lo que es. La familia lo dijo sin rodeos —«está muy monótona,
sin estilo», «no veo clara la navegación»— y con la queja llegó el material que faltaba: las fotos de
Norma, las del incendio y las de la limpieza.

El diagnóstico, la evidencia medida y las cinco decisiones están en
[ADR-021](../../docs/adr/021-segunda-direccion-visual.md). Lo que importa acá es que **el sitio pasaba
los diez criterios visuales anteriores**: cero fotos, cero superficies, 39 sobrelíneas en versales
repitiendo el título de su sección, y ninguna medición preguntaba por eso.

- [x] T136 La skill `frontend-design` en el harness, y una regla de diseño del proyecto en
      `.cursor/rules/diseno.mdc`. La skill sirvió para lo contrario de lo que uno espera: no propuso,
      **diagnosticó**. Cuatro de los cinco grupos estéticos que documenta como delatores de página
      generada eran el sitio
- [x] T137 ADR-021, revisión de `ux.md` (§1 la regla entre emoción y lástima, §4 las tres formas de
      romper el plano, §9 navegación, §10 fotografía, §12 lo que se defendió mal) y la guía de contenido
- [x] T138 Las fotos entran al repositorio en `public/fotos/` y se declaran en `content/*.json` con
      `alt` y dimensiones. Dos caminos según qué tan seguido cambia la foto (ADR-007, ADR-021)
- [x] T139 `npm run check:fotos`: que cada foto declarada exista, mida lo que dice y no haya archivos
      que nadie muestre. Zod valida que el número sea un entero; no que sea **ese** entero, y del número
      depende el espacio reservado
- [x] T140 El relato del incendio con las palabras de la familia y el testimonio del hijo firmado. La
      página sobre un incendio no mencionaba el incendio
- [x] T141 Las primitivas que faltaban: `Band`, `Testimony`, `BleedOnMobile`, `PhotoSequence`, y la
      inversión de paleta de la banda oscura, que protege a lo que le pongan adentro
- [x] T142 La navegación sale del pie: seis rutas en el encabezado desde `lg` con `aria-current`, y
      `PageIndex` en el documento para el teléfono
- [x] T143 Fuera las 39 sobrelíneas en versales y los puntos medios. `--text-label` pierde el tracking
      de fábrica: cualquier etiqueta salía espaciada aunque no estuviera en mayúsculas
- [x] T144 La vista previa de WhatsApp lleva la cara de Norma. Es el único diseño del proyecto que se
      ve **antes** de decidir si abrir el enlace
- [x] T145 Los cuatro criterios nuevos de `ux.md` §12, medidos: huecos reservados por página (número
      exacto, no máximo), la home rompiendo el plano, cero versales, y `e2e/comun/navegacion.spec.ts`
- [x] T146 Los dos defectos que encontró el criterio de navegación en su primera corrida: `Container`
      recibía `aria-label` y lo descartaba en silencio, así que el sumario del sitio salía sin nombre
      accesible; y los tres puntos de navegación se llamaban igual

**Checkpoint**: el sitio tiene diez fotografías, una banda oscura, navegación visible y ninguna
versal, y los cuatro criterios que lo sostienen fallan si alguien vuelve atrás.

---

## Dependencies & Execution Order

### Phase Dependencies

Setup (1) → Foundational (2) → US1 (3) → US2 (4) → US4 (5) → US3 (6) → US5 (7) → Polish (8) →
Cerrar el flujo 9 (9) → Loop de revisión visual (10) → Auditoría de cierre (11) → Segunda dirección
visual (12)

US4 va antes que US3 a propósito: las capacidades de lectura se apoyan en los casos de uso de US1 y
US2, y no dependen de autenticación.

### User Story Dependencies

- **US1** sólo depende de la fase 2. Es entregable por sí sola.
- **US2** necesita la base de datos (T053–T063).
- **US4** necesita los casos de uso de US1 y US2.
- **US3** necesita el esquema y los roles de US2.
- **US5** es independiente; podría hacerse en cualquier momento.

### Parallel Opportunities

Todo lo marcado `[P]` dentro de una fase. Las tres suites de tests de fase 4 (T045–T052) se pueden
escribir en paralelo porque son archivos distintos. Los documentos de la fase 8 (T111, T112) también.

---

## Implementation Strategy

**MVP = fases 1, 2 y 3.** Con eso el sitio explica la campaña y permite colaborar, que es el
objetivo por el que existe. Todo lo demás sostiene y amplifica eso.

Entrega incremental: cada fase cierra con CI en verde y es desplegable.

---

## Notes

- Las tareas de test marcadas **RED antes de** tienen que fallar antes de implementarse
  (constitución II).
- Ninguna tarea puede introducir un dato de ejemplo visible. Es la regla más importante de la lista
  (riesgo R4, SC-010).
- `next typegen` corre antes de `typecheck` y de `lint`: `PageProps` y `LayoutProps` son globales
  generados.
