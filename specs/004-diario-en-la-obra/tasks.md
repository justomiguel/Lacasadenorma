# Tasks: El diario se lee donde está la obra

**Input**: Design documents from `/specs/004-diario-en-la-obra/`

- [x] T001 Spec, research, data-model, plan y contrato RSS
- [x] T002 Tests de `coverPhoto`: foto del cuerpo, video primero, adjunto sin nombrar, sin foto
- [x] T003 Tests del caso de uso: caption y credit se persisten; vacíos quedan `null`
- [x] T004 Tests del RSS: orden, borrador ausente, XML escapado, canal vacío
- [x] T005 `coverPhoto` en dominio y uso en el índice
- [x] T006 Panel de inserción: epígrafe y crédito; biblioteca de adjuntos en el editor
- [x] T007 Teaser en `/reconstruccion` con `limit: 1`, omitir si no hay, `prefetch={false}`
- [x] T008 Route handler `/novedades.xml` y `rel=alternate` en el índice
- [x] T009 Copy `latestHeading`; e2e de la obra y del feed; `npm run verify`
