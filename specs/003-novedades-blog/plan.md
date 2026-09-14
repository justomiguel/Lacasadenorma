# Implementation Plan: Novedades como diario de la obra

**Branch**: `main` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-novedades-blog/spec.md`

## Summary

Convertir las novedades en un diario: editor visual en `/admin` que serializa al Markdown
restringido del dominio (fotos y videos intercalados, alojados acá), e índice público
cronológico con fecha visible. Sin HTML crudo, sin embeds de terceros, sin mandar el editor
al sitio público. [ADR-034](../../docs/adr/034-editor-novedades.md).

## Technical Context

**Language/Version**: TypeScript 6, Next.js 16, React 19, Postgres 17 (Supabase)

**Primary Dependencies**: las fijadas en `package.json`, más TipTap (versión exacta, sólo
admin): `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`,
`@tiptap/extension-placeholder`

**Storage**: `updates.body` sin cambio de tipo; `media.kind` + `media.bucket_id`; bucket
`videos`

**Testing**: Vitest (dominio, casos de uso, sniff de video, serialización del editor),
pgTAP (bucket y `kind`), Playwright (publicar con el editor, feed, axe)

**Target Platform**: sitio público + backoffice, mobile first 390 px

**Project Type**: aplicación web Next.js (App Router)

**Performance Goals**: el JS del editor no entra al bundle público; Lighthouse de
`/novedades` no empeora el presupuesto de ADR-018

**Constraints**: T4 (sin HTML), T6 (tipo por contenido), FR-024 (`alt` obligatorio),
FR-025 (HTML servido), ADR-010 (sin cookies de terceros), max-lines 300, versiones exactas

**Scale/Scope**: decenas de entradas; una pantalla de admin, el índice y el artículo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- I Specification First: spec, research, data-model y ADR-034 escritos antes del código
- II TDD: tests del parser (figura/video, `<script>`), del caso de uso (rechazo de HTML y
  de video sin `alt`) y del sniff (SVG disfrazado) en rojo antes de implementar
- III Simplicidad: una dependencia (TipTap) justificada en el ADR; el documento canónico
  no se duplica
- IV Capas: el parser sigue en dominio; el editor es presentación; el puerto de admin no
  se llama desde `components/` hacia `infrastructure/supabase`
- V Seguro por defecto: lista blanca de MIME y de esquemas; CSP `media-src`; policies del
  bucket con `has_min_role` en escritura
- VI Accesibilidad: `alt` obligatorio, toolbar con `aria-label`, axe en admin y público
- VII Performance: Server Components en público; editor en `"use client"` y nada más
- XII Sin fallos silenciosos: video que no se puede leer dice por qué; nodo de media
  huérfano se omite, no se inventa una URL

Post-design: sin violaciones. El editor es `"use client"` con interactividad real
(FR-301). La policy `videos_select` se declara abierta en `check-rls.mjs` con el mismo
motivo que `fotos_select`.

## Project Structure

### Documentation (this feature)

```text
specs/003-novedades-blog/
├── plan.md
├── research.md
├── data-model.md
├── spec.md
├── quickstart.md
└── tasks.md
docs/adr/034-editor-novedades.md
```

### Source Code

```text
src/domain/rich-text.ts                         # nodos figure y video
src/domain/entities/media.ts                    # kind, bucketId
src/application/admin/updates.ts                # addUpdateVideo / upload de media
src/infrastructure/files/video.ts               # sniff MP4/WebM
src/infrastructure/supabase/admin/updates-port.ts
supabase/migrations/20260914120000_news_media.sql
components/admin/news-body-field.tsx            # textarea + editor
components/admin/news-editor*.tsx
components/design-system/rich-text.tsx          # interpola media
components/design-system/news-feed.tsx          # índice cronológico
components/screens/news-index-screen.tsx
app/(es)/admin/(panel)/novedades/**
```

## Complexity Tracking

| Violation | Why needed | Simpler alternative rejected because |
|---|---|---|
| Dependencia TipTap | Editor visual operable en teléfono | `contenteditable` a mano no cubre listas/undo/iOS |
| Bucket nuevo `videos` | Barrera de MIME y tamaño distinta a `fotos` | Un solo bucket mezclaría las dos puertas |
| `"use client"` en el admin | El editor es interactividad real | El POST sin JS sigue existiendo vía textarea |
