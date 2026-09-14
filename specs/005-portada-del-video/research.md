# Research: La portada de la novedad es el primer visual

**Fecha**: 2026-09-14

## 1. Dónde extraer el fotograma 10

| Opción | Qué pasa |
|---|---|
| `ffmpeg` / `ffmpeg-static` en `createMedia` | El runtime de Vercel no trae ffmpeg. `ffmpeg-static` suma ~70 MiB a la función. Es la opción que 003 descartó al decir "no se inventa un fotograma" en el servidor |
| Decodificar MP4/WebM a mano | Un parser de contenedor en el camino de una subida. Superficie de ataque y código que no existe |
| `requestVideoFrameCallback` + canvas en el admin | El backoffice ya exige JS para insertar (ADR-034). El navegador ya decodificó el archivo que la persona eligió. El décimo callback es el fotograma 10. Si no hay rVFC, se busca `(10 - 1) / 30` segundos, o el final si el video es más corto |

**Decisión**: extraer en el cliente, mandar el JPEG, validar en el servidor
como cualquier foto (T6).

## 2. Dónde guardar el JPEG

Una segunda fila de `media` con `kind = photo` aparecería al final del
artículo: 003 muestra los adjuntos que el texto no nombra. El pedido es
portada, no una foto más.

**Decisión**: columnas nullable en la fila del video
(`poster_path`, `poster_width`, `poster_height`). El archivo vive en
`fotos` (JPEG, 10 MiB, mismas policies). El video sigue en `videos`.

## 3. Qué contradice ADR-036

ADR-036 dice: todas las URLs públicas usan `/compartir/tarjeta`. El pedido
nombra Facebook. Una novedad con foto de la obra que se comparte con el
símbolo no cumple.

**Decisión**: excepción puntual documentada en ADR-038. Sólo
`/novedades/{slug}` publicado **con** `coverPhoto`. El índice, Norma, Ayudar
y una nota sin imagen siguen con la tarjeta. El e2e de `PAGINAS_PUBLICAS` no
cambia: el artículo con media no está en esa lista.

## 4. Qué es "fotograma número 10"

No es el segundo 10. Es el décimo cuadro presentado, 1-indexado. En rVFC,
diez callbacks. Si el archivo termina antes, el último cuadro que el
decodificador dibujó. No se rellena ni se recorta a 1200×630: Facebook
acepta otras medidas; inventar un recorte sería otro dato.
