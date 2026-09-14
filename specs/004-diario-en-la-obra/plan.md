# Implementation Plan: El diario se lee donde está la obra

**Branch**: `main` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-diario-en-la-obra/spec.md`

## Summary

Completar el diario de 003: epígrafe y crédito al insertar, reutilizar un
medio ya adjunto, mostrar la última entrada en `/reconstruccion`, y un RSS
en `/novedades.xml`. Sin columnas nuevas, sin TipTap en público, sin teaser
en la home, sin cambiar la tarjeta de compartir (ADR-036).

## Technical Context

**Language/Version**: TypeScript 6, Next.js 16, React 19, Postgres 17

**Primary Dependencies**: las fijadas en `package.json`. Ninguna dependencia
nueva.

**Storage**: `media.caption` / `media.credit` ya existen; `coverPhoto` se
deriva

**Testing**: Vitest (cover, RSS, caption en el caso de uso), Playwright
(`/reconstruccion` con fixture, `GET /novedades.xml`)

**Target Platform**: sitio público + backoffice, 390 px primero

**Project Type**: aplicación web Next.js (App Router)

**Performance Goals**: `/reconstruccion` y `/novedades` no empeoran el
presupuesto de JS; el teaser y el enlace al diario van con `prefetch={false}`

**Constraints**: T4, FR-024, FR-034, FR-308, ADR-032, ADR-034, ADR-036,
max-lines 300

**Scale/Scope**: decenas de entradas; una sección en la obra, el panel de
inserción, un route handler

## Constitution Check

- I Specification First: spec, research y data-model antes del código
- II TDD: `coverPhoto` y el XML del feed en rojo antes de implementar; el
  caso de uso de caption también
- III Simplicidad: sin columna de portada, sin feed en inglés, sin teaser en
  la home
- IV Capas: `coverPhoto` en dominio; RSS en infraestructura de SEO a partir
  de `listUpdates`; el editor no importa `infrastructure/supabase`
- V–XII: I7 (borradores fuera del teaser y del feed), FR-034 (omitir, no
  inventar vacío), XML escapado, sin `console.log`

Post-design: sin violaciones. `/reconstruccion` pasa a Server Component
async. El feed es un Route Handler sin cliente.

## Project Structure

### Documentation (this feature)

```text
specs/004-diario-en-la-obra/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/rss.md
└── tasks.md
```

### Source Code

```text
src/domain/entities/update.ts                   # coverPhoto
src/application/admin/updates.ts                # caption/credit ya están
components/admin/news-editor-toolbar.tsx        # campos opcionales
components/admin/news-editor-library.tsx        # reutilizar adjuntos
components/admin/news-body-field.tsx
components/screens/reconstruction-screen.tsx    # teaser
components/screens/news-index-screen.tsx        # coverPhoto + alternate
src/infrastructure/seo/rss.ts
app/novedades.xml/route.ts
```

## Complexity Tracking

Ninguna violación nueva. TipTap sigue confinado al admin.
