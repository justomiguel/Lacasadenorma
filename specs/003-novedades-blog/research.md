# Research: Novedades como diario de la obra

**Fecha**: 2026-09-14

## 1. Dónde está hoy el cuerpo de una novedad

El parser del dominio (`src/domain/rich-text.ts`) produce párrafos, un `h3`, listas, citas y
tres marcas en línea. No produce HTML. El test del `<script>` es la compuerta de T4. Guardar
HTML en `updates.body` obligaría a tirar esa garantía y a confiar en un sanitizer.

**Decisión**: el documento canónico no se toca. Se le agregan dos bloques que apuntan a
`media` por uuid.

## 2. Editor visual: TipTap contra escribirlo

Principio III: una dependencia nueva se justifica contra escribir el código. Un
`contenteditable` que haga bien listas, deshacer y el teclado de iOS es un proyecto. TipTap
es ProseMirror con un wrapper de React; se carga sólo en `/admin`. El POST sigue mandando
`body` como texto.

Paquetes, versión exacta, sin `latest`: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`,
`@tiptap/extension-link`, `@tiptap/extension-placeholder`. Se desactivan code, codeBlock,
strike, orderedList y cualquier heading que no sea nivel 3.

**Decisión**: TipTap en el admin, textarea como degradación, Markdown como persistencia.

## 3. Video: subir contra incrustar

Incrustar YouTube es la solución barata y trae cookies, un `iframe` y un video que puede
desaparecer. ADR-010 prometió un sitio sin cookies de terceros. El pedido era subir.

Storage ya decía, en la migración de los buckets, que `fotos` no acepta video. Un bucket
nuevo con 50 MiB y `video/mp4` + `video/webm` es la barrera que un formulario no puede
olvidar. El tipo se husmea por firma, igual que las fotos (T6): un MP4 es un `ftyp` que no
es `avif`; un WebM empieza en EBML.

**Decisión**: bucket `videos`, público, mismas policies que `fotos`. CSP `media-src` al
origen de Supabase. Sin oEmbed.

## 4. El índice: feed contra grilla

`news-index-screen.tsx` ya describe un sumario de revista —fecha, título, dos líneas, una
foto en la columna angosta— y renderiza una grilla de `PreviewCard`. El pedido pide un feed
que se acumula. Las dos cosas coinciden: se implementa lo que el comentario ya decía.

**Decisión**: lista cronológica inversa, una entrada debajo de la otra, separadas por la
regla, no por una grilla.

## 5. Compatibilidad con lo publicado

Hay novedades en el fixture y, en producción, las que se hayan escrito. Su `body` no tiene
nodos `media:` / `video:`. Sus fotos viven en `update_media` y se muestran con `PhotoEssay`
al final.

**Decisión**: el artículo interpola los nodos del cuerpo y, después, muestra los adjuntos
que el cuerpo no nombró. Cero migración de filas.
