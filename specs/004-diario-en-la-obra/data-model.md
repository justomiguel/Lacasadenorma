# Data model: El diario se lee donde está la obra

Sin migración. Las tablas de 001 y 003 alcanzan.

## Derivados, no columnas

| Dato | De dónde sale |
|---|---|
| Miniatura de una entrada | `coverPhoto(body, media)`: primera foto del cuerpo, si no la primera adjunta |
| Teaser en `/reconstruccion` | `listPublishedUpdates(campaignId, 1)` |
| Ítems del feed | la misma lista pública, sin límite de recorte en esta versión (decenas) |

## `media`, campos que pasan a usarse

| Campo | Obligatorio | Notas |
|---|---|---|
| `alt_text` | sí | sin cambio: ≥ 10, no es el nombre del archivo |
| `caption` | no | vacío → `null` |
| `credit` | no | vacío → `null` |

No hay `update` de un medio después de subido en esta versión: epígrafe y
crédito se cargan al insertar. Corregirlos es volver a subir, o queda para
otra spec.

## RSS

No es una tabla. Es una representación de `updates` publicados. Un borrador
no tiene fila en esa representación porque el puerto público no lo devuelve.
