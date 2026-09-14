# Data model: Novedades como diario

Delta sobre `specs/001-sitio-publico-campana/data-model.md`. Lo que no se nombra acá no
cambia.

## `media`

| Columna | Tipo | Notas |
|---|---|---|
| `kind` | enum `media_kind` | `photo` \| `video`. Default `photo` para las filas ya existentes |
| `bucket_id` | `text` | `fotos` o `videos`. Default `fotos` |
| `storage_path` | `text` | Clave dentro de ese bucket |
| `alt_text` | `text not null` | Sigue obligatorio también para un video (FR-024, FR-304) |
| `width`, `height` | `int` | Foto: medidas reales. Video: las del encabezado, o 1920×1080 si no se pueden leer |

Checks nuevos:

- `media_kind_matches_bucket`: foto ⇒ `fotos`, video ⇒ `videos`.
- `alt` no en blanco y no es nombre de archivo: ya existían; valen para los dos `kind`.

## `updates.body`

Sigue siendo `text`. El subconjunto de Markdown gana dos bloques, cada uno en su propia
línea, separados por una línea en blanco:

```
![Cabriadas de madera apoyadas sobre los muros](media:11111111-1111-4111-8111-111111111111)

![La colada del contrapiso, de un extremo al otro](video:22222222-2222-4222-8222-222222222222)
```

No hay HTML. No hay `![alt](https://…)`. Un esquema que no sea `media:` o `video:` queda
como texto.

## Storage

Bucket nuevo `videos`:

| | `fotos` (sin cambio) | `videos` |
|---|---|---|
| Público | sí | sí |
| Límite | 10 MiB | 50 MiB |
| MIME | jpeg, png, webp, avif | mp4, webm |
| SELECT | `anon` + `authenticated` | igual |
| INSERT / UPDATE | `editor`+ | igual |
| DELETE | `admin`+ | igual |

SVG sigue fuera de **todos** los buckets (T6).

## Políticas

Ninguna policy nueva sobre `media` ni `update_media`: un video es otra fila de las mismas
tablas. `videos_select` sobre `storage.objects` alcanza a `authenticated` sin chequear rol
por el mismo motivo que `fotos_select` (el archivo es público). Se declara en
`scripts/check-rls.mjs`.

## Auditoría

Nueva acción `update.video_added`, colgada de la novedad, con el `media_id` y el `alt` en el
`diff`. `update.photo_added` no cambia.
