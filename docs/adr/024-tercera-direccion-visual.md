# ADR-024 · El color sale de la casa: tercera dirección visual y limpieza de contenido

**Estado**: Aceptada · **Fecha**: 2026-09-12 · **Enmienda**: `ux.md` §1, §2, §3 y §9, y el punto de
[ADR-021](./021-segunda-direccion-visual.md) que decidió conservar la paleta.

## Contexto

[ADR-021](./021-segunda-direccion-visual.md) metió la fotografía al sitio y dejó una cláusula abierta,
textual:

> Cambiar la paleta para huir del crema y la terracota: **por qué no.** La paleta viene del lugar, no
> de un generador, y la familia no pidió otro color. El diferenciador honesto es que el color venga de
> las fotos. **Si con las fotos adentro la paleta sigue leyéndose como default, se reevalúa con
> evidencia.**

Las fotos están adentro desde ADR-021. Esta es la evidencia.

### Lo que se midió

La skill `frontend-design` enumera cinco grupos estéticos donde se agrupa hoy el diseño generado por
IA. El primero de la lista dice, textualmente: «fondo crema cálido (cerca de `#F4F1EA`) con un display
serif de alto contraste y un acento terracota o arcilla (a menudo cerca de `#D97757`)».

Los tokens del sitio, convertidos de `oklch` a sRGB y medidos, no interpretados:

| Rasgo que enumera la skill | Token del sitio | Valor medido |
|---|---|---|
| fondo crema cálido cerca de `#F4F1EA` | `--color-paper` | **`#fcfaf6`** |
| display serif de alto contraste | `--font-prose` en `h1`, `h2` y `text-display` | **Newsreader**, en los 27 usos |
| acento terracota cerca de `#D97757` | `--color-brick` | **`#aa4423`** |

Tres de tres. ADR-021 ya lo había reconocido y decidió conservarlo apostando a que la fotografía
cambiara la lectura. Con las diez fotos publicadas, la apertura de la home sigue siendo crema, con el
título en serif y el botón en terracota: la foto entró, pero el color de la interfaz no vino de ella.

### La causa raíz: el color se eligió por el lugar y no por la casa

El argumento de ADR-021 era que el ladrillo viene de la tierra colorada de Formosa. Es cierto y sigue
siendo cierto. El problema es que es un argumento sobre **una provincia de 72 000 km²**, y hay
exactamente un objeto en este proyecto: la casa de Norma.

Y esa casa tiene un color, que está en el material entregado y escrito en el `alt` de dos fotos:

> «La pared es **verde agua** y por la ventana enrejada se ve el resplandor naranja del fuego adentro.»
> — `incendio-bomberos-frente.jpg`

> «El frente de la casa de día. La pared **verde agua** está manchada de negro arriba de la ventana.»
> — `incendio-frente.jpg`

El verde agua del frente es el dato más específico que tiene el proyecto y estaba sin usar. Ninguna
otra campaña lo tiene, porque ninguna otra tiene esta casa. La terracota, en cambio, la tiene cualquier
página generada esta semana.

### Y una segunda causa, de contenido

La auditoría de veracidad de todo el contenido visible encontró cuatro afirmaciones que el proyecto no
puede respaldar. Están en la sección «Limpieza de contenido», y una de ellas es una **contradicción
entre dos páginas**: `/que-paso` publica el incendio con las fotos de esa madrugada, y la respuesta 3
de las preguntas frecuentes —escrita antes de ADR-021 y nunca revisada— sigue diciendo «Norma murió en
un accidente. No damos más detalles que los necesarios».

## Decisión

### 1. El acento es el verde agua de la casa, y reemplaza al ladrillo

Un solo acento, como siempre (`ux.md` §3). Cambia cuál.

| Token | Antes | Ahora | Contraste sobre papel |
|---|---|---|---|
| `--color-aqua` | `--color-brick` `#aa4423` | **`#176b6b`** | 6,01:1 |
| `--color-aqua-strong` | `--color-brick-strong` `#922800` | **`#005455`** | 8,40:1 |

Está oscurecido y desaturado respecto del verde agua de la pared a propósito: el color de la pared, tal
cual, no llega a 4,5:1 sobre papel, y un turquesa saturado se lee como marca de SaaS. Éste se lee como
pintura de obra, que es lo que es.

El ladrillo no sobrevive en ningún lugar. Un sistema con dos acentos no tiene acento.

### 2. El papel deja de ser crema y la tinta deja de ser cálida

| Token | Antes | Ahora | Qué es |
|---|---|---|---|
| `--color-paper` | `#fcfaf6` | **`#f7fbfb`** | Blanco a la cal, apenas frío |
| `--color-paper-sunk` | `#f6f3ed` | **`#ebf3f3`** | El segundo plano |
| `--color-ink` | `#1f1914` | **`#0c1b1e`** | Pizarra mojada, no negro teñido |

Los tres niveles de tinta y las dos variantes de foco se recalcularon en el mismo tono. Todos los pares
texto/fondo se midieron con un conversor `oklch`→sRGB y la fórmula de WCAG 2.x antes de escribir el
CSS, porque la tabla de contraste de `ux.md` §3 ya estuvo mal una vez y la encontró axe:

Las cifras son las del color **ya cuantizado a 8 bits**, que es el que el navegador pinta, y no las del
oklch en coma flotante: entre las dos hay hasta cuatro centésimas de diferencia, y el par más justo del
sistema pasa a 4,63:1.

| Tinta | Sobre `paper` | Sobre `paper-sunk` |
|---|---|---|
| `ink` | 16,91:1 | 15,65:1 |
| `ink-muted` | 6,50:1 | 6,01:1 |
| `ink-faint` | 5,01:1 | 4,63:1 |
| `aqua` | 6,01:1 | 5,56:1 |

`--color-rule` sobre la banda oscura se subió a 51 % de luminosidad para quedar en 3,09:1, que es el
umbral de elemento no textual (WCAG 1.4.11); en el tono nuevo, el 52 % anterior daba 2,96:1.

Y el acento se aclara **adentro** de la banda, a 62 % de luminosidad. Ésta la encontró la medición y no
el ojo: el comentario que había en `globals.css` afirmaba que el filete del testimonio cumplía 3:1 sobre
tinta, y con el verde nuevo da **2,81:1**. Ese filete es lo único que separa la frase de la familia del
resto de la banda, y es la única frase del sitio que no escribimos nosotros. Aclarado da 5,05:1.

La contrapartida queda escrita en el CSS: adentro de la banda, `bg-aqua` es un fondo claro, así que un
botón primario ahí saldría con texto papel sobre verde claro. Hoy no hay ninguno y no debería haberlo
—la acción primaria de la home vive en la apertura—, pero es el tipo de cosa que se rompe sola.

### 3. La voz más fuerte de la página pasa a ser argentina

Se invierten los roles de las dos familias. No entra ninguna tipografía nueva.

| Rol | Antes | Ahora |
|---|---|---|
| Display, `h1`, `h2`, `h3` | Newsreader (serif) | **Archivo** |
| Prosa, bajadas, citas | Newsreader | Newsreader |

Archivo es una grotesca de Omnibus-Type, Buenos Aires. ADR-021 la defendió como «la voz funcional del
sitio es tipografía argentina» y después la dejó en las etiquetas y las cifras, mientras los títulos —lo
que alguien lee primero— se dibujaban con una serif de Google. Ahora la voz argentina es la que se lee
primero, y la serif se queda donde sirve de verdad: en el texto largo, que es lo que se lee en el
teléfono.

El efecto lateral es que desaparece el «display serif de alto contraste» de la lista de la skill, sin
inventar una familia nueva ni agregar un archivo al presupuesto de fuentes.

### 4. La home se reordena en cuatro movimientos, y aparece el que faltaba

El eje narrativo pasa a ser **pérdida → comunidad → reconstrucción → legado**.

`ux.md` §1 fijaba «memoria → ayuda → reconstrucción → futuro» y agregaba «la página no se abre con el
accidente: se abre con Norma». Eso último se mantiene: abrir con las fotos del fuego es la lástima que
§1 prohíbe. Lo que cambia es que **la apertura dice qué pasó en prosa**, en lugar de un eslogan.

Y aparece el movimiento que no existía. Medido sobre la home actual:

| Momento del relato | Secciones en la home | Fotos en la home |
|---|---|---|
| Pérdida | 1 (banda oscura, «qué ocurrió») | 0 |
| **Comunidad y trabajo en marcha** | **0** | **0** |
| Reconstrucción | 2 | 0 |

`ADR-021` escribió la regla «la pérdida se muestra una vez y en pasado; el trabajo se muestra siempre y
en presente» y la cumplió a medias: el trabajo se muestra en `/reconstruccion`, a la que hay que entrar.
En la home, la única cosa que se ve del relato es la banda oscura de la pérdida. Un visitante que lee la
home entera ve la desgracia y no ve a los vecinos con la pala.

Las dos fotos de la limpieza existen desde ADR-021 y están publicadas en una página interior. Una de las
dos pasa también a la home, en su propia sección. No hay material nuevo, no hay texto inventado: hay una
sección que ordena lo que ya estaba.

Va **una** y no las dos, y es una decisión de la implementación contra lo que este ADR planeaba. Las dos
son verticales de teléfono: puestas juntas en la mitad de una grilla de doce columnas, cada una queda en
190 px de ancho y no se ve lo que la foto fue a buscar. La que va es la de los escombros, porque es la
que muestra lo que el texto afirma: una persona con la pala y la máquina prestada detrás. La otra —las
piezas del taller separadas una por una— necesita su epígrafe para entenderse, y ese epígrafe está en
`/reconstruccion`, que es de donde no se movió.

También se fusionan «qué hay que reconstruir» y «cómo va» en una sola sección: son el mismo asunto —la
obra— y estaban separadas por herencia del orden de las nueve preguntas, no por una razón de lectura.

### 5. Lo que la apertura tiene que responder

`ux.md` §12 exige que la primera pantalla en 360 px diga qué es esto y qué se puede hacer. Se agrega
qué ocurrió y a quién:

| Pregunta | Dónde se responde en la apertura |
|---|---|
| Qué ocurrió | La bajada, en prosa y con la fecha |
| A quién estamos ayudando | El retrato de Norma con su nombre, y la segunda frase, que nombra al marido |
| Qué hay que reconstruir | La segunda frase: la casa |
| Cómo puedo ayudar | La acción primaria |
| Cómo puedo compartir | Un enlace de texto al lado de la acción primaria |

Compartir estaba **al final** de la home, después de once secciones y unas catorce pantallas de
teléfono. Un enlace en la apertura no agrega una superficie con acento —los enlaces no cuentan
(`ux.md` §3)— y es la diferencia entre que la campaña circule o no. El destino es la última sección de la
misma página, así que es un ancla y no una ruta: con `typedRoutes`, un `href` que es sólo un fragmento no
es una ruta del sitio, y la primitiva nueva `InPageAction` existe para no mentirle al compilador.

Las cinco respuestas entran arriba del pliegue de 360×640, y ahí no sobra nada. La frase que dice a
quién estamos ayudando estuvo un rato **abajo** del botón, por miedo a empujarlo fuera del pliegue; ahí
parecía la letra chica de la que pide plata. Puesta arriba, empujaba el enlace de compartir 36 px
**afuera** —y eso no lo dijo ningún test, lo dijo una captura—.

Los 36 px se recuperaron en tres lugares, y ninguno de los tres es apretar el diseño hasta que entre:

| Qué | Cuánto | Por qué se sostiene solo |
|---|---|---|
| El relleno superior de la apertura, `pt-2xl` → `pt-xl` en teléfono | 16 px | En 640 px de alto, 48 px entre un encabezado de 40 y un título de 52 es espacio muerto |
| El margen sobre las acciones, `mt-xl` → `mt-lg` en teléfono | 8 px | Sigue siendo el salto más grande de la apertura |
| `home.openingNeed`, de cuatro líneas a tres | 29 px | «Su marido logró salir, pero inhaló mucho humo y está en tratamiento» decía en la apertura lo que `/que-paso` cuenta con la cifra al lado. Queda «se salvó y está en tratamiento», que es cierto y alcanza |

Medido sobre el sitio construido: la apertura cierra a **623 px**. Y las cinco entradas pasan a ser las
cinco aserciones del test del pliegue, que antes eran tres y una de ellas era el eslogan. Si eso falla, la
pregunta no es cómo apretar más el margen: es qué frase sobra.

El enlace a la historia de Norma se va de la apertura. Eran dos enlaces y una acción para cinco
preguntas, y ese enlace no contestaba ninguna: la sección inmediatamente siguiente es la historia de
Norma y ya tiene su propio «leer la historia completa».

## Limpieza de contenido

Auditoría de todo el texto visible. Clasificación en verificado / no verificado / inventado, y qué se
hace con cada cosa.

### Se elimina

| # | Qué | Dónde | Por qué |
|---|---|---|---|
| 1 | **El currículum de ocho temas de Riacho Conecta** | `riacho-conecta.json` → `topics` | No tiene respaldo en ninguna parte del repositorio. El análisis inicial dice «F16 Riacho Conecta · Programa de formación» y nada más: ni un ADR, ni la spec, ni el material de la familia mencionan «Inteligencia artificial aplicada al trabajo» ni «Empleabilidad digital». Es un plan de estudios inventado para un programa sin fecha, sin cupo, sin inscripción y sin organización |
| 2 | **La página `/riacho-conecta` completa** | ruta, pantalla y contenido | Una de once páginas públicas dedicada a un programa que no existe. Sacado el currículum, lo que queda verificable son dos oraciones de intención, y ésas viven en `/legado` |
| 3 | «el proyecto continúa como Fundación Norma, con formación gratuita en herramientas digitales» | `site.json` → `longDescription` | Afirma en presente una organización no constituida. Es el texto que alimenta los datos estructurados |
| 4 | «El proyecto sigue con formación gratuita… El primer programa se llama Riacho Conecta» | `preguntas.json` #8 | Ídem, en la home |
| 5 | «Norma murió en un accidente. No damos más detalles que los necesarios» | `preguntas.json` #3 | **Contradice `/que-paso`**, que publica el incendio y las fotos de esa madrugada. Es texto anterior a ADR-021 que quedó vivo |
| 6 | `roleLabel: "Pionera de la comunicación en Riacho He Hé"` | `norma.json` | «Pionera» es un adjetivo nuestro. La fuente dice «una de las primeras comunicadoras sociales», y eso es lo que se publica |
| 7 | **Los dos espacios reservados de «Norma en la radio»** | `/norma` y `/legado` | Reservan lugar para una foto que `content-guide.md` §3 marca como «la familia, **si existe**». `ux.md` §12 ya escribió la lección: el hueco es honesto como estado transitorio, no como layout, y un diseño que depende de material que no controlás es una promesa |
| 8 | `home.radioPhotoReserved`, `home.seeRiacho`, `home.knowNormaStory`, `normaPage.radioReserved`, `legacyPage.radioReserved`, `legacyPage.seeTopics` | `ui.json` y `schema.ts` | Copy que queda sin uso. Se va también del esquema: una clave obligatoria que nadie renderiza es una promesa de que en algún lugar se muestra |
| 9 | «Conocer Fundación Norma» | `ui.json` → `home.knowFoundation` | Nombra la fundación como si existiera, y el enlace lleva a la página que explica que no. Pasa a «Leer qué se propone el legado» |

Ningún texto eliminado se reemplaza inventando otro. Donde no queda contenido, no queda sección.

### No verificado: sigue sin mostrarse

`norma.bornOn` y `norma.diedOn` en `null`, `reconstruccion.scope` vacío, la dirección de contacto de
privacidad sin publicar. Nada de eso cambia.

Sí se corrige un razonamiento equivocado de `content-guide.md` §3, que daba por abierta una pregunta que
no lo está. Decía:

> La familia afirma «lunes 7 de septiembre» y el día no está en duda, pero el 7 de septiembre de 2024
> fue sábado.

El 7 de septiembre de **2024** fue sábado, sí. Pero el repositorio se creó el **9 de septiembre de
2026**, dos días después del incendio, y el 7 de septiembre de 2026 **fue lunes**. La afirmación de la
familia es internamente consistente y no hay contradicción que resolver: lo único que pasa es que el año
no está publicado. Publicarlo sigue siendo decisión de la familia y `diedOn` sigue en `null`; lo que se
saca es una contradicción inexistente que quedó anotada como tarea pendiente.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Conservar la paleta otra vez, con las fotos como diferenciador | Es lo que decidió ADR-021, con esa condición explícita. La condición se cumplió y el resultado se midió: los tres rasgos siguen ahí |
| Cambiar de tipografías | No hace falta: las dos que hay sirven, y una es argentina. Lo que estaba mal era cuál llevaba la voz principal |
| Sumar el verde agua **junto** al ladrillo | Dos acentos es ningún acento, y duplica el trabajo de contraste. `ux.md` §3 pide uno |
| Usar el verde agua tal como está en la pared | No llega a 4,5:1 sobre papel. Medido, no estimado |
| Un turquesa saturado y moderno | Es el acento de SaaS que la skill señala, y sería cambiar un default por otro |
| Abrir la home con las fotos del incendio | Abre en la pérdida. `ux.md` §1 y ADR-021 son explícitos, y el brief de la familia pide que no se explote la tragedia |
| Dejar `/riacho-conecta` con los temas marcados como «tentativos» | Una etiqueta no vuelve verificable una lista inventada. O hay programa o no hay página |
| Dejar la pregunta 3 y arreglarla «después» | Es la única contradicción factual del sitio y está en la home |
| Traducir el currículum al inglés y dejarlo | Duplicaría el invento |
| Sumar una sección de comunidad con fotos nuevas | No hay fotos nuevas. La sección se hace con las dos que ya están publicadas en `/reconstruccion` |

## Consecuencias

**Buenas.** El color de la interfaz sale del único objeto del proyecto en lugar de una provincia. El
sitio deja de coincidir con los tres rasgos del primer grupo de la skill. La voz principal pasa a ser la
tipografía argentina que el proyecto ya había elegido y no usaba donde se ve. La home cuenta los cuatro
movimientos en lugar de tres. Compartir deja de estar a catorce pantallas. Y se van cuatro afirmaciones
que el proyecto no podía sostener, una de ellas una contradicción entre dos páginas.

**Malas y aceptadas.**

- **El renombre del token toca 21 archivos.** `brick` → `aqua` es mecánico y ancho, e incluye `/admin`,
  que no cambia de diseño pero sí de token.
- **La tarjeta de OpenGraph cambia de color**, así que las vistas previas ya compartidas en WhatsApp
  quedan con el color viejo hasta que cada plataforma revalide su caché. No hay forma de forzarlo.
- **Se pierde una página pública** (`/riacho-conecta`). Si ya se compartió, queda en 404. Se prefiere un
  404 a una página con un programa inventado; y no se pone un redirect a `/legado` porque no es la misma
  cosa: quien buscaba el programa tiene que ver que no hay programa.
- Las once páginas pasan a diez, y `lighthouserc.json`, el sitemap, la navegación y las listas de
  páginas de los tests bajan con ellas.
- La paleta nueva es **más fría**, y las fotos del incendio son cálidas. La banda oscura al lado de una
  foto naranja tiene más tensión que antes. Es deliberado: la pared verde agua de la foto y el acento de
  la interfaz ahora son el mismo color, que es exactamente lo que ADR-021 quería y no consiguió.
- `norma.roleLabel` se acorta, y con él el `jobTitle` de los datos estructurados.

## Cómo se verifica

Los trece criterios de `ux.md` §12 siguen valiendo, medidos por
`e2e/comun/revision-visual.spec.ts`, y dos de ellos cubren esta decisión sin cambios: el límite de tres
superficies con acento y la prohibición de versales. Se ajustan las listas de páginas y el mapa de
espacios reservados, que baja a **cero en todas las páginas**.

Se agrega un criterio, medido:

- **Ninguna página pública usa el token de acento retirado.** Es la forma de que el ladrillo no vuelva
  por un `text-brick` copiado de un componente viejo. Se comprueba en la misma corrida, leyendo el
  valor computado.

Y uno que depende de mirar, en 360 px y en 1440 px: que la apertura responda las cinco preguntas.

## Documentos relacionados

| Documento | Qué agrega |
|---|---|
| [`021-segunda-direccion-visual.md`](./021-segunda-direccion-visual.md) | La dirección que este ADR corrige, y la cláusula que lo habilita |
| [`012-design-system.md`](./012-design-system.md) | Los tokens, que acá cambian de valor y de nombre |
| [`../../specs/001-sitio-publico-campana/ux.md`](../../specs/001-sitio-publico-campana/ux.md) | Las secciones 1, 2, 3 y 9 que este ADR enmienda |
| [`../content-guide.md`](../content-guide.md) | La lista de lo que falta, y el razonamiento del año que se corrige |
| [`018-presupuestos-de-performance.md`](./018-presupuestos-de-performance.md) | El presupuesto que la sección nueva no puede exceder |
