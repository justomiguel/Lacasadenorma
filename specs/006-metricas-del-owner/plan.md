# Implementation Plan: Tablero de métricas del owner

**Branch**: `main` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

## Summary

Una pantalla `/admin/metricas` para `owner`: el dominio agrega lo medible y deriva señales; la
infraestructura lee un snapshot sin PII; la presentación dibuja SVG + tabla. Sin librería de
gráficos. ADR-047.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Next.js 16.3.4, React 19.3.0

**Primary Dependencies**: las del stack fijado. **Ninguna librería de charts.**

**Storage**: lecturas sobre tablas existentes. Sin migración.

**Testing**: Vitest (dominio 95 %, aplicación 85 %), Testing Library en los gráficos, Playwright
en la ruta y en el permiso.

**Target Platform**: backoffice, castellano, no traducido.

**Project Type**: web (App Router)

**Constraints**: `max-lines` 300; `domain/` sin I/O; Server Components; tokens de `@theme`.

**Scale/Scope**: una campaña, una persona mirando el tablero.

## Constitution Check

| Principio | Cómo se cumple |
|---|---|
| I · Spec first | Este plan, la spec y ADR-047 **antes** del código |
| II · TDD | Señales y agregados en rojo primero |
| III · Simplicidad | SVG propio; un puerto de snapshot |
| IV · Capas | dominio → caso de uso → puerto → página |
| V · Seguro | `metricas.leer` = owner; snapshot sin PII; RLS igual |
| VI · a11y | tabla + gráfico; axe en e2e |
| VIII · Honestidad | omitir gráficos vacíos; no convertir especie |
| XII · Sin silencio | error y vacío diseñados |

## Project Structure

```
src/domain/metrics.ts
src/domain/metrics-series.ts
src/domain/metrics-signals.ts
src/application/admin/metrics.ts
src/infrastructure/supabase/admin/metrics-port.ts
components/admin/metrics-charts.tsx
components/admin/metrics-board.tsx
app/(es)/admin/(panel)/metricas/page.tsx
```

## Tasks

Ver `tasks.md`.
