# Implementation Plan: La portada de la novedad es el primer visual

**Branch**: `main` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-portada-del-video/spec.md`

## Summary

Al subir un video, el admin extrae el fotograma 10 y lo guarda como JPEG de
portada. Esa imagen —o la primera foto, si el relato empieza con una— es la
tapa del índice, el `poster` del `<video>` y el `og:image` al compartir.
ADR-038 documenta la excepción a ADR-036.

## Technical Context

**Language/Version**: TypeScript 6, Next.js 16, React 19, Postgres 17

**Primary Dependencies**: las fijadas. Ninguna dependencia nueva (sin
ffmpeg).

**Storage**: `media.poster_path` / `poster_width` / `poster_height`; JPEG en
`fotos`

**Testing**: Vitest (`coverPhoto`, `pageMetadata`, `addUpdateMedia`,
`coverFrameSeekSeconds`), pgTAP del check, e2e de compartir sin cambio de
lista

**Target Platform**: sitio público + backoffice, 390 px primero

**Project Type**: aplicación web Next.js (App Router)

**Performance Goals**: el extractor no viaja al público; `/novedades` no
suma JS

**Constraints**: T4, T6, FR-024, ADR-034, ADR-036 enmendado por ADR-038,
max-lines 300, sin `ffmpeg`

**Scale/Scope**: un alta de media, tres columnas, metadata del artículo

## Constitution Check

- I Specification First: spec, research, data-model, ADR-038 antes del código
- II TDD: `coverPhoto`, metadata y el `poster` del caso de uso en rojo antes
- III Simplicidad: sin `cover_media_id`, sin ffmpeg, sin recorte 1200×630
- IV Capas: `coverPhoto` en dominio; extracción en el island del admin;
  olfato del JPEG en infraestructura
- V–XII: T6 (sniff del JPEG), I7 (un 404 no usa foto), omitir si no hay
  fotograma, sin `console.log`

Post-design: sin violaciones. La excepción social está escrita en el ADR
antes de tocar `pageMetadata`.

## Project Structure

### Documentation (this feature)

```text
specs/005-portada-del-video/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
docs/adr/038-portada-de-novedad.md
```

### Source Code

```text
supabase/migrations/20260914160000_video_poster.sql
src/domain/entities/media.ts              # poster* + CoverImage
src/domain/entities/update.ts             # coverPhoto
src/domain/video-cover.ts                 # fotograma 10, seek de respaldo
components/admin/extract-video-cover.ts   # canvas en el cliente
components/admin/news-editor-toolbar.tsx  # FormData.poster
src/application/admin/updates.ts          # poster al puerto
src/infrastructure/supabase/admin/updates-port.ts
src/infrastructure/seo/metadata.ts        # image opcional
components/screens/news-article-screen.tsx
components/design-system/rich-text.tsx    # video poster
```
