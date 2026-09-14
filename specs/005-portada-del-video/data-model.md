# Data model: Portada del video

Delta sobre `specs/003-novedades-blog/data-model.md`. Lo que no se nombra no
cambia.

## `media`, columnas nuevas

| Columna | Tipo | Notas |
|---|---|---|
| `poster_path` | `text` | Clave en el bucket `fotos`. Null en fotos y en videos sin fotograma |
| `poster_width` | `integer` | Medidas reales del JPEG, para `next/image` y Open Graph |
| `poster_height` | `integer` | Idem |

Check nuevo `media_poster_matches_kind`:

- `kind = photo` ⇒ los tres campos nulos.
- `kind = video` ⇒ o los tres nulos, o `poster_path` no nulo y
  `poster_width > 0` y `poster_height > 0`.

No hay fila extra. No hay `cover_media_id`. `coverPhoto` se sigue derivando
del cuerpo y de `media`.

## Storage

El JPEG usa el bucket `fotos` que ya existe. No hay bucket nuevo ni policy
nueva. `videos` no acepta JPEG: por eso el póster no vive ahí.

## Políticas

Ninguna. Un póster es un objeto más de `fotos`, escrito por `editor`+ como
cualquier foto. SELECT público: el archivo se sirve por CDN, igual que el
video (misma asimetría ya declarada en `scripts/check-rls.mjs`).

## Dominio

`MediaAsset` gana `posterUrl`, `posterWidth`, `posterHeight` (null en fotos
y en videos viejos). `CoverImage` es `{ url, alt, width, height }`.
`coverPhoto` devuelve `CoverImage | null`.
