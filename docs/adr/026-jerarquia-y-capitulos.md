# ADR-026 · Capítulos visibles, una sola clase de acción y las tres formas de ayudar en pestañas

**Estado**: Aceptada · **Fecha**: 2026-09-13

Complementa ADR-025. El mockup sigue siendo la fuente de verdad para la paleta,
la tipografía, los botones píldora, el header superpuesto y el orden del relato.
Este ADR corrige lo que la implementación del mockup no resolvía: **la jerarquía
no se leía**. Donde este ADR se aparta del mockup lo dice, y dice por qué.

## Contexto

La dueña del proyecto revisó el sitio el 13 de septiembre de 2026 y describió el
problema en cinco frases: la jerarquía visual no se entiende; las imágenes no son
responsivas; no hay jerarquía en los enlaces; las vistas previas no son tarjetas;
no se sabe dónde termina una cosa y dónde empieza otra. Y una sugerencia: las
formas de ayudar podrían ir en pestañas.

Mirado con capturas en 390, 768, 1024 y 1440 px, cada frase tenía una causa
concreta:

- **Los límites.** Cinco capítulos sobre el mismo beige, separados sólo por 176 px
  de aire y una etiqueta en versales de 12 px. «Cómo ayudar», «Donaciones» y
  «Norma» eran tres secciones seguidas sin ningún cambio de superficie ni regla.
- **Los enlaces.** Cuatro estilos para el mismo rango de acción: píldora bosque,
  píldora sage, píldora con borde, y un subrayado chico con flecha (`Ver la
  historia →`, `Leer su historia →`) al final de secciones enteras, que se perdía.
- **Las vistas previas.** La de Norma y la del legado eran prosa suelta con un
  enlace al final. Nada decía «esto es una puerta a otra página».
- **Dos veces «cómo ayudar».** Tres tarjetas con un botón que bajaba a la sección
  siguiente, que era el tablero de donaciones. Eran una sola decisión con tres
  respuestas, presentada como dos secciones.
- **Las fotos.** La apertura estiraba a 1440 px un recorte de collage de **602 px
  de ancho**; en el ensayo, la primera foto de un tramo impar ocupaba dos columnas
  aunque midiera 602 px; y las grillas mezclaban proporciones sin recortar, así
  que las filas quedaban desparejas según el ancho.

## Decisión

1. **Cada capítulo abre igual y cierra igual.** Abre con `ChapterHeading`: el
   numeral grande en la serif de display, el nombre del capítulo en la voz de
   interfaz, sin versales, y el título. Cierra con `ChapterEnd`: una sola acción
   secundaria hacia su página. Los capítulos alternan superficie —papel, bosque,
   papel hundido, papel, bosque—; sobre la misma superficie, una regla.
2. **Índice de capítulos bajo la apertura.** `ChapterNav`: los cinco capítulos con
   su numeral, cada uno un ancla, sobre una banda hundida con reglas. Es el
   sumario de una publicación y a la vez el corte entre la foto de la apertura y
   el relato. En teléfono se desplaza en horizontal.
3. **Tres clases de acción y no más.** Primaria (píldora bosque o sage): sólo
   «Ayudar a reconstruir». Secundaria (píldora con borde, tono bosque o papel
   según la banda): ir a otra página al cierre de un capítulo. Enlace de prosa
   (subrayado): dentro de un párrafo, en las preguntas y en el pie. Desaparece el
   «texto chico con flecha» como cierre de sección.
4. **Las vistas previas son tarjetas.** `PreviewCard`: borde de regla, superficie
   propia, foto recortada a 3:2, línea de acción al pie; toda la tarjeta es el
   enlace. Sin sombra. La previa de Norma en la home es una tarjeta grande con el
   retrato entero en 4:5; el índice de novedades es una grilla de tarjetas.
5. **Las tres formas de ayudar son pestañas de un solo capítulo.** `HelpTabs`
   sobre `SectionTabs`: «Aportar dinero» (el tablero de donaciones, abierto por
   defecto), «Dar una mano» y «Donar materiales», cada una con su contacto
   adentro. El estilo del primer nivel es una regla con la pestaña marcada, no una
   píldora, para que se distinga del segundo nivel (los canales). Sin JavaScript,
   los tres paneles se apilan y se leen enteros. Vale en la home y en `/ayudar`.
6. **Las fotos se muestran al tamaño que su archivo permite.** La apertura usa una
   de las dos fotos de esa noche, que miden 1220 px, y no el interior de 602 px
   que pedía el mockup; el interior pasa al capítulo 01, donde entra sin
   estirarse. En el ensayo, una foto sólo ocupa dos columnas si mide al menos
   1000 px, y tres fotos chicas van a tres columnas. En las grillas y tarjetas,
   `Figure` recorta a una proporción fija (`crop`) con tokens `--aspect-*`; en los
   ensayos conserva la proporción real.
7. **El ritmo baja un escalón.** `Section` pasa de 64/88 px a 48/64 px de aire.
   Con bandas y reglas marcando dónde empieza cada sección, el aire ya no separaba:
   alejaba.
8. **El héroe no estira un JPEG de 1220 px.** La foto de esa noche mide 1220×1568.
   A sangrado, un escritorio 1440 a 2x pide ~2880 px: de ahí la pixelación. El
   héroe usa un recorte 16:9 del **mismo archivo**, agrandado a 2880×1620
   (`incendio-bomberos-frente-hero.jpg`). No se genera otra toma del incendio.

## Consecuencias

- `HelpWays` desaparece. `ui.home` pierde `scrollHint`, `openingNeed`,
  `remoteTitle`, `remoteBody` y `chapterDonate`, y gana las etiquetas de las
  pestañas, el índice y el cierre del capítulo de la comunidad.
- Los tamaños `--text-card` y `--text-chapter` entran al tema. Los títulos dentro
  de tarjetas y paneles usan `text-card`, un escalón por debajo de `heading`, para
  no competir con el título del capítulo.
- `SecondaryAction` tiene `tone` en lugar de recibir clases sueltas que `cn` no
  puede resolver.
- Las versales dejan de usarse en las etiquetas de capítulo. La compuerta de
  `revision-visual.spec.ts` que las permitía en `data-kicker` sigue, pero ya no
  hay nada que la necesite en la home.
- `.cursor/rules/diseno.mdc` se actualiza en el mismo commit: el mockup sigue
  mandando en dirección de arte; en jerarquía, límites y acciones manda este ADR.
