# ADR-032 · El relato mobile editorial: fotografía, aire y tres familias de acción

**Estado**: Aceptada · **Fecha**: 2026-09-13

Reemplaza a ADR-026 en la jerarquía, las acciones, las vistas previas y el índice de
capítulos. Conserva de ADR-025 la paleta, las fuentes, el orden del relato y las fotos
reales. Donde se aparta del mockup lo dice y dice por qué.

## Contexto

La dueña del proyecto revisó el sitio en un teléfono el 13 de septiembre de 2026 y el
diagnóstico fue de una frase: **se ve generado**. Tarjetas para todo, píldoras para
todo, cuatro acciones en la apertura, un índice horizontal de píldoras debajo de la
foto, una fila de botones en el encabezado, un tablero de donaciones con dos niveles
de píldoras, un pie con tres columnas de mapa del sitio. Cada pieza cumplía su regla y
el conjunto se leía como una landing de componentes.

El pedido no fue retocar radios ni colores: fue diseñar primero a 390 px una
**historia que se lee desplazándose**, con la fotografía como estructura y el diseño
detrás del relato. Referencia: reportaje editorial, fotografía documental, campaña
humanitaria. No SaaS, no dashboard, no colección de tarjetas.

## Decisión

1. **Se diseña a 390 px primero.** Cada token y cada componente se decide en un
   teléfono y después crece. `--text-display` mide 49 px ahí, `--text-headline` 40,
   el cuerpo 17 con interlínea 1.65. La escala de espacio es 4 · 8 · 12 · 16 · 24 ·
   32 · 48 · 64 · 80 · 96 · 120 y no hay otro valor. El radio es `sm` 6, `md` 10, `lg`
   16; `pill` queda para lo que es redondo por significado y hoy no lo usa nada
   público.

2. **Tres familias de acción, y ninguna más.** `PrimaryAction`: rectangular, radio
   medio, 56 px de alto y todo el ancho en teléfono; hay una por pantalla y dice
   «Ayudar a reconstruir». `SecondaryAction`: texto y flecha, sin caja, sin fondo,
   sin borde; la flecha se mueve 3 px al pasar el puntero. Utilitaria (`ICON_ACTION`):
   un icono de 44 px para copiar, cerrar, abrir el menú. Los iconos son una sola
   familia (`icons.tsx`): trazo 1.5, sin iconos de relleno. El logo del banco
   (Brubank o Scotiabank) entra al lado del nombre para distinguir la
   transferencia de Mercado Pago.

3. **El encabezado es el nombre y el menú.** 60 px, transparente sobre la foto de la
   apertura, papel con un desenfoque de 6 px y una regla casi imperceptible al
   desplazarse; fijo sobre papel en las interiores. El símbolo 01 ORIGINAL (el
   círculo verde, recortado, sin el wordmark) va a la izquierda del nombre, a 32 px
   ([ADR-035](./035-simbolo-de-la-marca.md)). En teléfono no hay más botones: el
   idioma, ingresar y la acción de ayudar viven dentro del menú a pantalla
   completa, que respeta las áreas seguras y entra con un escalón de 40 ms por
   ítem. En escritorio, Ingresar va al lado del idioma, como texto, sin caja.

4. **La apertura es una foto, no una franja.** 82 svh en teléfono, 90 en escritorio,
   a sangrado. Dirección de arte con `<picture>`: el fotograma vertical de esa noche
   en teléfono y el recorte 16:9 del mismo archivo en escritorio, cada uno precargado
   con su `media`. Encima, lo justo: la ubicación, el nombre en dos líneas, dos líneas
   de copy, la primaria y una secundaria. Un velo al pie con `data-scrim` es el único
   gradiente del sitio y tiene una función: que se lea.

5. **No hay índice de capítulos.** La página es la navegación. Los momentos se
   descubren desplazándose; en escritorio las secciones del sitio están en el
   encabezado.

6. **Cada momento abre igual y el aire separa.** `StoryHeading`: el numeral chico y la
   etiqueta en versales de 12 px con espaciado, en la voz de interfaz, y el titular
   grande. La sobrelínea vuelve a propósito y **sólo acá**, en los cinco momentos de
   la home, porque la dueña la pidió como marca del relato; en todo lo demás sigue
   prohibida y `revision-visual.spec.ts` la sigue midiendo. Entre momentos hay 80 px
   de aire en teléfono y 120 en escritorio (`StorySection`), y la superficie cambia
   con el relato: papel, bosque, papel hundido, carbón, papel.

7. **La fotografía es el sistema.** `EditorialImage` tiene cinco variantes —a
   sangrado, desplazada por la derecha, retrato a cinco sextos del ancho, en la medida
   de lectura, documental— y ninguna lleva radio ni borde. `DocumentaryGallery` compone
   lo que quedó de la casa (una foto que sale del grid y dos chicas debajo) y la gente
   que apareció (una vertical grande y otra que se le monta encima). Las fotos son
   las que hay, con su proporción real; ninguna se muestra más ancha que su archivo.

8. **Norma es un momento, no una sección.** La única banda carbón del sitio. El
   retrato real a cinco sextos del ancho del teléfono, sin círculo ni recorte, y la
   frase con la que la familia la describe como titular. Una secundaria para leer su
   historia. Nada más.

9. **Aportar es una decisión: desde dónde.** `DonationSelector` reemplaza al tablero:
   `CountrySelector` (Argentina, Chile, Internacional; tabs con teclado y una regla bajo
   el elegido) y, en Argentina y en Chile, dos cards: transferencia (Brubank
   o Scotiabank, cada uno con su logo) y Mercado Pago con su logo al lado del
   nombre. Adentro de la primera, `CopyField` —etiqueta chica,
   dato grande y tabular, icono de copiar que pasa a un tilde con «Copiado»
   durante 1,5 s—. La segunda es `ExternalPayment`: la marca, una línea, y un
   botón con los colores de esa marca y letra papel. Mercado Pago lleva la
   banderita de Argentina o de Chile; PayPal es la misma pieza para el resto del
   mundo. Sin JavaScript los tres países se apilan con su título y se transfiere igual.

10. **Las vistas previas dejan de ser tarjetas.** `PreviewCard` conserva el nombre
    y pierde la caja: foto sin radio, título y flecha, toda ella enlace. En la home no
    queda ninguna; en las interiores separa el aire, no el borde.

11. **La barra de ayudar es una barra nativa.** Papel, regla arriba, la primaria al
    ancho completo y `env(safe-area-inset-bottom)`. Baja con una transición de 420 ms
    cuando `#donaciones` o una primaria de la página están a la vista y queda inerte;
    vuelve a subir cuando salen. En la home arranca abajo, porque la apertura ya trae
    la acción.

12. **El pie es un colofón.** El nombre, el lugar, una fila de enlaces chicos y la
    línea legal, sobre papel. Las preguntas de la home se comprimen a una lista con
    la primera respuesta y un enlace; siguen en el HTML servido por SEO.

13. **Motion con jerarquía.** Fotos: opacidad y escala 1.03 → 1 en 700 ms. Titulares:
    opacidad y 16 px hacia arriba. Menú: escalón de 40 ms. Copiar: el icono pasa a
    tilde en 240 ms. Barra: `translateY`. Todo con `cubic-bezier(0.22, 0.7, 0.2, 1)`
    y nada con `prefers-reduced-motion: reduce`.

## Consecuencias

- `ChapterHeading`, `ChapterNav`, `ChapterEnd`, `DonationBoard`, `CountryTabs` y
  `DonationMethods` se borran. `ui.home.chaptersLabel` y `ui.home.quoteOverlay` salen
  del contenido.
- `check:marcas` sigue exigiendo el logo al lado del nombre de cada marca; el
  selector de país no lleva banderas: el nombre alcanza.
- `revision-visual.spec.ts` acepta el gradiente marcado con `data-scrim` y sigue
  rechazando cualquier otro, igual que las versales fuera de `data-kicker`.
- `aportes.spec.ts` se reescribe sobre el nuevo selector; `help-bar.test.tsx`
  comprueba el retiro por rol e `inert`, no por desmontaje.
- La QA visual se hace en 320, 375, 390, 393, 430, 768, 1024 y 1440 px, con
  atención especial a 390. «Compila» no es «está».
