# Quickstart: Novedades como diario

## Escribir

1. Entrar a `/admin/novedades` con rol `editor` o más.
2. Título, dirección web, texto en el editor (o en el área de texto si no hay JS).
3. Guardar borrador: lleva a `/admin/novedades/{id}`.
4. En esa pantalla, intercalar foto o video desde la barra del editor. Cada uno pide
   qué se ve antes de subir.
5. Publicar. Recién ahí existe `/novedades/{slug}`.

## Leer

- `/novedades` lista de la más nueva a la más vieja, con fecha.
- `/novedades/{slug}` es el artículo. Se comparte esa URL.

## Verificar

```bash
npm run test -- src/domain/rich-text.test.ts src/application/admin/updates.test.ts src/infrastructure/files/video.test.ts
npm run db:verify
npm run test:e2e:con-datos -- e2e/con-datos/publicar.spec.ts
npm run verify
```
