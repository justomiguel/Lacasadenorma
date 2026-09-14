# Contract: RSS del diario

`GET /novedades.xml`

- Content-Type: `application/rss+xml; charset=utf-8`
- Canal: título `Novedades — {site.name}`, link `{siteUrl}/novedades`,
  descripción la `seoDescription` del índice, idioma `es-AR`
- Ítem por novedad publicada: `title`, `link` canónico castellano,
  `guid` igual al link, `pubDate` RFC 822, `description` el excerpt
- Orden: `published_at` descendente
- Borradores: ausentes
- Cuerpo: texto escapado, no HTML del Markdown
- Sin sesión, sin cookies. `404` no: un canal vacío es un RSS válido con
  cero ítems (la fuente no configurada también: no se afirma que no hay
  novedades; el canal existe y está vacío)
