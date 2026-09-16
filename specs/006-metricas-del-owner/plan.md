# Implementation Plan: Tablero de métricas del owner

**Branch**: `main` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

## Summary

Una pantalla `/admin/metricas` para `owner`: el dominio agrega lo medible y deriva señales; la
infraestructura lee un snapshot sin PII y, si hay clave, el Stats API del proveedor; la
presentación dibuja Recharts + tabla (ADR-048, ADR-049).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Next.js 16.3.4, React 19.3.0

**Primary Dependencies**: las del stack fijado, más Recharts 3.10.1 (sólo backoffice) y
`react-is` 19.3.0 (peer).

**Storage**: lecturas sobre tablas existentes. Sin migración. El alcance no se copia a
Postgres.

**Testing**: Vitest (dominio 95 %, aplicación 85 %), Testing Library en los gráficos, Playwright
en la ruta y en el permiso.

**Target Platform**: backoffice, castellano, no traducido.

**Project Type**: web (App Router)

**Constraints**: `max-lines` 300; `domain/` sin I/O; Server Components; tokens de `@theme`.

**Scale/Scope**: una campaña, una persona mirando el tablero.

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I · Spec first | Este plan, la spec y ADR-048/049 **antes** del código |
| II · TDD | Señales, agregados y alcance en rojo primero |
| III · Simplicidad | Un puerto de snapshot; un puerto de Stats API |
| IV · Capas | dominio → caso de uso → puerto → página |
| V · Seguro | `metricas.leer` = owner; snapshot sin PII; clave de analítica en servidor |
| VI · a11y | tabla + gráfico; axe en e2e |
| VIII · Honestidad | omitir gráficos vacíos; no convertir especie; omitir alcance sin clave |
| XII · Sin silencio | error y vacío diseñados; un fallo de alcance no esconde el libro |

## Project Structure

```
src/domain/metrics.ts
src/domain/metrics-series.ts
src/domain/metrics-signals.ts
src/domain/metrics-analytics.ts
src/application/admin/metrics.ts
src/infrastructure/supabase/admin/metrics-port.ts
src/infrastructure/analytics/stats.ts
components/admin/metrics-charts.tsx
components/admin/metrics-board.tsx
app/(es)/admin/(panel)/metricas/page.tsx
```

## Tasks

Ver `tasks.md`.
