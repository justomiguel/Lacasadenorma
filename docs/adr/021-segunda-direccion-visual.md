# ADR-021 · La fotografía como estructura: segunda dirección visual

**Estado**: Aceptada · **Fecha**: 2026-09-11

## Contexto

La familia mira el sitio y dice tres cosas: que está **monótono y sin estilo**, que **no se entiende
la navegación**, y que no genera la emoción que hace falta para que alguien decida transferir plata.

Las tres son correctas, y conviene escribir por qué antes de tocar una línea, porque la explicación
fácil —"falta pulir"— es falsa. El sitio no está sin terminar: está terminado alrededor de un
material que nunca llegó.

### Lo que se midió

| Medición | Resultado |
|---|---|
| Fotografías publicadas en las once páginas | **0** |
| Espacios reservados con el texto "acá va una foto" | 6 |
| Elementos a sangrado completo en páginas públicas | **0**. Todo vive dentro del mismo `max-w-page` |
| Superficies distintas de `paper` en páginas públicas | **0** usos de `paper-sunk` fuera de un hueco de foto, un aviso y una cifra |
| Repeticiones del patrón «etiqueta en versales + título serif + regla» | **39**, en nueve páginas. Nueve sólo en la home |
| Anchos de columna de texto distintos | **1** (`--container-measure`) |
| Alto de la home en un teléfono de 360 px | 11 497 px ≈ **14,7 pantallas** |
| Distancia desde la apertura hasta el único menú del sitio | esas 14,7 pantallas: la navegación existe **sólo** en el pie |

Una página con una sola superficie, un solo ancho, un solo tamaño de prosa, cero fotos y el mismo
encabezado treinta y nueve veces no es sobria: es plana. «Monótona» es la palabra exacta y describe
una propiedad medible, no un gusto.

### La confirmación incómoda

Se instaló la skill oficial `frontend-design` de Anthropic (ver sección de harness en
`docs/00-analisis-inicial.md`). Su sección de calibración enumera los grupos estéticos donde se
agrupa hoy el diseño generado por IA. El sitio cae en cuatro a la vez:

| Lo que enumera la skill | Lo que tiene el sitio |
|---|---|
| «fondo crema cálido (cerca de `#F4F1EA`) con display serif de alto contraste y acento terracota o arcilla» | `--color-paper` crema, Newsreader en display, `--color-brick` terracota |
| «layout de broadsheet con reglas de un pixel, radio cero y columnas densas de diario» | reglas de un pixel en lugar de cards, radio máximo 2 px, columna angosta |
| «una sobrelínea en VERSALES espaciadas arriba de cada encabezado» | `SectionHeading`, 39 veces |
| «cadenas de metadatos unidas con puntos medios (`A · B · C`)» | cuatro lugares |

Y en su lista de tratamientos tipográficos a evitar porque son «los delatores más comunes de una
página generada» están, textualmente, «usar versales para las etiquetas» y «agregar etiquetas
tipográficas innecesarias arriba del contenido». Las dos son el componente que más se usa en el
sitio.

Esto no vuelve ilegítima ninguna de esas decisiones —el ladrillo viene de la tierra colorada de
Formosa, Archivo es una grotesca de Buenos Aires, y la regla de un pixel es una alternativa real a la
card—. Las vuelve **insuficientes**: son defaults que se sostuvieron con una justificación escrita a
posteriori. `ux.md` es un documento bien argumentado que defiende, entre otras cosas, dos tercios de
pantalla vacíos a la derecha de la prosa. El argumento es aritméticamente correcto y la conclusión es
un sitio que no se puede mirar.

### La causa raíz, y por qué importa

La dirección visual se especificó **suponiendo fotografía**. Está escrito en `ux.md` §10: «Es el
elemento con más peso de la página, y hoy es el que falta». Y en §12: «el lado derecho no está vacío
por descuido: es donde va la fotografía […] Cuando las fotos lleguen, esa mitad se ocupa sin mover
una línea de layout».

Eso último es la parte equivocada. Un diseño que sólo funciona cuando llega un material que no
controlás no es un diseño con espacio reservado: es una promesa. Y mientras la promesa no se cumple,
lo que la persona ve es un formulario de duelo en beige.

Hay una causa raíz más, y es de contenido: **el sitio no cuenta lo que pasó.** `/que-paso` dice
«Norma murió en un accidente», «no vamos a dar más detalles» y «esta página no lo cuenta». `/norma`
dice que la familia está escribiendo el relato. Las dos decisiones se tomaron para proteger a la
familia, con razón, cuando no había texto autorizado.

Pero la familia **ya publicó** el relato, con su firma: la fecha, la hora, que el incendio destruyó
la casa, que la madre falleció, que el padre salió pero inhaló humo y hoy tiene el 50 % de capacidad
pulmonar, y la frase que ordena todo el proyecto: «Ahora mi foco está en reconstruir la casa de mi
papá y acompañarlo en su recuperación». Junto con eso entregaron fotografías del frente, del interior
y del garage, y material del trabajo de limpieza.

Un sitio que pide plata para reconstruir una casa y no dice que se incendió no puede generar
emoción, porque no está contando nada. No es un problema de estilo.

## Decisión

Segunda dirección visual, en cinco decisiones. **La fotografía deja de ser un adorno reservado y pasa
a ser el elemento que estructura la página.** El resto se ordena alrededor de eso.

### 1. La fotografía entra al repositorio, y por dos caminos distintos

Se extiende la división de ADR-007 —dos fuentes de contenido según frecuencia de cambio— a las
imágenes:

| Fuente | Qué fotos | Cómo se edita |
|---|---|---|
| `public/fotos/`, declaradas en `content/*.json` | Las editoriales: el retrato de Norma, el frente, el interior, el garage, la limpieza. Se eligen una vez | Commit y pull request |
| Supabase Storage vía `/admin` | Las del avance de la obra, adjuntas a cada novedad, fechadas | Backoffice |

El motivo de que las editoriales **no** vayan a la base: son parte del relato, no un dato operativo,
y tienen que estar en pantalla también cuando la base no responde. Una foto no es una cifra —no
afirma un número—, así que publicarla sin base de datos no viola FR-034 ni la verificación del modo
`sin-datos`, que sigue exigiendo cero `data-figure`.

Cada foto declara `width`, `height`, `alt` y, cuando corresponde, epígrafe y crédito, validados por
Zod al importar, igual que el resto del contenido. Sigue prohibido el stock, la ilustración de
relleno y la imagen generada: lo que entra es lo que la familia sacó.

### 2. El material se ordena por su momento, y el eje del relato es ese

El material entregado tiene dos momentos y la diferencia es lo que hace que el sitio deje de ser una
lista de desgracias:

| Momento | Material | Qué comunica |
|---|---|---|
| **Antes de la limpieza** | frente quemado, interior sin techo con los escombros donde cayeron, garage con el auto calcinado | qué se perdió |
| **Durante la limpieza** | los escombros ya juntados en un montículo con la pala cargadora al lado, tres personas paleando para cargarla; las piezas del taller rescatadas y clasificadas en el piso | que hay trabajo en marcha y gente ayudando |

Un tercer momento —**después de la limpieza**, el terreno despejado y listo para empezar— **no existe
en el material entregado**, y es el que más falta. Es la foto que cierra el par: sin ella, el sitio
puede mostrar la pérdida y el esfuerzo, pero no el punto de partida de la obra que pide financiar.
Está en la lista de lo que falta en `content-guide.md`.

El sitio los presenta **apareados y fechados**, no mezclados. Ese par es el argumento entero de la
campaña en dos imágenes, y es factual: no hay un adjetivo, hay dos fotos y dos fechas.

Esto también resuelve la tensión de `ux.md` §1 entre «generar emoción» y «nunca lástima», que hasta
ahora se resolvía por omisión —no mostrando nada—. La regla operativa queda escrita: **la pérdida se
muestra una vez y en pasado; el trabajo se muestra siempre y en presente.** La emoción sale de la
secuencia, no del énfasis.

### 3. Se rompe el contenedor único

Tres recursos, ninguno nuevo en el sistema de tokens:

- **Sangrado completo** para las fotos que llevan el peso del relato. `ux.md` §4 ya lo prometía; nunca
  se usó porque no había fotos.
- **Bandas de superficie.** Secciones enteras sobre `paper-sunk`, y **una** sobre tinta —la de qué
  ocurrió—, para que el documento tenga bandas y no un solo plano. El tono oscuro ahí no es un efecto:
  es la única sección cuyo contenido lo justifica.
- **Margen editorial de verdad.** La columna derecha que hoy está vacía pasa a llevar la foto, el
  epígrafe, la fecha o la cifra al margen. Deja de ser espacio reservado y pasa a ser una segunda
  columna de información.

El color deja de venir de un token y empieza a venir de las fotos: el verde agua del frente, el
ladrillo real de los escombros, el verde de los árboles. El acento ladrillo sigue siendo el único
acento de interfaz, y sigue el límite de tres superficies con acento por pantalla.

### 4. Se retira la sobrelínea en versales

`SectionHeading` deja de llevar `label` por omisión. La etiqueta sobrevive **sólo donde transporta
información que el título no tiene** —un estado, una fecha, un país— y en ese caso deja de ser
versales espaciadas. Donde sólo anunciaba el título («LA OBRA» arriba de «La reconstrucción»,
«COLABORAR» arriba de «Cómo ayudar») se borra: son 39 repeticiones de chrome que no informa.

En su lugar la jerarquía la hace la escala, que hoy no se usa: un solo momento por página puede subir
a escala de display, y ese momento en la home es la frase de la familia, como cita real y atribuida,
no como decoración.

### 5. La navegación entra al encabezado

La decisión original —«sin menú hamburguesa, la navegación vive en el pie»— acertó en la mitad. El
menú oculto sigue descartado. Lo que no se sostiene es que el pie alcance: en la home son 14,7
pantallas de teléfono hasta el único lugar donde el sitio dice que tiene otras páginas.

- En escritorio, las seis rutas primarias van visibles en el encabezado, con `aria-current="page"`.
- En teléfono, el encabezado mantiene el nombre y *Ayudar*, y la navegación aparece **dentro del
  documento**, como sumario, inmediatamente después de la apertura. Es el recurso de una publicación
  impresa, no chrome de aplicación: una lista real de enlaces con lo que hay en cada página.
- Cada página termina en dos enlaces concretos de a dónde ir después, con texto propio. Nunca «ver
  más».

La barra inferior persistente de *Ayudar* no cambia: ya está diseñada y ya se retira cuando la acción
primaria está en pantalla.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Pulir lo que hay: más espacio, algún tamaño más grande | Es lo que produjo el estado actual. El problema no es la magnitud de los valores, es que falta el elemento alrededor del que se diseñó |
| Cambiar la paleta para huir del crema y la terracota | La paleta viene del lugar, no de un generador, y la familia no pidió otro color. El diferenciador honesto es que el color venga de las fotos. Si con las fotos adentro la paleta sigue leyéndose como default, se reevalúa con evidencia |
| Cambiar las tipografías | Newsreader y Archivo son elecciones del proyecto, y Archivo es de Buenos Aires. Lo que estaba mal no es la familia tipográfica: es que se usaba un solo tamaño y una sola voz |
| Ilustración, textura o imagen generada para llenar los huecos | Prohibido por la constitución y, en un sitio que pide plata, es exactamente lo que hace una estafa |
| Stock fotográfico de casas incendiadas | Lo mismo, agravado: afirma sobre el mundo algo que no pasó |
| Animación de entrada por sección para «dar vida» | Es el default que `frontend-design` señala como delator, y no comunica ningún cambio de estado |
| Menú hamburguesa en teléfono | Sigue siendo un toque y JavaScript para esconder ocho enlaces. El sumario en el documento resuelve lo mismo sin ocultar nada |
| Barra de navegación fija (`sticky`) en teléfono | Come alto de pantalla en el dispositivo donde menos hay, y ya hay una barra fija abajo. Dos barras fijas en 360 px es una ventana de lectura de nada |
| Contar el incendio con palabras propias, más «emotivas» | El texto tiene que ser el de la familia. Cualquier adjetivo que agreguemos nosotros es la lástima que `ux.md` §1 prohíbe |
| Poner las fotos del incendio en la apertura | Abre en la pérdida. `ux.md` §1 es explícito: se abre con Norma. Las fotos del fuego van en su sección, una vez |

## Consecuencias

**Buenas.** El sitio pasa a tener el elemento para el que fue diseñado. Se cumplen tres promesas
escritas que estaban sin cumplir: el sangrado de `ux.md` §4, la fotografía de §10 y el ensayo
fotográfico de `/norma`. La navegación deja de estar a catorce pantallas. Y el relato pasa a estar
contado, con las palabras de quien tiene derecho a contarlo.

**Malas y aceptadas.**

- **La resolución del material entregado es limitada.** Las cuatro fotos del incendio llegaron dentro
  de una pieza gráfica de 1242 × 1272 px, así que recortadas quedan en unos 600 px de ancho y con la
  etiqueta del collage impresa encima. Sirven, y son infinitamente mejores que un rectángulo gris,
  pero **no alcanzan para un sangrado completo en escritorio** y hay que pedir los originales. El
  retrato de Norma queda en 603 × 406 px, que es poco para el elemento más importante del sitio.
  Mientras eso no llegue, el sangrado se reserva para el material del que sí hay resolución.
- **El material de la limpieza es vertical (9:16)**, porque se filmó con el teléfono en la mano. No hay
  forma de recortarlo a apaisado sin perder algo: o se cortan las personas, o la máquina, o el
  montículo. Así que la banda a sangrado de escritorio **no puede** alimentarse con ese material; va en
  la columna del margen y en el ancho completo sólo en teléfono, donde 9:16 es el formato nativo.
- **Hay una cara identificable** en el material de la limpieza —la persona de gorra azul que palea, a
  media distancia— y las otras tres no lo son. Publicar una cara necesita permiso de esa persona, y eso
  no lo resuelve el diseño. Hasta que esté el permiso se usan los encuadres donde nadie es reconocible,
  que además son los mejores encuadres: el montículo con la pala al fondo y las manos trabajando.
- Aparece un `public/` con imágenes en el repositorio, que hasta hoy no existía. Es peso en el árbol y
  hay que cuidar que no se conviertan en un cajón de archivos sueltos: sólo entran las editoriales, y
  cada una está declarada en `content/` o no se sirve.
- Agregar tinta como superficie de sección obliga a revisar contraste y foco sobre fondo oscuro, que
  hasta ahora no existía. Entra en la corrida de axe.
- `SectionHeading` cambia de firma en 39 lugares. Es un cambio mecánico y ancho, y toca casi todas las
  páginas en el mismo commit.
- La banda oscura y el sangrado suben el peso de imagen de la home. Los presupuestos de performance de
  ADR-018 y el umbral de Lighthouse ≥ 95 no se relajan: si una foto no entra en presupuesto, se
  recorta o se sirve más chica, no se sube el presupuesto.

## Cómo se verifica

Los criterios de aceptación visual de `ux.md` §12 siguen valiendo. Se agregan cuatro, y cada uno dice
con qué se comprueba, porque un criterio que sólo se mira no se sostuvo la primera vez:

- Ninguna página pública tiene un espacio reservado de foto donde ya hay material disponible.
- La home presenta al menos una imagen a sangrado y al menos dos superficies de sección distintas.
- Desde la apertura, en teléfono, se llega a cualquiera de las seis rutas primarias sin recorrer la
  página entera.
- No queda ninguna sobrelínea en versales que sólo repita el título de su sección.

## Documentos relacionados

| Documento | Qué agrega |
|---|---|
| [`../../specs/001-sitio-publico-campana/ux.md`](../../specs/001-sitio-publico-campana/ux.md) | La especificación que este ADR corrige, secciones 1, 4, 9, 10 y 12 |
| [`007-arquitectura-contenido.md`](./007-arquitectura-contenido.md) | La división de dos fuentes que acá se extiende a las imágenes |
| [`012-design-system.md`](./012-design-system.md) | Los tokens, que no cambian |
| [`018-presupuestos-de-performance.md`](./018-presupuestos-de-performance.md) | El presupuesto que la fotografía no puede exceder |
| [`../content-guide.md`](../content-guide.md) | Qué falta hoy y quién lo completa |
