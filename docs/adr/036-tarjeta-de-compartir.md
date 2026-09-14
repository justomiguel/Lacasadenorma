# ADR-036 · Al compartir se ve el símbolo y el texto de esa página

**Estado**: Aceptada · **Fecha**: 2026-09-14

Complementa [ADR-035](./035-simbolo-de-la-marca.md): el círculo 01 ORIGINAL no
es sólo chrome. Es lo que Facebook, WhatsApp y X muestran cuando alguien pega
un enlace.

## Contexto

Hasta acá la home generaba una tarjeta de 1200×630 con el símbolo, el nombre y
**la foto del incendio**. Las interiores ponían una foto real de esa página:
el retrato en Norma, la portada del libro en el legado, la limpieza en Cómo
ayudar. Quien compartía `/norma` veía a Norma; quien compartía `/ayudar` veía
escombros. Las fotos estructuran las páginas ([ADR-021](./021-segunda-direccion-visual.md),
[ADR-032](./032-relato-mobile-editorial.md)), y parecía coherente que la previa
social fuera la misma foto.

El pedido del 14 de septiembre de 2026 es otro: **cuando se comparte, que
aparezca el icono**, con la descripción de la sección que se está compartiendo.
La foto sigue en la página. La tarjeta del enlace es la marca.

## Decisión

1. **Una sola composición para todas las URLs públicas.** 1200×630, papel, el
   círculo 01 ORIGINAL grande, un kicker, el título de **esa** página y la
   descripción SEO de **esa** página. Sin foto. El pie sigue siendo el lugar y
   el llamado a reconstruir.
2. **El copy sale del mismo paquete que `og:title` y `og:description`.** Home:
   el lugar, el nombre, `shortDescription`. Interiores: el nombre del sitio
   como kicker, el título de la página, su `seoDescription`. Una novedad
   publicada: su título y el extracto del cuerpo. Nada se inventa para llenar
   la tarjeta.
3. **La URL de la imagen no lleva el título.** Es
   `/compartir/tarjeta?ruta=/norma&lang=es`. La ruta es canónica castellana y
   está en una lista blanca. Un `ruta` que no existe no pinta el texto del
   atacante: vuelve a la home. Una novedad cuyo slug no está publicada usa el
   copy del índice, no el slug.
4. **Se borra `opengraph-image.tsx` de los layouts.** Esa convención de Next
   inyectaba la tarjeta de la home en el grupo de rutas y Facebook podía
   quedarse con ella. `pageMetadata` y `rootMetadata` declaran siempre
   `og:image` y `twitter:image` apuntando a `/compartir/tarjeta`.
5. **Las fotos de `PreviewCard` no se tocan.** Siguen estructurando las
   previas *dentro* del sitio. Dejan de ser `og:image`.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Foto de la página más un sello del símbolo en una esquina | Facebook recorta; el sello se pierde y vuelve a verse sólo la foto |
| Una tarjeta distinta por idioma como archivo `opengraph-image.tsx` en cada ruta | Doce páginas × dos idiomas = veinticuatro composiciones para el mismo dibujo |
| Pasar título y descripción en la query | Nuestro dominio serviría la previa que el atacante escriba |
| Dejar la foto en las interiores y el símbolo sólo en la home | El pedido es que *cualquier* enlace compartido lleve el icono |

## Consecuencias

- `src/infrastructure/seo/share-copy.ts` es la lista blanca. Un path nuevo sin
  entrada usa el copy de la home hasta que alguien lo agregue: mejor eso que
  un título inventado.
- `e2e/comun/compartir.spec.ts` exige que `og:image` contenga
  `/compartir/tarjeta` y que la imagen sea un PNG que responde 200. En `/norma`
  la descripción de Open Graph es la SEO real de Norma.
- La fotografía sigue siendo la estructura de las páginas. Lo que cambia es
  el recuadro de 1200×630 que ve quien todavía no abrió el enlace.
- [ADR-038](./038-portada-de-novedad.md) abre una excepción: una novedad
  publicada **con** portada usa esa imagen como `og:image`. El resto de las
  URLs —incluida una nota sin foto ni fotograma— sigue esta decisión.
