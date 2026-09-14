# ADR-035 · El símbolo de la marca es el círculo 01 ORIGINAL

**Estado**: Aceptada · **Fecha**: 2026-09-14

Enmienda el punto 3 de [ADR-032](./032-relato-mobile-editorial.md) (el encabezado
sigue siendo el nombre y el menú: ahora el nombre lleva el símbolo al lado) y
reemplaza el favicon de [ADR-022](./022-medicion-de-performance.md) (sigue
habiendo icono, para que `/favicon.ico` no 404; cambia *cuál*).

## Contexto

El 14 de septiembre de 2026 llegó la lámina de identidad de La Casa de Norma:
doce variantes del mismo símbolo (un perfil de mujer de cuya boca salen ondas,
adentro de un círculo) más una fila de favicons y una variante redonda para
app o perfil.

Hasta acá el sitio no tenía esa marca. El encabezado era el nombre en Playfair
versales. El favicon era una casa terracota dibujada a escuadra, heredada de la
paleta que [ADR-024](./024-tercera-direccion-visual.md) abandonó. Los dos
desmentían la identidad que la lámina acaba de fijar.

## Decisión

1. **La variante que se usa es la 01 ORIGINAL**: círculo verde principal, perfil
   en papel. Es la que nombra la lámina como original, y el verde es el del
   sitio (`#153A2E`), no el terracota que ya no se usa.
2. **Se recorta el círculo, no el lockup.** El wordmark de la lámina («La Casa
   de Norma / RIACHO HE-HÉ») no entra al archivo. El sitio ya escribe el nombre
   en Playfair, en el tamaño del encabezado, y el lugar va en el pie. Meter el
   lockup entero duplicaría el texto y pelearía con la serif del sistema.
3. **El recorte vive en `public/marca/simbolo.png`**, no en `public/marcas/`
   (ése es el catálogo de terceros: PayPal, Mercado Pago, los bancos). El
   símbolo acompaña el nombre en el encabezado, el menú, el pie, el
   backoffice, **el login**, las pantallas de cuenta y los documentos
   legales. A 32 / 32 / 48 / 24 px según la escala de espacio. No es un
   logotipo SaaS enorme: el encabezado sigue midiendo 60 px.
4. **El favicon es el mismo recorte**, no la casa terracota. `app/icon.png`
   (32×32), `app/apple-icon.png` (180×180, opaco: iOS pinta de negro la
   transparencia) y `app/favicon.ico` (16 / 32 / 48) salen de ese círculo.
   `/favicon.ico` tiene que responder 200: un 404 baja Lighthouse y es el
   defecto que ADR-022 ya pagó una vez.
5. **JSON-LD `Organization.logo` apunta al PNG público.** Es un dato verdadero
   —el símbolo existe y se ve— y Google lo pide. No se inventa otro archivo
   «para SEO».
6. **Las doce variantes de la lámina (y las tres redondas de perfil) se recortan
   y se catalogan**, cada una con la superficie en la que va. El sitio pinta
   **original**. El resto está para no volver a abrir la lámina: un avatar, un
   fondo negro, un monocromo de imprenta. La 05 TERRACOTA se guarda y **no se
   usa en producto** ([ADR-024](./024-tercera-direccion-visual.md)). Catálogo:
   `content/marca.ts`. Compuerta: `npm run check:marca`.
7. **Al compartir, la previa es el símbolo más el texto de esa página**, no una
   foto del incendio ni del retrato. Lo desarrolla [ADR-036](./036-tarjeta-de-compartir.md).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| El lockup círculo + wordmark como imagen del encabezado | Duplica el nombre, no escala con la serif, y en inglés el sitio seguiría mostrando un PNG en castellano |
| La variante 07 OSCURO en el menú bosque y la 01 en papel | Dos archivos para el mismo símbolo. La 01 trae su propio campo crema y se lee sobre foto, papel y bosque |
| Recortar los cuadraditos de 32 px de la fila FAVICON | En la lámina miden ~70 px y al bajarlos a 32 quedan más blandos que el círculo a 198 px reducido |
| Dejar el SVG de la casita terracota | Es la paleta que ADR-024 mató; contradice la lámina el día que llega |
| Un SVG redibujado a mano | La dueña mandó recortar *esta* lámina, no reinterpretarla |

## Consecuencias

- `app/icon.svg` se borra. Next toma `icon.png`, `apple-icon.png` y `favicon.ico`.
- `components/site/mark.tsx` es la única pieza que sabe la ruta y las medidas.
  El test lee el IHDR del PNG: si el archivo se mueve o se recorta de nuevo y
  nadie actualiza las medidas, falla. `PageHeader` lo pinta cuando `mark` es
  verdadero: cuenta, legales y 404. El login del backoffice pone el círculo
  como membrete de la página, sin repetir el nombre: lo dice el encabezado.
- La tarjeta de Open Graph es el símbolo y el copy de **esa** página (ADR-036).
  WhatsApp ve la misma marca que el encabezado, no una foto recortada.
- El encabezado gana ~40 px a la izquierda (símbolo 32 + hueco 8). En 320 px el
  nombre sigue en una línea: se revisó.
- `public/marca/` es el catálogo de la marca propia. `public/marcas/` sigue
  siendo el de terceros. Las dos carpetas no se mezclan.
