# ADR-038 · La portada de una novedad es el primer visual, también al compartir

**Estado**: Aceptada · **Fecha**: 2026-09-14

Enmienda [ADR-036](./036-tarjeta-de-compartir.md) **sólo** para una novedad
publicada que tiene portada. El resto de las URLs públicas sigue mostrando el
símbolo. Completa [ADR-034](./034-editor-novedades.md): un video ya no llega
sin imagen de arranque.

## Contexto

Hasta acá valían dos reglas juntas:

1. La miniatura del índice era una **foto**. Un video no hacía de tapa: no se
   inventaba un fotograma (003, 004).
2. Al pegar cualquier enlace, Facebook y WhatsApp veían la tarjeta del
   símbolo, nunca una foto (ADR-036).

El pedido del 14 de septiembre de 2026 es otro: **si se sube un video, el
fotograma 10 es la portada de la noticia**. Esa misma imagen es la que se ve
al compartir. Si lo primero es una foto, esa foto es la portada —en el
índice, en la obra y en la previa social.

Sin esto, una entrada que es sólo el video de la colada se comparte con el
símbolo, y el índice no muestra nada de lo que ocurrió.

## Decisión

1. **Al subir un video se extrae el fotograma número 10** (el décimo, no el
   segundo 10). Se guarda como JPEG en el bucket `fotos`, colgado de la fila
   del video (`poster_path`, `poster_width`, `poster_height`). No es una
   segunda fila de `media`: no aparece al final del artículo.
2. **Si el video tiene menos de diez fotogramas, se usa el último.** Si el
   navegador no puede extraer ninguno, el video se guarda igual y la novedad
   queda sin portada de video.
3. **La extracción corre en el backoffice, en el cliente.** El admin ya
   exige JavaScript para insertar. Mandar el JPEG en el mismo `FormData`
   evita meter `ffmpeg` en Vercel (decenas de megas y un binario que el
   runtime no trae). El servidor no confía en el cliente: olfatea el JPEG
   por contenido (T6) y lee las medidas del encabezado, igual que una foto.
4. **`coverPhoto` es el primer visual del relato.** Primera foto o primer
   video con póster que el cuerpo nombra; si el cuerpo no nombra ninguno, el
   primer adjunto que tenga imagen. Un video sin póster se saltea.
5. **Excepción puntual a ADR-036.** `og:image` y `twitter:image` de
   `/novedades/{slug}` usan la portada cuando existe. El resto de las URLs
   públicas —incluida una novedad sin foto ni póster, y el 404 de un slug
   inventado— siguen usando `/compartir/tarjeta`.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| `ffmpeg` / `ffmpeg-static` en el servidor | ~70 MiB en el bundle de la función; Vercel no lo trae. El admin ya corre con JS |
| Una fila `media` extra para el fotograma | Aparecería al final del artículo, como los adjuntos que el texto no nombra |
| Seguir sin fotograma y usar la tarjeta de la marca en el video | Es exactamente lo que este pedido deja atrás |
| Columna `cover_media_id` elegida a mano | El pedido es automático: el primer visual. Un selector es otra spec |
| Inventar el fotograma 10 en el servidor parseando el contenedor | Es lo que 003 prohibía. Acá el fotograma lo decodifica el navegador, que ya tiene el codec |

## Consecuencias

- Los videos subidos antes de esta decisión no tienen póster. No se
  recorre el bucket para inventarles uno.
- `e2e/comun/compartir.spec.ts` sigue exigiendo `/compartir/tarjeta` en las
  páginas de `PAGINAS_PUBLICAS`. La excepción se afirma en unitario sobre
  `pageMetadata` y `coverPhoto`: el fixture de novedades no trae media.
- El `<video>` público lleva `poster` cuando hay fotograma, para que el
  hueco no sea un rectángulo vacío antes de darle play.
