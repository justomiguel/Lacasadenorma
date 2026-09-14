# ADR-034 · El cuerpo de una novedad se edita a ojo y se guarda como árbol, no como HTML

**Estado**: Aceptada · **Fecha**: 2026-09-14

## Contexto

Quien publica el avance de la obra lo hace desde el teléfono, a menudo parada en la obra
(SC-009). Hasta hoy el cuerpo de una novedad es un `<textarea>` de Markdown restringido: el
subconjunto vive en el dominio (`src/domain/rich-text.ts`), el renderizador produce nodos de
React y **no existe** un nodo que represente HTML crudo. Esa forma es la mitigación de la
amenaza T4 (XSS de administración).

El pedido nuevo es un editor visual con fotos y videos intercalados en el relato, y un índice
que se lea como diario. Un WYSIWYG típico guarda HTML y lo reinyecta con
`dangerouslySetInnerHTML`. Eso reabre T4 de un saque, y además contradice ADR-010: un `iframe`
de YouTube o Vimeo trae cookies de un tercero a un sitio que se prometió sin ellas.

Hay que resolver tres cosas juntas: que se pueda escribir sin conocer Markdown, que una foto o
un video vivan donde quien escribe los puso, y que la garantía estructural contra XSS no
pase a depender de un sanitizer.

## Decisión

**El documento canónico no cambia.** `updates.body` sigue siendo el Markdown restringido del
dominio. Se agregan dos bloques, y ninguno más:

```
![qué se ve](media:<uuid>)
![qué se ve](video:<uuid>)
```

El parser produce nodos `figure` y `video` que apuntan a una fila de `media`. El renderizador
público los traduce a `<figure>` + `next/image` o a `<video controls>`. Sigue sin haber
`dangerouslySetInnerHTML`. Un `<script>` escrito en el cuerpo sale como texto y React lo
escapa. Un `![x](https://sitio-ajeno/tracker.png)` no produce nodo de media: la lista de
esquemas es blanca (`media:` y `video:`).

**El editor visual es una superficie del backoffice.** TipTap (ProseMirror) corre sólo en
`/admin/novedades`. Serializa al Markdown del dominio en cada cambio y lo escribe en un
`<textarea name="body">` que el POST ya conocía. Sin JavaScript, ese textarea es el
formulario. El paquete **no** se carga en las páginas públicas: FR-025 y el presupuesto de
ADR-018 lo exigen. La dependencia se justifica contra escribir un `contenteditable` propio:
listas, deshacer y el teclado de un teléfono son un pantano conocido; TipTap no viaja al
público y no toca el documento canónico.

**Los videos se alojan acá.** Bucket público `videos`, `video/mp4` y `video/webm`, 50 MiB, tipo
por contenido. Misma asimetría que `fotos`: esconder la fila no escondería el archivo. La CSP
abre `media-src` al origen de Supabase. No hay oEmbed, no hay `iframe`, no hay URL de YouTube
convertida en reproductor.

**`media` distingue foto de video.** `kind` (`photo` | `video`) y `bucket_id` (`fotos` |
`videos`), con `check` de que coincidan. `alt_text` sigue siendo obligatorio. Las fotos
siguen yendo a `fotos` con 10 MiB; un video no entra ahí (el comentario original de la
migración 20260909120600 lo decía en voz alta).

**El índice es un feed.** `/novedades` lista de la más reciente a la más antigua, fecha
visible, título, recorte, foto si hay. No es una grilla de tarjetas. El artículo interpola los
medios del cuerpo; los adjuntos que el texto no nombra se siguen mostrando después, para no
romper las entradas ya publicadas.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Guardar HTML y sanearlo con DOMPurify | La garantía deja de ser estructural: un sanitizer se configura mal una vez y T4 vuelve. El dominio hoy no tiene un nodo de HTML a propósito |
| Markdown visual (EasyMDE, Milkdown) sin nodos de media | Resuelve el teclado, no las fotos en el relato ni el video |
| YouTube / Vimeo por URL | Cookies de un tercero (ADR-010), `iframe` (T4), dependencia de que el video no se baje. El pedido era *subir* |
| Un solo bucket `fotos` que también acepte video | El límite de 10 MiB y la lista de MIME son la barrera que un formulario nuevo no puede olvidar. Mezclarlos es dejar que un video pase por la puerta de las fotos |
| JSON de ProseMirror en `body` | Rompe las entradas ya publicadas y duplica la fuente de verdad. El Markdown restringido ya era el documento |
| Editor escrito a mano sobre `contenteditable` | Listas, undo y teclado móvil son el motivo por el que existe ProseMirror. La dependencia queda confinada al admin |

## Consecuencias

- `parseRichText` gana dos nodos. `excerpt` no usa el `alt` de una figura: el resumen de la
  metadata es el relato, no la descripción de la foto.
- TipTap entra en `package.json` con versión exacta. Si mañana no se puede justificar contra
  el textarea, se saca: el POST no lo extraña.
- La CSP (`media-src`) se abre al storage. Sin eso el `<video>` queda en silencio y parece un
  bug de la página.
- El flujo de dos pasos se mantiene: el alta no inserta media (no hay `id`); la pantalla de
  la novedad sí. Publicar sigue siendo un acto aparte.
- Una novedad vieja, con fotos sólo en `update_media`, se sigue viendo. No hay migración de
  contenido.
- El índice vacío no carga fotos de otras páginas ni prefetch del JS de esos
  destinos. Tres previas dejaban el LCP en 3 000 ms; tres `Link` con prefetch
  dejaban 206 KiB de scripts contra 200. Los destinos van en el texto, sin
  adelantar el bundle.
