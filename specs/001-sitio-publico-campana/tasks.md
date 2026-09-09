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

## Format: `[ID] [P?] [Story] Descripción`

`[P]` = paralelizable (archivos distintos, sin dependencias entre sí).
`[US1]`…`[US5]` = historia de usuario a la que pertenece.

## Path Conventions

`app/` rutas · `components/` presentación · `src/domain` · `src/application` ·
`src/infrastructure` · `content/` contenido versionado · `supabase/` datos · `e2e/` Playwright ·
`scripts/` utilidades · `docs/` documentación

---

## Phase 1: Setup (infraestructura compartida)

- [ ] T001 Inicializar el proyecto Next 16 con TypeScript estricto, Tailwind 4 y las versiones
      fijadas del ADR-001 (`package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`)
- [ ] T002 [P] Configurar ESLint 9 flat config con `eslint-config-next`, reglas type-aware, y
      `require-await` desactivado; incluir `no-restricted-imports` que impone las capas del ADR-005
- [ ] T003 [P] Configurar Prettier y `.editorconfig`
- [ ] T004 [P] Configurar Vitest 5 (`vitest.config.mts`, `vitest.setup.ts`) con jsdom y Testing
      Library
- [ ] T005 [P] Configurar Playwright con proyectos chromium, webkit e iPhone 15
- [ ] T006 [P] Crear `.env.example` con todas las variables documentadas y sin valores
- [ ] T007 [P] Crear `AGENTS.md` que traduzca la constitución a instrucciones operativas
- [ ] T008 Definir los design tokens de `ux.md` en `app/globals.css` con `@theme` y cargar las
      fuentes con `next/font`
- [ ] T009 [P] Configurar los headers de seguridad del modelo de amenazas en `next.config.ts`

**Checkpoint**: `npm run dev` levanta, `npm run lint` y `npm run typecheck` pasan.

---

## Phase 2: Foundational (bloquea todas las historias)

⚠️ Ninguna historia puede completarse antes de esta fase.

- [ ] T010 [P] Test unitario de `Money`: rechaza no-enteros, rechaza sumar monedas distintas, formatea
      es-AR (**RED antes de T012**)
- [ ] T011 [P] Test unitario de `Percentage`: acota a 0–100, devuelve `null` sin denominador
      (**RED antes de T013**)
- [ ] T012 Implementar `src/domain/money.ts`
- [ ] T013 Implementar `src/domain/percentage.ts`
- [ ] T014 [P] Definir entidades de dominio en `src/domain/entities/` según `data-model.md`
- [ ] T015 [P] Definir puertos de repositorio en `src/domain/ports/`
- [ ] T016 Test unitario de las reglas de agregación: saldo por moneda, porcentaje ejecutado,
      exclusión de anulados, coincidencia entre detalle y total (SC-007)
- [ ] T017 Implementar las reglas de agregación en `src/domain/`
- [ ] T018 [P] Logger estructurado con redacción por lista de claves, más su test (amenaza I5)
- [ ] T019 [P] Puerto de analítica con implementación nula por defecto (ADR-010)
- [ ] T020 Esquemas Zod del contenido versionado y cargador que falla en build si falta un campo
- [ ] T021 Contenido editorial inicial en `content/` con los campos pendientes marcados
      explícitamente (ADR-007, riesgo R4)
- [ ] T022 Repositorios sobre contenido versionado, que permiten que el sitio funcione sin base
      (FR-034)
- [ ] T023 Primitivas del sistema de diseño de `ux.md` en `components/design-system/`
- [ ] T024 [P] Tests de componente de las primitivas interactivas: `CopyField`, `CountryTabs`,
      `ProgressBar`, `Ledger`
- [ ] T025 Layout raíz con tipografía, saltos de navegación, encabezado y pie
- [ ] T026 `AgentCapabilityService` con el registro tipado y `readOnly: true` como literal
      (contrato de capacidades)
- [ ] T027 Test que falla si alguna capacidad registrada declara mutación (amenaza A1)

**Checkpoint**: dominio con cobertura completa, primitivas renderizando, sitio levanta sin
credenciales.

---

## Phase 3: User Story 1 — Entender y decidir en treinta segundos (P1) 🎯 MVP

### Tests

- [ ] T028 [P] [US1] E2E: la home en 360 px muestra nombre, propuesta y acción principal sin
      desplazarse (flujo 1)
- [ ] T029 [P] [US1] E2E: las nueve preguntas están respondidas en el HTML servido (flujo 2)
- [ ] T030 [P] [US1] E2E: cambiar de país muestra los datos correctos, también sin JavaScript
      (flujo 4)
- [ ] T031 [P] [US1] E2E: copiar un dato bancario deja el valor exacto en el portapapeles y lo
      anuncia; ejecutado también sólo con teclado (flujo 5)
- [ ] T032 [P] [US1] E2E: un método de aporte no publicado no aparece en ninguna parte (FR-007)

### Implementación

- [ ] T033 [US1] Caso de uso `getCampaignOverview` con su test de aplicación
- [ ] T034 [US1] Secciones editoriales de la home según el orden de `ux.md`
- [ ] T035 [US1] Sección de apertura con retrato a sangrado y espacio reservado honesto si no hay foto
- [ ] T036 [US1] Página `/ayudar` con los tres países, instrucciones y copiado por campo
- [ ] T037 [US1] Página `/norma` con ensayo fotográfico
- [ ] T038 [US1] Página `/que-paso`, que cierra en qué se necesita ahora
- [ ] T039 [US1] Página `/reconstruccion` con rubros, hitos y avance
- [ ] T040 [US1] Barra de progreso que omite el porcentaje cuando no hay objetivo cargado
- [ ] T041 [US1] Sección de preguntas: pregunta como encabezado, respuesta directa debajo
- [ ] T042 [US1] Acción de compartir con `navigator.share` y enlaces reales como respaldo
- [ ] T043 [US1] Barra inferior persistente de ayuda en mobile, que no tapa contenido
- [ ] T044 [US1] Estados vacío y de datos pendientes en todas las secciones de la home

**Checkpoint**: la campaña se entiende y se puede colaborar. **El proyecto ya cumple su propósito.**

---

## Phase 4: User Story 2 — Verificar que la plata se usó como se dijo (P1)

### Tests

- [ ] T045 [P] [US2] pgTAP: `anon` no lee `contributions` (amenaza I2)
- [ ] T046 [P] [US2] pgTAP: `anon` no lee `expense_receipts` (amenaza I1)
- [ ] T047 [P] [US2] pgTAP: `anon` no ve filas con `published_at` nulo
- [ ] T048 [P] [US2] pgTAP: toda vista tiene `security_invoker` (amenaza I3)
- [ ] T049 [P] [US2] pgTAP: toda llamada `auth.*()` en una policy está envuelta en subselect
- [ ] T050 [P] [US2] pgTAP: existe índice en cada columna que filtra una policy
- [ ] T051 [P] [US2] pgTAP: nadie, ni `owner`, puede borrar de `audit_log` (amenaza T2)
- [ ] T052 [P] [US2] E2E: la suma del detalle coincide con los totales y no hay acceso a comprobantes
      (flujo 7)

### Implementación

- [ ] T053 [US2] Shim de plataforma en `supabase/shim/` con roles, esquemas y privilegios por defecto
- [ ] T054 [US2] `scripts/db-local.sh` con los subcomandos `reset`, `migrate`, `lint`, `advisors`,
      `test`, `types`, `verify`
- [ ] T055 [US2] `scripts/gen-types.mjs` sin Docker con `@supabase/postgrest-typegen`
- [ ] T056 [US2] Migración: extensiones, enums, `campaigns`, `budget_items`, con RLS habilitada
- [ ] T057 [US2] Migración: `contributions`, `expenses`, `expense_receipts`, `milestones`
- [ ] T058 [US2] Migración: `updates`, `update_media`, `media`, `people`, `payment_methods`
- [ ] T059 [US2] Migración: `user_roles`, `audit_log`, `private.has_min_role`,
      `custom_access_token_hook`
- [ ] T060 [US2] Migración: policies RLS completas según la matriz de `data-model.md`
- [ ] T061 [US2] Migración: vista `campaign_totals` con `security_invoker = true`
- [ ] T062 [US2] Migración: buckets de Storage y sus policies
- [ ] T063 [US2] Repositorios Supabase que implementan los puertos
- [ ] T064 [US2] Casos de uso de transparencia con sus tests de aplicación
- [ ] T065 [US2] Página `/transparencia` con cifras, libro de gastos y método explicado
- [ ] T066 [US2] Aviso visible cuando la conciliación tiene más de treinta días
- [ ] T067 [US2] Página `/novedades` y `/novedades/[slug]`

**Checkpoint**: `npm run db:verify` en verde, transparencia publicada y verificable.

---

## Phase 5: User Story 4 — Encontrar el proyecto desde un buscador o un asistente (P2)

### Tests

- [ ] T068 [P] [US4] E2E: metadata de OpenGraph correcta en todas las páginas (flujo 6)
- [ ] T069 [P] [US4] Test de los datos estructurados: sólo contenido visible, sin figura legal
      inexistente, sin fechas estimadas
- [ ] T070 [P] [US4] Tests de las cinco capacidades: forma de salida y ausencia de datos privados
      (amenaza A6)
- [ ] T071 [P] [US4] Test de equivalencia entre el adaptador REST y el caso de uso (amenaza A5)

### Implementación

- [ ] T072 [US4] Metadata por página con canónicas y `generateMetadata`
- [ ] T073 [P] [US4] `sitemap.ts` y `robots.ts` con un único bloque permisivo
- [ ] T074 [P] [US4] `opengraph-image.tsx` generada con la tipografía del sitio
- [ ] T075 [P] [US4] JSON-LD: `Organization`, `WebSite`, `Person`, `Article`, `BreadcrumbList`,
      `DonateAction`
- [ ] T076 [P] [US4] `llms.txt` escrito a mano y enlazado con `rel="describedby"`
- [ ] T077 [US4] Implementar las cinco capacidades de lectura
- [ ] T078 [US4] Adaptador REST en `app/api/public/` con límite de tasa y `503` explícito
- [ ] T079 [US4] Adaptador WebMCP en un solo archivo con feature detection y tipos propios
- [ ] T080 [P] [US4] `app/api/health` con `dataSource`

**Checkpoint**: el sitio es indexable, compartible y consultable por agentes.

---

## Phase 6: User Story 3 — Publicar un avance en dos minutos desde el teléfono (P2)

### Tests

- [ ] T081 [P] [US3] pgTAP: matriz completa de rol × tabla × operación (amenazas E1, E2)
- [ ] T082 [P] [US3] pgTAP: sólo `owner` escribe en `payment_methods` (amenaza T1)
- [ ] T083 [P] [US3] pgTAP: `anon` no puede ejecutar `private.has_min_role` (amenaza E3)
- [ ] T084 [P] [US3] pgTAP: un rol declarado en `user_metadata` no otorga permisos (amenaza S3)
- [ ] T085 [P] [US3] Test de integración: un SVG renombrado a `.png` es rechazado (amenaza T6)
- [ ] T086 [P] [US3] Test: una acción de servidor sin sesión válida es rechazada (amenaza T7)
- [ ] T087 [P] [US3] E2E: login, roles insuficientes y publicación de una actualización (flujos 8 y 9)

### Implementación

- [ ] T088 [US3] Clientes de Supabase para navegador y servidor, con los headers de `setAll` copiados
- [ ] T089 [US3] `proxy.ts` con redirect optimista, documentado como no-frontera
- [ ] T090 [US3] `/admin/login` y cierre de sesión
- [ ] T091 [US3] Layout de `/admin` con revalidación de permisos en cada carga
- [ ] T092 [US3] Guardas de autorización server-side reutilizables por rol
- [ ] T093 [US3] `/admin/novedades`: crear, editar y publicar, con `alt` obligatorio en las fotos
- [ ] T094 [US3] `/admin/gastos`: registrar, anular y subir comprobante al bucket privado
- [ ] T095 [US3] `/admin/aportes`: registrar, anular y marcar conciliación
- [ ] T096 [US3] `/admin/hitos` y `/admin/objetivos`
- [ ] T097 [US3] `/admin/cuentas`: sólo `owner`, con validación de esquema antes de publicar
- [ ] T098 [US3] Registro en `audit_log` en toda mutación financiera
- [ ] T099 [US3] Revalidación por etiquetas al publicar, con `revalidateTag(tag, 'max')`

**Checkpoint**: el sitio se mantiene al día desde un teléfono.

---

## Phase 7: User Story 5 — Conocer el capítulo siguiente (P3)

- [ ] T100 [P] [US5] Página `/legado` sobre Fundación Norma, sin afirmar personería inexistente
- [ ] T101 [P] [US5] Página `/riacho-conecta` con los temas del programa
- [ ] T102 [P] [US5] Páginas `/legales/privacidad` y `/legales/terminos`

---

## Phase 8: Polish y transversales

- [ ] T103 [P] Suite de accesibilidad con axe sobre todas las páginas públicas, en dos viewports
- [ ] T104 [P] `scripts/check-no-placeholders.mjs` y su integración en el build (riesgo R4)
- [ ] T105 [P] Script en CI que verifica que la clave secreta no aparece en código de cliente
      (amenaza I4)
- [ ] T106 [P] Workflow `ci.yml`
- [ ] T107 [P] Workflow `db.yml` con Postgres de apt
- [ ] T108 [P] Workflow `e2e.yml`
- [ ] T109 [P] Workflow `quality.yml` con Lighthouse y presupuestos
- [ ] T110 [P] Higiene del repositorio: `CODEOWNERS`, plantillas de PR e issues, Dependabot
- [ ] T111 [P] `README.md` que permita levantar el proyecto desde cero sin credenciales
- [ ] T112 [P] `docs/architecture.md`, `deployment.md`, `security.md`, `testing.md`, `seo.md`,
      `webmcp.md`, `content-guide.md`, `runbook.md`, `privacy.md`
- [ ] T113 Loop de revisión visual: capturas en 360 px y 1440 px de cada página, análisis, corrección
      y nueva captura, hasta cumplir los criterios de aceptación visual de `ux.md`
- [ ] T114 Verificación final completa: typecheck, lint, unitarios, componentes, pgTAP, build, E2E,
      axe

---

## Dependencies & Execution Order

### Phase Dependencies

Setup (1) → Foundational (2) → US1 (3) → US2 (4) → US4 (5) → US3 (6) → US5 (7) → Polish (8)

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
