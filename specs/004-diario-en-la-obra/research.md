# Research: El diario se lee donde está la obra

**Fecha**: 2026-09-14

## 1. Qué ya existe y no se usa

`media.caption` y `media.credit` están en la migración de 001, en el caso de
uso `addUpdateMedia` y en `Figure`. El panel de inserción de 003 sólo manda
`alt`. Completar el formulario no pide esquema nuevo.

`ui.reconstructionPage.photosNote` y `seeNews` están en los JSON y el schema.
`ReconstructionScreen` no los lee. El hueco es de pantalla, no de contenido.

`listUpdates` ya acepta `limit`. El test dice "en la home, donde se muestran
las últimas tres"; la home no las muestra, a propósito (ADR-032). El límite
sirve para `/reconstruccion` con `1`.

## 2. Miniatura, no portada social

ADR-036 decidió que `og:image` es siempre `/compartir/tarjeta`. Elegir una
foto de portada para WhatsApp contradiría esa decisión. Lo que sí falta es
cuál foto acompaña la fila del índice: hoy es `media.find(isPhoto)`, el primer
adjunto, aunque el relato empiece con un video o la foto esté al final.

Decisión: `coverPhoto(body, media)` en dominio. Primera foto nombrada en el
cuerpo; si no hay, primera foto adjunta; si no hay foto, `null`. Sin columna
`cover_media_id`.

## 3. Dónde vive el teaser

| Lugar | Qué pasa |
|---|---|
| Home | No. Cinco momentos, LCP, SC-001. Un sexto bloque es otra spec |
| `/reconstruccion` | Sí. El copy ya apunta al diario. Lighthouse de CI corre sin Supabase: la sección se omite y no suma foto ni prefetch |
| `/novedades` | Ya es el índice |

El teaser reusa `NewsFeedItem`. El enlace al índice es `SecondaryAction` con
`prefetch={false}` (lección de ADR-034: tres `Link` con prefetch rompieron el
presupuesto de JS).

## 4. RSS

Un `GET` en `/novedades.xml`, `application/rss+xml`, armado en el servidor a
partir de `listUpdates`. Sin TipTap, sin cliente. Un solo idioma: las
novedades se escriben en castellano. El índice declara `rel="alternate"`.

El cuerpo del ítem es el `excerpt`, no HTML. Escapar XML es la única
sanitización: no hay `dangerouslySetInnerHTML` en ningún lado del camino.

## 5. Reutilizar un adjunto

No hay caso de uso nuevo. El archivo ya está en `update_media`. El editor
inserta un nodo `workMedia` con el `mediaId` existente y serializa
`![alt](media:<uuid>)`. Guardar el cuerpo es `saveUpdate`, que ya existía.

Insertar desde la lista vive en el mismo isla cliente que el editor: la
pantalla servidor no puede llamar a TipTap.
