# Tasks: La portada de la novedad es el primer visual

**Input**: Design documents from `/specs/005-portada-del-video/`

- [x] T001 Spec, research, data-model, plan, ADR-038
- [x] T002 Tests en rojo: `coverPhoto` con póster; `pageMetadata` con `image`;
      `addUpdateMedia` pasa `poster`; `coverFrameSeekSeconds`
- [x] T003 Migración `poster_*` + check `media_poster_matches_kind` + tipos
- [x] T004 Dominio: `CoverImage`, campos de póster, `coverPhoto` primer visual
- [x] T005 Admin: extraer fotograma 10, mandarlo; puerto guarda JPEG en `fotos`
- [x] T006 Artículo: `og:image` de la portada; `<video poster>`; feed usa
      `CoverImage`
- [ ] T007 pgTAP del check; `npm run verify`
