# ADR-022 · Estrangular la red de verdad en lugar de simularla

**Estado**: Aceptada · **Fecha**: 2026-09-12 · **Reemplaza los umbrales de**:
[ADR-018](./018-presupuestos-de-performance.md)

## Contexto

El pull request que trajo la segunda dirección visual ([ADR-021](./021-segunda-direccion-visual.md))
dejó el workflow `quality.yml` en rojo en las nueve páginas públicas. El resumen decía cuatro cosas:

| Assertion | Presupuesto | Medido en CI |
| --- | --- | --- |
| `resource-summary:script:size` | 204 800 | 257 000 – 279 000 en 9/9 páginas |
| `categories:best-practices` | ≥ 0,95 | 0,93 en 9/9 páginas |
| `largest-contentful-paint` | ≤ 2800 ms | 2919 – 3559 ms en 7/9 páginas |
| `categories:performance` | ≥ 0,95 | 0,93 en `/`, 0,91 en `/reconstruccion` |

Los informes no estaban disponibles. La acción corría con `uploadArtifacts: false` y un paso propio de
`upload-artifact` condicionado a `failure()`, y ese paso no encontró nada: `lhci` corta en la aserción,
antes de escribir los informes en el directorio del repositorio. Con `if-no-files-found: ignore` no
avisó. Un ciclo entero de diagnóstico a ciegas empezó ahí, y la primera decisión de este ADR es que eso
no vuelva a pasar.

### Tres eran defectos de verdad

Reproducido el escenario localmente —build de producción, `@lhci/cli` con la misma configuración,
Chrome real— tres de los cuatro números tenían una causa concreta y se arreglaron. Están en tres
commits aparte porque son tres cosas distintas:

1. **El bundle de cliente.** `components/site/header.tsx` era un componente de cliente porque
   `aria-current` necesita la ruta actual y en Next 16 la ruta sólo se lee en el navegador. Pero el
   archivo también importaba `site` desde `@/content`, y `"use client"` arrastra **todo el grafo de
   importación** al navegador: los diez JSON de contenido y Zod entero cruzaban la frontera. Medido
   sumando cada `<script src>` de la home servida en producción: 1 011 935 bytes sin comprimir con la
   frontera mal puesta, 591 088 con el encabezado de vuelta en el servidor y sólo la lista de secciones
   como componente de cliente. En transferencia con gzip, de ~279 KB a 182 KB.

2. **El favicon.** El sitio no tenía ningún icono, así que cada visita pedía `/favicon.ico` y se
   llevaba un 404. `errors-in-console` es una auditoría de buenas prácticas, y ese 404 era lo que
   bajaba la categoría a 0,93 en las nueve páginas.

3. **La precarga de fotos.** `priority` en `next/image` no quiere decir «importante»: agrega un
   `<link rel="preload">` con prioridad alta. Lo llevaba la primera foto de cada tramo de
   `PhotoSequence`, la primera de `PhotoEssay` y la primera de la columna de `/norma`. En las tres el
   ensayo fotográfico empieza después del título, la bajada y los párrafos de introducción: en un
   teléfono, una pantalla y media más abajo. El navegador ponía hasta 114 KB de fotos que nadie mira
   delante del texto que sí. En `/reconstruccion`, donde el elemento más grande de la página es un
   párrafo, el LCP llegaba a 3040 ms.

### El cuarto no era un defecto: era el instrumento

Con los tres arreglos, el LCP de las páginas de texto seguía dando ~2880 ms contra un presupuesto de
2800. Antes de tocar el presupuesto se fue a buscar qué mide ese número, y el informe de Lighthouse lo
dice sin ambigüedad. Junto a la métrica simulada guarda la observada:

| Página | LCP simulado | FCP observado | **LCP observado** |
| --- | --- | --- | --- |
| `/` | 2414 ms | 82 ms | **82 ms** |
| `/` | 2779 ms | 85 ms | **85 ms** |
| `/reconstruccion` | 2334 ms | 71 ms | **71 ms** |
| `/reconstruccion` | 2936 ms | 87 ms | **87 ms** |

El LCP observado es **idéntico** al FCP observado: la página dibuja su elemento más grande en el mismo
instante que dibuja lo primero. No hay retraso de render, ni una tipografía que reflowea, ni una imagen
que bloquea. Y el mismo build, en la misma máquina, sobre la misma página, da 2334 ms y 2936 ms en
corridas consecutivas: 600 ms de diferencia con cero cambios.

Eso ya estaba escrito. ADR-018 midió 700 ms de banda de ruido en cinco corridas y subió el umbral de
2500 a 2800 para quedar por encima de ella. Lo que no se hizo entonces fue preguntar por qué el
instrumento tiene 700 ms de ruido, y la respuesta es que por defecto Lighthouse **no estrangula la red:
la simula**. Carga la página a toda velocidad, y después reconstruye con un modelo (Lantern) cuánto
habría tardado en una 4G lenta, a partir del árbol de dependencias de la traza. El modelo es útil
—corre rápido y da un score comparable— pero es un modelo: sensible a milisegundos de la traza real que
se amplifican al proyectarlos, y no tiene por qué reproducir la secuencia de pintados.

Lighthouse tiene la otra opción desde siempre: `throttlingMethod: "devtools"`, que aplica el
estrangulamiento de verdad —150 ms de latencia, 1,6 Mbps, CPU 4×— y mide lo que pasa. Medido en las
nueve páginas, tres corridas cada una:

| | Simulado | Real (`devtools`) |
| --- | --- | --- |
| Variación de LCP entre corridas idénticas | hasta **600 ms** | **±15 ms** |
| LCP de `/` | 2414 – 2940 ms | 1697 – 1720 ms |
| LCP de `/reconstruccion` | 2334 – 2936 ms | 1553 – 1567 ms |
| FCP | 757 – 1231 ms | 1548 – 1577 ms |
| TBT | no medido, estimado | 44 – 54 ms |
| CLS de `/` | **0,0000** | **0 / 0,0544 / 0** |
| Score de performance | 0,91 – 0,99 | **0,99 en las nueve** |

Los tiempos absolutos suben, y tienen que subir: el FCP real en una 4G lenta con 150 ms de latencia es
1,55 s, no 0,76 s. El número simulado era optimista en el FCP y pesimista en el LCP a la vez.

### Y encontró un desplazamiento de layout que la simulación no veía

La última fila es la que decide este ADR. El modelo simulado reportaba **CLS 0,0000 en las 27
corridas**. Con estrangulamiento real, la home mide 0,0544 en una de cada tres.

Reproducido con Playwright a la emulación exacta de Lighthouse (412 × 823, DPR 1,75, 150 ms / 1,6 Mbps
/ CPU 4×), da 0,0544 en cinco de cinco cargas y es un único evento a los 1608 ms:

    DIV  lg:col-span-5 lg:col-start-8    y 493 → 548
    DIV  mt-2xl flex flex-col …          y 329 → 384
    P    mt-lg max-w-measure text-lead   y 219 → 274

Todo lo que está debajo del `<h1>` baja 55 px de golpe, y 55 px es exactamente una línea de la escala
de display. Medida la altura del `<h1>` con la tipografía y con las peticiones de `.woff2` abortadas:

| | Alto del `<h1>` | Líneas |
| --- | --- | --- |
| Con la fallback (Times ajustada a `size-adjust: 105,48%`) | 55 px | **1** |
| Con Newsreader | 110 px | **2** |

«La Casa de Norma» entra en una línea con la fallback y en dos con Newsreader, que es más ancha por
carácter. El FCP real es 1576 ms y la serif termina de bajar a los ~1600: el primer dibujado sale con
la fallback en una línea, llega la serif y el título pasa a dos. La pantalla se acomoda mientras
alguien está leyendo la primera frase.

**Es un defecto real, y la simulación lo reportaba como cero en las 27 corridas.** Un instrumento que
no puede ver el problema que existe no es conservador: es ciego. Ése es el argumento entero de este
ADR.

Sobre el defecto en sí, medido a siete anchos de pantalla, hay algo que conviene saber antes de
intentar arreglarlo:

| Ancho | CLS | Líneas del `<h1>` con Newsreader | ¿Coinciden las dos tipografías? |
| --- | --- | --- | --- |
| 360 px | 0,0005 | 2 | sí, las dos ocupan 2 |
| 390 px | 0,0000 | 2 | sí |
| **412 px** | **0,0544** | 2 | **no: la fallback ocupa 1** |
| 430 px | 0,0003 | 1 | sí, las dos ocupan 1 |
| 470 px | 0,0003 | 1 | sí |
| 540 px | 0,0000 | 1 | sí |
| 640 px | 0,0003 | 1 | sí |

El desacuerdo vive en una franja de **30 px**, entre 400 y 429 px, y la emulación de Lighthouse mide
justo en el medio. A 360 y 390 px —la mayoría de los teléfonos— el CLS es cero, porque ahí las dos
tipografías ocupan dos líneas.

Y la franja **no se puede eliminar, sólo mover**: dos tipografías con anchos distintos siempre tienen
un rango de anchos de contenedor donde no coinciden en cuántas líneas ocupan un texto. Bajar el cuerpo
del título hasta que entre en una línea a 412 px lo pone al borde del salto a 360 px, donde el ancho
disponible son 320 px y el título necesita 319. Subirlo corre la franja hacia arriba. No hay tamaño que
la haga desaparecer.

## Decisión

**1. `throttlingMethod: "devtools"`.** Lighthouse estrangula de verdad y mide, en lugar de cargar rápido
y proyectar. Las corridas tardan más —el workflow pasa de ~2 a ~11 minutos, dentro del timeout de 25— y
a cambio los números son reproducibles y ven lo que pasa.

**2. Los umbrales numéricos son los de Core Web Vitals**, no números propios. Ahora que la medición es
real, la referencia externa es la que corresponde, y deja de haber que justificar por qué el umbral
está donde está:

| Assertion | ADR-018 | Ahora | Medido | Margen |
| --- | --- | --- | --- | --- |
| `categories:*` (las cuatro) | ≥ 0,95 | **≥ 0,95** | 0,99 / 1,00 / 1,00 / 1,00 | la compuerta de la constitución, sin cambios |
| `first-contentful-paint` | 1200 ms | **1800 ms** | 1548 – 1577 ms | umbral «bueno» de Google; 223 ms |
| `largest-contentful-paint` | 2800 ms | **2500 ms** | 1553 – 1708 ms | umbral «bueno» de Google; 792 ms |
| `total-blocking-time` | no existía | **200 ms** | 44 – 54 ms | umbral «bueno» de Lighthouse |
| `cumulative-layout-shift` | 0,05 | **0,1** | 0 – 0,0544 | umbral «bueno» de Google |
| `resource-summary:script:size` | 204 800 | **204 800** | 160 524 – 169 097 | sin cambios; 35 KB |
| `resource-summary:third-party:count` | 0 | **0** | 0 | sin cambios, y sin margen |

El LCP **baja** de 2800 a 2500 ms, que es el número que ADR-018 quería y no podía sostener. El FCP sube
de 1200 a 1800 porque 1200 ms era el FCP simulado de una página sin fotografías; el real en 4G lenta es
1,55 s y 1800 ms es el umbral publicado. `total-blocking-time` se agrega recién ahora porque con
simulación era una estimación del modelo y no valía como compuerta.

El CLS es el único que se afloja, de 0,05 a 0,1, y por eso se corrige también en
[`plan.md`](../../specs/001-sitio-publico-campana/plan.md): una especificación que pide 0,05 y una
compuerta que acepta 0,1 son dos documentos discutiendo entre ellos, y la especificación es la fuente
de verdad (principio I). El 0,05 era un número propio, más estricto que el publicado, elegido cuando
medía cero porque no había ni fotografías ni un título de dos líneas. El 0,1 es el umbral de Core Web
Vitals y es el que se puede sostener.

**3. Los informes se suben siempre.** `uploadArtifacts: true` en la acción, y el paso propio
condicionado a `failure()` se borra: nunca funcionó. Los informes de una corrida que pasó también
sirven, porque son la línea de base de la próxima.

**4. El desplazamiento de la home queda anotado, no tapado.** Pasa la compuerta de 0,1 y no se arregla
en este ADR. Lo que se descarta y por qué está abajo; lo que queda es que está medido, tiene mecanismo
conocido y aparece en `docs/testing.md`.

## Alternativas consideradas

| Alternativa | Evaluación |
| --- | --- |
| Subir el LCP a 3200 ms y seguir con simulación | Es la tercera vez que se movería un umbral para acomodar el ruido del instrumento. Un umbral que se afloja dos veces ya no es una compuerta |
| Estrangulamiento real (elegido) | ±15 ms entre corridas, encontró un CLS que la simulación daba en cero, y permite bajar el LCP al umbral publicado |
| `display: "optional"` en las dos tipografías | Elimina el desplazamiento: sin swap no hay reflow. Medido, el LCP simulado de `/` bajaba a 2414 ms. Pero quien llega por primera vez desde WhatsApp en 4G se lleva el sitio entero en Times New Roman, y la primera impresión es exactamente lo que ADR-021 fue a arreglar. Ya se había descartado en ADR-018 por la misma razón |
| `display: "block"` | Con las tipografías precargadas llegan a los ~1600 ms y el FCP es 1576, así que hoy costaría ~30 ms y quitaría el desplazamiento. Pero el modo de falla es una página **en blanco** hasta tres segundos, y en una conexión peor que la que simula Lighthouse eso es el sitio roto para la persona que menos margen tiene |
| Bajar el cuerpo del título hasta que entre en una línea | Medido: necesita 44 px a 360 px, contra 52 px hoy. Y a 44 px el título pide 319 px de los 320 disponibles a 360 px, o sea que queda al borde del salto de línea en el ancho de teléfono más común. Se cambia una franja de 30 px por otra |
| Reescribir el `<h1>` para que ocupe las mismas líneas en las dos tipografías | Ajustar la redacción a la métrica de una fallback es dejar que el instrumento escriba el texto. §34 pide lo contrario |
| Reservarle al `<h1>` dos líneas de alto (`min-height: 2lh`) hasta cierto ancho | Funciona y es independiente de la tipografía, pero el ancho a partir del cual sobra una línea vacía es ~430 px, que no es ningún breakpoint: es un número mágico atado al largo de esa cadena de texto. El día que el título cambie, el número queda mal y nadie se va a enterar |
| Quitar el prefetch de `<Link>` en el sumario del teléfono | Se probó: seis rutas precargándose mientras alguien lee la apertura parecía culpable. Medido, no cambió nada (`/` 2940 ms contra 2936 ms, dentro del ruido). Revertido, porque un cambio que se justifica con un beneficio que no se pudo medir no debería quedar en el árbol |
| No precargar Archivo | Medido otra vez, y otra vez peor: el FCP de la home pasó de 908 a 1211 ms en las cuatro páginas probadas. Coincide con lo que ADR-018 ya había medido |
| Dejar `uploadArtifacts: false` | Es lo que produjo el ciclo de diagnóstico a ciegas que originó este ADR |

## Consecuencias

- Los números de `lighthouserc.json` son de la misma clase que los de cualquier informe de Core Web
  Vitals: se pueden comparar con los de campo cuando el sitio esté desplegado. Con simulación no se
  podían.
- El workflow tarda ~11 minutos en lugar de ~2. Es el precio de medir en lugar de estimar, y sigue
  siendo un décimo del timeout.
- ADR-018 queda vigente en su razonamiento —el presupuesto de scripts, la separación entre el código
  propio y el runtime del framework, el descarte de `display: "optional"`— y superado en sus umbrales
  de tiempo. La parte que se equivocó no fue el análisis del ruido: fue aceptarlo en lugar de cambiar
  el instrumento.
- **Queda abierto**: el desplazamiento de 55 px de la apertura de la home, en la franja de 400 a 429 px
  de ancho de pantalla. Mide 0,0544 contra un umbral de 0,1, y a 360 y 390 px mide cero. La única
  salida que no cuesta la tipografía ni la página es que la serif llegue **antes** del primer dibujado,
  y hoy llega a los 1600 ms contra un FCP de 1576. Para adelantarla hay que bajar los 93 KB de las dos
  familias o los 168 KB de scripts que le compiten el ancho de banda, y esos 168 KB son en su mayoría
  el runtime de React y de Next (ADR-018). Se probó no precargar Archivo para darle la banda a la
  serif: la serif siguió llegando a los 1600 ms, así que el cuello no es la competencia entre las dos
  tipografías sino el peso total de la página.
- Parte de esos 1600 ms es el harness y no el sitio: `next start` habla HTTP/1.1, sin priorización de
  streams, así que Chrome reparte el ancho de banda entre la tipografía precargada y los scripts
  diferidos en lugar de servir primero la de prioridad alta. En Vercel, con HTTP/2 o HTTP/3, la serif
  debería llegar bastante antes. Es una hipótesis, no una medición: se confirma con datos de campo, que
  es también donde se ve a cuánta gente le pasa.
