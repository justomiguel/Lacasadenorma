# Investigación: GitHub Spec Kit 1.0.5

**Fecha de verificación:** 2026-09-09. Verificado instalando `specify-cli` 1.0.5 y ejecutando
`init` real, no leyendo documentación.

---

## Correcciones a lo que se suele asumir

| Supuesto habitual | Realidad en 1.0.5 |
|---|---|
| `specify init --ai cursor` | **La flag `--ai` no existe.** Es `--integration cursor-agent`. `--integration cursor` falla con `Unknown integration: 'cursor'` |
| Instala `.cursor/commands/speckit.*.md` | Para `cursor-agent` instala **skills** en `.cursor/skills/speckit-<nombre>/SKILL.md`, y se invocan con guion: `/speckit-plan` |
| `--no-git` | **Eliminada.** El core no usa ni requiere git |
| `update-agent-context.sh`, `agent-file-template.md` | Salieron del core, están en la extensión `agent-context` |
| `/speckit.converge` no existe | **Existe**, es comando de primera clase |

## Instalación

```bash
uv tool install specify-cli          # o pipx install specify-cli
specify --version                    # 1.0.5
```

Los assets van dentro del wheel: `init` no necesita red.

## Init usado en este proyecto

```bash
specify init --here --force --non-interactive --integration cursor-agent --script sh
```

`--non-interactive` es obligatorio en un harness de agente: sin eso el selector de integración
espera flechas del teclado y cuelga.

Para además tener los comandos con punto (`/speckit.plan`), la integración `generic` los genera:

```bash
specify init --here --force --non-interactive \
  --integration generic --integration-options="--commands-dir .cursor/commands"
```

Ambas variantes comparten el mismo `.specify/`.

## Árbol que genera

```
.cursor/skills/speckit-{analyze,checklist,clarify,constitution,converge,
                        implement,plan,specify,tasks,taskstoissues}/SKILL.md
.specify/memory/constitution.md          ← plantilla sin llenar
.specify/memory/.constitution-template.json
.specify/scripts/bash/{check-prerequisites,common,create-new-feature,
                       resolve-template,setup-plan,setup-tasks}.sh
.specify/templates/{checklist,constitution,plan,spec,tasks}-template.md
.specify/workflows/speckit/workflow.yml
.specify/integration.json · .specify/init-options.json
```

Esos diez son **todos** los comandos de 1.0.5. No hay comandos `research`, `quickstart` ni
`data-model`: esos son artefactos que escribe `plan`.

## Flujo documentado

```
constitution → specify → plan → tasks → implement → converge
```

Opcionales y dónde entran: `clarify` antes de `plan`; `checklist` después de `plan`; `analyze`
después de `tasks` y antes de `implement`.

- **`analyze`**: reporte de consistencia entre artefactos, read-only, no escribe nada, tope de 50
  hallazgos.
- **`converge`**: corre *después* de `implement`. Lee el código y **agrega** las tareas faltantes
  al final de `tasks.md` en una sección `## Phase N: Convergence`. Es *append-only*: no reescribe
  `spec.md` ni `plan.md`, no renumera tareas, no toca código. Si el código ya cumple todo, deja
  `tasks.md` **byte a byte idéntico**.

## Scripts y sus contratos

| Script | Qué hace |
|---|---|
| `create-new-feature.sh [--json] <desc>` | Crea `specs/NNN-nombre-corto/spec.md` desde la plantilla y escribe `.specify/feature.json`. **No toca git**: `BRANCH_NAME` es sólo una etiqueta |
| `setup-plan.sh --json` | Copia la plantilla a `FEATURE_DIR/plan.md` si no existe. La clave JSON es `FEATURE_DIR` (renombrada en 1.0.5) |
| `setup-tasks.sh --json` | Devuelve `TASKS_TEMPLATE_CONTENT` con la plantilla completa inline |
| `check-prerequisites.sh [--json] [--require-spec] [--require-tasks] [--include-tasks] [--paths-only]` | Valida artefactos y devuelve rutas. `--paths-only` evita escrituras |
| `resolve-template.sh <nombre> [--json]` | Resuelve plantilla por la cadena overrides → presets → extensions → core |

Nombre de feature: pasa a minúsculas, quita ~50 stop words, descarta palabras de menos de 3
caracteres, toma las primeras 3 (o 4 si quedan exactamente 4), une con guiones, y prefija con
`%03d` del máximo existente + 1.

**El estado de la feature es un archivo, no una rama:** `SPECIFY_FEATURE_DIRECTORY` →
`.specify/feature.json` → error. Ese archivo está gitignorado, así que en flujos scripteados
conviene exportar `SPECIFY_FEATURE_DIRECTORY` explícitamente.

Los scripts escriben pistas legibles a **stderr** y JSON a **stdout**.

## Estructura obligatoria de las plantillas

**`spec-template.md`** — tres secciones marcadas `*(mandatory)*`:
`## User Scenarios & Testing` (historias con prioridad P1/P2/P3, cada una con *Why this priority*,
*Independent Test* y escenarios Given/When/Then numerados, más `### Edge Cases`);
`## Requirements` (FR-001… con forma "System MUST …", más `### Key Entities`);
`## Success Criteria` (SC-001… medibles y **agnósticos de tecnología**); y `## Assumptions`.
Los pendientes se marcan `[NEEDS CLARIFICATION: pregunta]`, con tope de 3.

**`plan-template.md`** — `## Summary`, `## Technical Context`, `## Constitution Check`
(*GATE: debe pasar antes de la fase 0 y re-evaluarse después del diseño*), `## Project Structure`
(con `**Structure Decision**`), `## Complexity Tracking` (tabla Violation / Why Needed / Simpler
Alternative Rejected Because, sólo si hay violaciones que justificar).

**`tasks-template.md`** — `[ID] [P?] [Story] Descripción`, IDs `T001` secuenciales en todas las
fases, `[P]` = paralelizable (archivos distintos, sin dependencias), `[US1]` mapea a historia.
Fases: Setup → Foundational (bloqueante) → una fase por historia → Polish. Cada fase cierra con
`**Checkpoint**`.

**`checklist-template.md`** — IDs `CHK001`. Son artefactos de **revisión de calidad de
requisitos** ("unit tests for English"), propiedad del revisor: `[x]` significa "criterio
revisado y satisfecho", **no** "implementación terminada".

**Checklist de calidad de spec**: `FEATURE_DIR/checklists/requirements.md`, con las categorías
Content Quality / Requirement Completeness / Feature Readiness. `specify` se autovalida contra
ella e itera hasta 3 veces.

## Versionado de la constitución

Semver obligatorio en `CONSTITUTION_VERSION`:
**MAJOR** = remoción o redefinición incompatible de gobernanza o principios;
**MINOR** = principio o sección nueva, o guía materialmente ampliada;
**PATCH** = aclaraciones y redacción.

Requisitos de validación: sin tokens `[…]` sin explicar, fechas ISO `YYYY-MM-DD`, principios
declarativos y testeables (MUST/SHOULD con fundamento, no "should" vago), y un *Sync Impact
Report* como comentario HTML al principio del archivo. El comando `constitution` sólo escribe
`.specify/memory/constitution.md`.

Tanto `analyze` como `converge` tratan la constitución como **no negociable**: un conflicto es
CRITICAL y se resuelve ajustando spec/plan/tasks, nunca reinterpretando el principio.

## Gotchas

- Los templates traen comentarios HTML gritando que se reemplacen los ejemplos, y
  `plan-template.md` exige quitar las etiquetas `[REMOVE IF UNUSED]`. Dejarlas es el modo de falla
  más común.
- `--script py` instala **también** los scripts bash.
- `taskstoissues` sale del core según las notas de la 1.0.5: no construir sobre él.
- Punto de personalización más limpio: `.specify/templates/overrides/<nombre>.md` gana sobre
  presets, extensiones y core.
- El gate de `implement`: si hay checklists con items sin marcar, **se detiene y pregunta**.
