# Fase 1 — Especificación de UX y sistema de diseño

Este documento define la identidad visual antes de escribir componentes, porque el principio VIII
de la constitución no se puede cumplir improvisando. Es la referencia contra la que se juzga el loop
de revisión visual.

---

## 1. Intención

La experiencia tiene que recorrer, en este orden: **pérdida → comunidad → reconstrucción → legado**
([ADR-024](../../docs/adr/024-tercera-direccion-visual.md)).

El orden original era «memoria → ayuda → reconstrucción → futuro», y le faltaba un movimiento: la
comunidad. El sitio mostraba la pérdida en la home y el trabajo en una página interior, así que quien
leía la home entera veía la desgracia y no veía a los vecinos con la pala. Ése es el movimiento que
convierte una lista de desgracias en una campaña.

Debe generar empatía, confianza y esperanza. **No** debe generar lástima. La diferencia es
concreta: la lástima se produce insistiendo en la pérdida; la confianza se produce mostrando trabajo,
números y avance. Por eso la página **no se abre con las fotos del incendio**: se abre con Norma.

Lo que sí hace la apertura es **decir qué pasó, en prosa y con la fecha**. Durante un tiempo abrió con
un eslogan —«Reconstruimos una casa. Construimos un legado.»— y con eso alguien que llegaba de WhatsApp
no se enteraba de que había habido un incendio hasta la tercera sección. Contar el hecho no es lástima;
el eslogan, además, no informaba nada.

Referencia conceptual: un libro documental o un suplemento dominical bien hecho. No una landing.
No un dashboard.

### La regla operativa entre emoción y lástima

La distinción de arriba estaba escrita pero no era operativa, y durante un tiempo se cumplió por
omisión: no mostrando nada. El resultado fue un sitio que pedía plata para reconstruir una casa sin
decir que se había incendiado, y que por eso no emocionaba —no estaba contando nada— ni generaba
confianza. La regla que reemplaza a la omisión, de [ADR-021](../../docs/adr/021-segunda-direccion-visual.md):

> **La pérdida se muestra una vez y en pasado. El trabajo se muestra siempre y en presente.**

En la práctica: las fotos del incendio existen, van completas y sin suavizar, y van **una vez**, en su
sección. Las del trabajo —los escombros que ya se juntaron, la pala cargadora, los vecinos con palas,
las piezas del taller rescatadas— vuelven a aparecer y se actualizan. El par «así quedó / así está
hoy», fechado, es el argumento entero de la campaña en dos imágenes, y es factual: no hay un adjetivo,
hay dos fotos y dos fechas.

Y el relato lo escribe la familia. Cualquier adjetivo que agregue el sitio es exactamente la lástima
que esta sección prohíbe.

### Lo que está prohibido, y por qué es fácil caer

| Prohibido | Por qué se cae solo | Qué se hace en su lugar |
|---|---|---|
| **Sobrelínea en VERSALES arriba de cada título** | Se siente editorial y es gratis de agregar | Etiqueta sólo si transporta información que el título no tiene |
| **Un solo plano: un contenedor, una superficie, un ancho** | Es la consecuencia de no romper nunca la grilla | Sangrado para la fotografía, bandas de superficie entre secciones |
| **Un solo tamaño de texto haciendo de jerarquía** | La escala está en los tokens y no se usa | Un momento por página sube a display; el resto se queda quieto |
| Gradientes decorativos | Es el default de todo generador | Papel plano, tinta plana |
| Glassmorphism, blobs | Estética 2021 de plantilla | Nada. Silencio visual |
| Una card para cada cosa | Es la forma más rápida de agrupar | Reglas de un pixel y espacio en blanco |
| Bordes muy redondeados | Se siente "app", no "documento" | Radio 2 px como máximo; fotos a escuadra |
| Hero de SaaS centrado | Es el patrón por defecto | Composición editorial asimétrica |
| Ilustraciones vectoriales | Rellena cuando falta foto | Espacio reservado con la proporción correcta, honesto |
| Emojis decorativos | Se cuelan en los títulos | Ninguno |
| Iconos por todos lados | Rellenan huecos | Icono sólo cuando reemplaza una palabra que no cabe |
| Sombras difusas | Simula profundidad que no hace falta | Ninguna sombra. Jerarquía por tipografía y espacio |
| Animación de entrada en todo | Se ve "moderno" | Movimiento sólo cuando comunica un cambio de estado |

Las tres primeras filas se agregaron después, y conviene decir de dónde salieron porque son las
únicas que el proyecto **incumplió mientras la tabla estaba escrita**. La skill oficial
`frontend-design` de Anthropic enumera los grupos estéticos donde se agrupa hoy el diseño generado por
IA, y este sitio caía en cuatro a la vez: crema cálido con display serif y acento terracota, layout de
broadsheet con reglas de un pixel, sobrelínea en versales arriba de cada encabezado, y metadatos
unidos con puntos medios. Había **39 repeticiones** del patrón «etiqueta en versales + título +
regla» en nueve páginas, cero elementos a sangrado y cero superficies distintas de `paper`.

Ninguna de esas decisiones es ilegítima por separado —el ladrillo venía de la tierra colorada de
Formosa, Archivo es una grotesca de Buenos Aires—. El problema es que las cuatro juntas, sin
fotografía, son el default. El detalle está en
[ADR-021](../../docs/adr/021-segunda-direccion-visual.md).

ADR-021 corrigió dos de las cuatro —la sobrelínea y el plano único— y apostó a que la fotografía
cambiara la lectura de las otras dos, con una condición escrita: si con las fotos adentro la paleta
seguía leyéndose como default, se reevaluaba con evidencia. Se midió con las diez fotos publicadas y
seguía: papel `#fcfaf6`, acento `#aa4423`, títulos en serif. Las dos restantes se corrigen en
[ADR-024](../../docs/adr/024-tercera-direccion-visual.md): el acento pasa a ser el verde agua de la casa
y el display pasa a Archivo.

---

## 2. Tipografía

Dos voces, elegidas deliberadamente:

| Uso | Familia | Motivo |
|---|---|---|
| Display, títulos, interfaz, cifras | **Archivo** (variable) | Grotesca de **Omnibus-Type, Buenos Aires**. La voz que se lee primero es tipografía argentina; no es decorativo, es de dónde viene el proyecto |
| Prosa, bajadas, citas | **Newsreader** (variable) | Serif diseñada para leer en pantalla, con eje óptico. Es la voz del texto largo, que es lo que se lee en el teléfono |

Los roles estaban al revés hasta [ADR-024](../../docs/adr/024-tercera-direccion-visual.md): Archivo se
usaba en las etiquetas y las cifras, y los títulos —lo primero que alguien lee— se dibujaban con la
serif. Con eso el sitio cumplía el segundo de los tres rasgos que la skill `frontend-design` enumera para
el diseño generado por IA, «un display serif de alto contraste». Invertir los roles lo saca de esa lista
sin agregar una familia nueva ni un archivo más al presupuesto de fuentes.

Ambas se autoalojan con `next/font` (sin pedidos a terceros, sin FOUT). Sólo los pesos que se usan.

### Escala tipográfica

Escala modular de razón 1,25 con dos correcciones a mano donde la razón daba tamaños incómodos.
Todo en `rem`, con `line-height` y `letter-spacing` fijados por token, porque un display sin
`letter-spacing` negativo se ve amateur.

| Token | Tamaño | Line height | Tracking | Uso |
|---|---|---|---|---|
| `--text-display` | 3,25rem → 4,5rem fluido | 1,04 | −0,03em | El nombre del proyecto. Una vez por sitio |
| `--text-title` | 2rem → 2,75rem | 1,1 | −0,02em | `h1` de página |
| `--text-heading` | 1,5rem → 1,75rem | 1,2 | −0,01em | `h2` |
| `--text-subheading` | 1,125rem | 1,35 | 0 | `h3` |
| `--text-lead` | 1,25rem | 1,55 | 0 | Bajada de entrada |
| `--text-body` | 1,0625rem | **1,7** | 0 | Prosa. 1,7 porque el texto largo se lee en el teléfono |
| `--text-small` | 0,9375rem | 1,5 | 0 | Notas al pie, epígrafes |
| `--text-label` | 0,75rem | 1,3 | **0,08em** | Etiquetas en mayúsculas. Archivo |
| `--text-figure` | 2rem → 2,5rem | 1 | −0,02em | Cifras de transparencia. Archivo, tabular |

**Las cifras usan `font-variant-numeric: tabular-nums`.** Un monto que baila al actualizarse
transmite descuido, y acá los números son el argumento.

### El atributo `data-figure`

Toda cifra **que el proyecto afirma** —un monto, un porcentaje, un dato bancario— lleva
`data-figure`. No es una utilidad de estilo: es una afirmación sobre el origen del número, y de eso
dependen dos verificaciones opuestas de la suite E2E.

- Con base de datos: se suman las cifras de la tabla de gastos y tiene que dar el total publicado
  (SC-007).
- Sin base de datos: **no puede haber ninguna**. Es la forma de comprobar que el sitio no degrada a
  ceros, y un cero es una afirmación falsa sobre el mundo (FR-034, SC-012).

Por eso un número decorativo —el ordinal de una lista, un contador de pasos— **no** lleva
`data-figure` aunque quiera números tabulares: para eso está la utilidad `tabular-nums`. Marcar un
ordinal como cifra hace que la segunda verificación deje de verificar nada.

**Medida de lectura**: máximo **68 caracteres** para prosa. No negociable: una línea de 140
caracteres no se lee.

El token se expresa en `em` y no en `ch`, y la diferencia no es cosmética. `1ch` es el ancho de
avance del carácter «0», bastante más ancho que el carácter promedio de un texto en castellano, así
que `68ch` **entregaba entre 98 y 104 caracteres** en las once páginas: la medida decía 68 y daba
casi el doble del límite que la línea de 140 pretendía evitar. Con `--container-measure: 26em` la
medida medida —perdón por la redundancia, pero es el punto— queda **entre 61 y 66 caracteres** en los
tres tamaños de prosa, y además escala con el tamaño de cada rol en lugar de con la forma de un
glifo.

El valor se calibró midiendo, no eligiendo un número redondo: `28em` dejaba la prosa principal en 66
pero empujaba las notas al pie y los ítems de lista a 70 y 71, porque un `li` a `text-small` hereda la
medida del `ul` y le resta la sangría, y porque el ancho promedio de carácter depende de qué letras
tiene cada párrafo. Los dos efectos suman unos cinco caracteres de dispersión, y `26em` los absorbe.

Todo esto se descubrió midiendo y no leyendo el CSS —el token decía 68 y el CSS estaba bien escrito—,
y por eso la medición quedó automatizada en `e2e/comun/revision-visual.spec.ts`.

---

## 3. Color

Papel y tinta, más un solo acento. Todo en `oklch` para que las mezclas sean perceptualmente
correctas; Tailwind emite el fallback hexadecimal automáticamente.

| Token | Valor | Uso |
|---|---|---|
| `--color-paper` | `oklch(98.4% 0.004 200)` | Fondo. Blanco a la cal, apenas frío. No `#fff`: el blanco puro sobre pantalla brillante cansa |
| `--color-paper-sunk` | `oklch(95.8% 0.009 200)` | Bloques diferenciados, sin bordes |
| `--color-ink` | `oklch(21% 0.021 215)` | Texto. Pizarra mojada, no negro teñido |
| `--color-ink-muted` | `oklch(47% 0.021 215)` | Epígrafes, metadatos. Contraste ≥ 4.5:1 sobre papel |
| `--color-ink-faint` | `oklch(53% 0.018 215)` | Tercer nivel: créditos de foto, "(opcional)", línea legal. Contraste ≥ 4.5:1 sobre papel |
| `--color-rule` | `oklch(87% 0.011 200)` | Reglas de un pixel. Reemplazan a las cards |
| `--color-aqua` | `oklch(48% 0.075 195)` | **Acento único.** El verde agua del frente de la casa de Norma. Enlaces, acciones, la barra de progreso |
| `--color-aqua-strong` | `oklch(40% 0.08 195)` | Estado activo y `:hover` |

El acento **sale de la casa, no de la provincia**
([ADR-024](../../docs/adr/024-tercera-direccion-visual.md)). Era `--color-brick`, un terracota
`#aa4423` justificado por la tierra colorada de Formosa; el argumento era cierto y era sobre una
provincia de 72 000 km². El verde agua está en la pared del frente y en el `alt` de dos fotos
publicadas: es el dato más específico que tiene el proyecto. Va oscurecido y desaturado respecto del
color real de la pared porque el de la pared no llega a 4,5:1 sobre papel, y porque un turquesa
saturado se lee como marca de SaaS. Éste se lee como pintura de obra.
| `--color-success` | `oklch(48% 0.11 150)` | Hito completado |
| `--color-warning` | `oklch(58% 0.13 75)` | Dato desactualizado |
| `--color-danger` | `oklch(50% 0.17 25)` | Errores, anulaciones |
| `--color-focus` | `oklch(45% 0.19 250)` | Anillo de foco. **Azul deliberadamente distinto del acento** para que se lea como "el sistema me está indicando algo", no como decoración |

**El acento se usa poco.** Si hay más de tres elementos color ladrillo en una pantalla, algo está
mal. En una página editorial el color es un señalador, no un relleno.

Lo que se cuenta son las **superficies rellenas** con el acento: un botón ladrillo, la barra de
progreso, un bloque destacado. No se cuentan los enlaces, aunque lleven el mismo token en el texto y
en la regla de un pixel: ésa es la forma que tiene un enlace en este sistema, y contarla convertiría
el límite en "no más de tres enlaces por pantalla", que en una página editorial es absurdo. La
distinción se escribió después de medir: `/novedades` acusaba cuatro elementos y dos eran los títulos
de las novedades de la lista, exactamente donde un enlace tiene que estar.

Modo oscuro: **fuera de alcance en v1** (principio III). Los tokens están estructurados para
soportarlo con `@custom-variant dark` sin refactor.

### Contraste verificado

Todo par texto/fondo cumple al menos 4.5:1 en cualquier tamaño, medido sobre los dos papeles:

| Tinta | Sobre `paper` | Sobre `paper-sunk` |
|---|---|---|
| `ink` | 16,87:1 | 15,66:1 |
| `ink-muted` | 6,47:1 | 6,01:1 |
| `ink-faint` | 5,01:1 | 4,65:1 |
| `aqua` | 6,02:1 | 5,59:1 |

Los valores se calculan convirtiendo cada `oklch` a sRGB y aplicando la fórmula de WCAG 2.x, **antes**
de escribir el CSS. No se estiman: la tabla anterior estuvo mal y la encontró axe en la corrida de E2E,
no una revisión a ojo.

`ink-faint` estuvo definido en `62%`, por debajo del umbral, con la condición de usarse sólo en
texto de 24 px o más —lo que WCAG 2.2 permite—. La condición no se sostuvo: los seis lugares donde
el sistema necesita un tercer nivel de tinta son texto chico, porque es ahí donde la jerarquía hace
falta. Una restricción que ningún uso real respeta es una trampa, así que el token se oscureció a
`54%` —hoy `53%`, recalculado en el tono nuevo— y la restricción desapareció. Lo encontró axe en la
suite E2E, no una revisión a ojo, y por
eso la comprobación automática vale: la regla estaba escrita en esta misma página y aun así se
incumplió en seis lugares.

`rule` (1,4:1) es para líneas de un pixel, que no son texto ni un control: no le aplica el umbral.

---

## 4. Espacio, grilla y ritmo

Escala de espacio en base 4 px con un salto editorial grande, porque el espacio en blanco generoso
es el requisito, no un lujo:

```
3xs 2px · 2xs 4px · xs 8px · sm 12px · md 16px · lg 24px · xl 32px
2xl 48px · 3xl 64px · 4xl 96px · 5xl 128px · 6xl 192px
```

Entre secciones mayores: `4xl` en mobile, `5xl`/`6xl` en desktop. La separación entre bloques hace
más por la jerarquía que cualquier borde.

**Grilla**: 12 columnas en desktop con canaleta de 24 px; una columna en mobile. Márgenes laterales
de 20 px en mobile y hasta 96 px en desktop.

Las composiciones son **asimétricas**: la prosa ocupa las columnas 2–8, los epígrafes viven en la
columna 10–12, y las fotos importantes se van a sangrado completo. Centrar todo es la firma del
template.

### Las tres formas de romper el plano

Estaban prometidas y no se usaban: durante mucho tiempo el sitio tuvo **cero** elementos a sangrado y
**cero** superficies distintas de `paper` en páginas públicas. Un documento con un solo plano es plano,
y ninguna cantidad de espacio en blanco lo arregla.

| Recurso | Cuándo | Límite |
|---|---|---|
| **Sangrado completo** | Sólo fotografía, y sólo la que lleva el peso del relato | Como máximo una por página. Requiere resolución real: una foto de 600 px estirada a 1440 se ve peor que la misma foto chica y bien puesta |
| **Banda de superficie** | Secciones enteras sobre `paper-sunk`; **una sola** sobre tinta, la de qué ocurrió | El tono oscuro no es un efecto: sólo se usa donde el contenido lo justifica. Contraste y foco se verifican igual que sobre papel |
| **Margen editorial** | La columna 10–12, que antes quedaba vacía, lleva la foto, el epígrafe, la fecha o la cifra al margen | Es información, no decoración. Si no hay qué poner, la sección va a ancho de prosa y listo |

El color fuerte lo aportan **las fotos**, no los tokens: el verde agua del frente de la casa, el
ladrillo real de los escombros, el verde de los árboles. El acento ladrillo sigue siendo el único
acento de interfaz y sigue el límite de tres superficies con acento por pantalla (sección 3).

**Reglas** (`1px solid var(--color-rule)`) separan secciones. Es el recurso que reemplaza a las
cards y es lo que hace que el sitio se lea como un impreso.

Radios: `--radius-sm: 2px`, `--radius-md: 3px`. Nada más. Las fotos no llevan radio.

Sombras: **ninguna** en v1. El único token es `--shadow-focus`, el anillo de foco.

---

## 5. Movimiento

| Token | Valor |
|---|---|
| `--ease-editorial` | `cubic-bezier(0.2, 0.7, 0.2, 1)` |
| `--duration-fast` | 120ms (respuesta a un toque) |
| `--duration-base` | 220ms (cambio de estado) |

Sólo se anima: la confirmación de copiado, la apertura del selector de país, y el llenado inicial de
la barra de progreso. Nada más. Dentro de `@media (prefers-reduced-motion: reduce)` todas las
duraciones bajan a `0.01ms`.

---

## 6. Breakpoints

`sm 40rem · md 48rem · lg 64rem · xl 80rem`. El diseño se define primero en 360 px de ancho, que es
el caso real de quien llega de WhatsApp, y se expande.

---

## 7. Estados

Todos los estados están diseñados; un estado no diseñado es un bug pendiente (principio XII).

| Estado | Tratamiento |
|---|---|
| Foco | Anillo de 2 px `--color-focus` con offset de 2 px. **Nunca `outline: none`** |
| Hover | Sólo en dispositivos con puntero (`@media (hover: hover)`) |
| Activo | Desplazamiento de 1 px, sin escalado |
| Deshabilitado | Opacidad reducida más `cursor: not-allowed` y `aria-disabled` |
| Cargando | Texto explícito ("Cargando gastos…"), no esqueletos que simulan contenido |
| Vacío | Frase que explica por qué está vacío y qué va a pasar. Nunca un cero solo |
| Error | Qué falló, en castellano llano, y qué se puede hacer |
| Dato pendiente | La sección **se omite**. No hay placeholder |

Objetivos táctiles: 44×44 px mínimo, con el área ampliada por padding, no por tamaño visual.

---

## 8. Componentes del sistema de diseño

Escritos a mano. Sin librería de componentes.

| Componente | Responsabilidad | Notas de accesibilidad |
|---|---|---|
| `Prose` | Prosa larga con medida y ritmo vertical | Jerarquía de encabezados coherente |
| `SectionHeading` | Etiqueta en mayúsculas + título + regla | Un `h2` real, la etiqueta no es encabezado |
| `Figure` | Foto con proporción reservada, epígrafe y crédito | `alt` requerido por tipos; `figcaption` real |
| `PhotoEssay` | Serie de fotos a sangrado | Navegable con teclado si tiene desplazamiento |
| `Figure` de datos (`Stat`) | Una cifra con su etiqueta y su fecha | Cifras tabulares; la etiqueta es parte del nombre accesible |
| `ProgressBar` | Avance recaudado/objetivo | `role="progressbar"` con valores; el número también en texto |
| `CopyField` | Dato bancario con botón de copiar | Confirmación por `aria-live="polite"`; funciona con teclado; falla visiblemente si el navegador niega el portapapeles |
| `CountryTabs` | Elegir país de aporte | Patrón de tabs con flechas, `aria-selected`, sin JS: en no-JS se ven las tres |
| `Timeline` | Hitos con estado | Lista ordenada real, no divs |
| `Ledger` | Tabla de gastos | `<table>` con `<caption>` y encabezados asociados; en mobile se reordena, no se hace scroll horizontal |
| `Callout` | Aviso (dato desactualizado, falta información) | `role="note"`; el color no es el único indicador |
| `ShareRow` | Compartir | Usa `navigator.share` si existe; si no, enlaces reales |
| `Byline` | Autoría y fecha de actualización | `<time datetime>` |

Cada primitiva tiene test de componente con Testing Library y aparece en las corridas de axe.

---

## 9. Estructura de páginas

**Diez** páginas públicas. El nombre de cada URL está en castellano porque el sitio es en castellano.
Eran once hasta [ADR-024](../../docs/adr/024-tercera-direccion-visual.md), que retiró
`/riacho-conecta`: era una página entera dedicada a un programa que no existe, y su contenido
verificable son dos oraciones que viven en `/legado`.

### Home `/`

El orden recorre los cuatro movimientos —pérdida, comunidad, reconstrucción, legado— y dentro de eso
responde las nueve preguntas en la secuencia en que una persona las hace:

1. **Apertura.** Retrato de Norma a sangrado en teléfono, y sobre el papel: "La Casa de Norma" en
   display, **qué ocurrió en prosa y con la fecha**, y tres cosas que hacer: *Ayudar a reconstruir*
   (acción primaria), *Leer qué ocurrió* y *Compartir* (las dos como enlace de texto, no como botón:
   dos botones compitiendo diluyen la decisión). Tiene que responder las cinco preguntas de
   [ADR-024](../../docs/adr/024-tercera-direccion-visual.md) sin desplazarse en 360 px.
2. **Quién fue Norma.** Tres párrafos, con foto lateral. Termina en enlace a la historia completa.
3. **Qué pasó.** Banda sobre tinta. Dos párrafos sobrios y la frase de la familia, atribuida. Enlace a
   la página completa. Es el único lugar de la home donde se habla de la pérdida.
4. **El trabajo empezó.** Las dos fotos de la limpieza, fechadas, con gente del pueblo y la máquina
   prestada. Es el movimiento de comunidad, y existe porque sin él la home mostraba la desgracia y no
   mostraba el trabajo (ADR-024).
5. **La obra.** Qué hay que reconstruir y cómo va, en una sola sección: rubros del presupuesto con
   monto cuando existe, barra de progreso, monto recaudado, fecha de conciliación y avance de hitos.
   Estaban separadas por herencia del orden de las preguntas, no por una razón de lectura. Si no hay
   objetivo cargado, se muestra lo recaudado sin porcentaje.
6. **Cómo ayudar.** Los tres países, con la cuenta del país detectado por idioma/región primero, y
   copiado directo desde la home (SC-002: máximo tres toques).
7. **En qué se usó.** Tres cifras (recibido, gastado, saldo) y enlace a la transparencia completa.
8. **Qué sigue.** El legado, en dos párrafos, y un solo enlace. Se dice que la fundación todavía no
   existe como organización, porque es verdad y porque decir lo contrario sería el primer dato falso
   del proyecto.
9. **Preguntas.** Las nueve preguntas como `h3` con respuesta directa debajo, en prosa.
10. **Compartir.** Sigue al final, y ya no es la única vez: la apertura tiene su enlace.

### Resto de las páginas

| Ruta | Contenido |
|---|---|
| `/norma` | La historia completa. Ensayo fotográfico. Es la página que hace que el proyecto sea de una persona, no de una causa |
| `/que-paso` | El accidente, con respeto. Sin detalles gráficos. Termina en qué se necesita ahora, para que no cierre en la pérdida |
| `/reconstruccion` | Qué se perdió, qué hay que reparar, presupuesto por rubro, hitos, fotos del avance |
| `/ayudar` | Los tres países en detalle, con instrucciones y qué hacer después de transferir |
| `/transparencia` | Cifras arriba, libro de gastos abajo, comprobantes indicados, fecha de conciliación, explicación del método |
| `/novedades` y `/novedades/[slug]` | Actualizaciones fechadas; cada una compartible con su propia vista previa |
| `/legado` | Fundación Norma: qué se propone, en qué estado está, y que todavía no existe como organización |
| `/legales/privacidad`, `/legales/terminos` | Qué se recolecta, para qué, cuánto se conserva |

### Navegación

La decisión original —«encabezado mínimo, sin menú hamburguesa, la navegación completa vive en el
pie»— acertó en la mitad. El menú oculto sigue descartado: agrega un toque y JavaScript para esconder
ocho enlaces. Lo que no se sostuvo es que el pie alcance. En la home son **11 497 px de alto en un
teléfono de 360 px, casi quince pantallas**, y hasta hoy ése era el único lugar del sitio donde se
decía que había otras páginas. La familia lo dijo así: «no veo clara la navegación».

- **Escritorio**: las seis rutas primarias visibles en el encabezado, con `aria-current="page"` en la
  actual. El nombre del proyecto a la izquierda y *Ayudar* como acción a la derecha.
- **Teléfono**: el encabezado mantiene el nombre y *Ayudar*, y la navegación aparece **dentro del
  documento**, como sumario, inmediatamente después de la apertura. Es el recurso de una publicación
  impresa —una lista real de enlaces, cada uno con lo que hay en esa página—, no chrome de aplicación.
  Nada queda oculto detrás de un toque.
- Cada página termina en dos enlaces concretos de a dónde ir después, con texto propio. **Nunca «ver
  más»**: un lector de pantalla puede pedir la lista de enlaces fuera de contexto.

Se descartó la barra de navegación fija en teléfono: come alto de pantalla en el dispositivo donde
menos hay, y ya hay una barra fija abajo. Dos barras fijas en 360 px dejan una ventana de lectura de
nada.

La acción de ayudar es persistente en mobile como una barra inferior compacta, que **no** tapa
contenido (el `body` reserva su altura) y que desaparece en la propia página de aportes.

**Y se retira mientras la acción primaria ya está en pantalla.** La barra existe para que ayudar esté
a un toque cuando la persona se alejó de la apertura; sobre el pliegue de la home no cumple ninguna
función, porque ahí el botón *Ayudar a reconstruir* está a la vista. Lo que hacía era duplicarlo:
dos llamadas idénticas al mismo destino en la misma pantalla, cuatro elementos con acento donde el
sistema admite tres (sección 12). Se resolvió a favor de la barra —el requisito de mobile es real— y
en contra de mostrarla siempre: un observador de intersección sobre el botón de la apertura la oculta
mientras ese botón es visible. El estado por omisión es *visible*, así que si el JavaScript no llega
la barra se comporta como antes y la acción nunca se pierde.

---

## 10. Fotografía

Es el elemento con más peso de la página, y es lo que **estructura** el documento: el resto se ordena
alrededor de ella. No es un adorno que se agrega al final.

Viene por dos caminos, siguiendo la misma división por frecuencia de cambio que el resto del contenido
(ADR-007, extendido por ADR-021):

| Fuente | Qué fotos | Cómo se edita |
|---|---|---|
| `public/fotos/`, declaradas en `content/*.json` | Las editoriales: el retrato de Norma, el frente, el interior, el garage, la limpieza. Se eligen una vez | Commit y pull request |
| Supabase Storage vía `/admin` | Las del avance de la obra, adjuntas a cada novedad y fechadas | Backoffice, sin despliegue |

Las editoriales no van a la base porque son parte del relato, no un dato operativo, y tienen que estar
en pantalla también cuando la base no responde. Una foto **no es una cifra** —no afirma un número—, así
que publicarla sin base de datos no viola FR-034 ni la verificación del modo `sin-datos`, que sigue
exigiendo cero `data-figure`.

- Sin fotos reales, **no se usan ilustraciones ni imágenes de stock ni imágenes generadas**. Se
  reserva el espacio con la proporción correcta y un texto honesto de qué va ahí. Un espacio vacío
  con intención se lee como respeto; una foto de stock se lee como mentira. Pero es un **estado
  transitorio**: si el material puede tardar, la página tiene que verse terminada sin él (sección 12).
- **La orientación del material manda.** Lo que se filmó con el teléfono en la mano es 9:16 y no se
  recorta a apaisado sin perder algo: va al ancho completo en teléfono, que es su formato nativo, y al
  margen en escritorio. Estirar una foto de 600 px a 1440 se ve peor que la misma foto chica y bien
  puesta.
- **Una cara identificable necesita permiso de esa persona.** En el material de la limpieza hay vecinos
  que fueron a ayudar; hasta que estén los permisos se usan los encuadres donde nadie es reconocible.
- Toda imagen pasa por `next/image` con `width` y `height` reales.
- `alt` describe lo que importa de la imagen, no el archivo. Es obligatorio en el esquema de la
  base.
- Epígrafe y crédito visibles cuando existan.
- La imagen de compartir (1200×630) se genera del lado servidor con la tipografía del sitio.

---

## 11. Copy

Castellano rioplatense. Voseo cuando se dirige a la persona ("podés copiar el CBU"). Frases cortas.
Sin adjetivos de más.

**Prohibido**: "juntos podemos", "transformando vidas", "construyendo un futuro mejor",
"empoderar comunidades", "hacer la diferencia". Y todo lo que suene a folleto.

El tono correcto es concreto:

> Norma pasó gran parte de su vida ayudando a que las historias de Riacho He Hé pudieran ser
> escuchadas. Ahora queremos que su historia ayude a otros a encontrar su propia voz.

Los números se escriben con la unidad y la fecha: "$ 1.240.000 recibidos al 9 de septiembre". Un
número sin fecha no es un dato, es una afirmación.

---

## 12. Criterios de aceptación visual

El loop de revisión visual cierra sólo cuando, en 360 px y en el ancho de escritorio, las once
páginas cumplen los diez criterios. Cada uno dice con qué se comprueba, y eso es la mitad del
criterio: seis se miden en cada corrida de CI, y sólo cuatro dependen de que alguien mire.

- [x] La primera pantalla en mobile comunica qué es esto y qué se puede hacer, sin desplazarse.
      → `e2e/comun/home.spec.ts` (SC-001) y la captura `home--mobile-fold`.
- [x] No hay ningún gradiente, blob, sombra difusa ni card decorativa.
      → medido: `e2e/comun/revision-visual.spec.ts`, criterio 2.
- [x] Hay como máximo tres superficies con relleno de acento por pantalla (sección 3: los enlaces no
      cuentan). → medido, criterio 3.
- [x] La prosa no supera los 68 caracteres por línea en ningún viewport. → medido, criterio 4.
- [x] Las cifras están alineadas y no bailan. → medido, criterio 5.
- [x] Cada foto (o su espacio reservado) mantiene su proporción sin saltos de layout.
      → medido, criterio 6: toda imagen declara su proporción antes de cargar.
- [x] El foco es visible en todos los elementos interactivos, recorridos con Tab.
      → `e2e/comun/accesibilidad.spec.ts`, que recorre con Tab **todo** lo enfocable de cada página.
- [x] Copiar un dato bancario desde la home toma tres toques o menos.
      → `e2e/con-datos/aportes.spec.ts` (SC-002) para el camino corto, y el flujo 5
      (`portapapeles.spec.ts`) para que lo copiado sea exactamente lo que estaba en pantalla.
- [x] Ninguna cifra o dato de ejemplo aparece en pantalla.
      → `npm run check:placeholders`, y el modo sin datos exige que no haya **ningún** `data-figure`.
- [x] La página se puede leer completa con el ancho de un teléfono, sin scroll horizontal.
      → medido, criterio 10.

Los cuatro que agrega [ADR-021](../../docs/adr/021-segunda-direccion-visual.md), después de que la
familia dijera que el sitio estaba monótono:

- [x] Ninguna página pública muestra un espacio reservado de foto donde ya hay material disponible.
      → medido, criterio 11: el número de huecos por página es **exacto**, y desde
      [ADR-024](../../docs/adr/024-tercera-direccion-visual.md) es **cero en todas**. Los dos que
      quedaban esperaban la foto de Norma en la radio, que la guía de contenido marca como «si existe»:
      un hueco es honesto como estado transitorio, no como layout.
- [x] La home presenta al menos una imagen que llega al borde de la pantalla en 360 px y más de una
      superficie de sección. → medido, criterio 12. El sangrado es **en teléfono** y no en escritorio:
      todas las fotos que hay son verticales o casi cuadradas, y a 1440 px de ancho una foto de
      proporción 1,03 no es una banda, es una pared de 1390 px de alto (§10).
- [x] Desde la apertura, en teléfono, se llega a cualquiera de las seis rutas primarias sin recorrer la
      página entera. → `e2e/comun/navegacion.spec.ts`. La primera corrida de ese archivo encontró el
      pie en lugar del sumario: el sumario salía sin nombre accesible porque `Container` no pasaba
      `aria-label`, y los tres puntos de navegación se llamaban igual.
- [x] No queda ninguna sobrelínea en versales que sólo repita el título de su sección.
      → medido, criterio 13, que va más lejos que el criterio: **ninguna** página pública tiene texto
      en versales. `/admin` sí las conserva, porque es una herramienta interna y densa.

Y el que agrega [ADR-024](../../docs/adr/024-tercera-direccion-visual.md):

- [x] Ninguna página pública usa el acento retirado. → medido, criterio 14: se lee el color computado de
      todo lo que pinta, y el terracota de `--color-brick` no puede volver por un `text-brick` copiado
      de un componente viejo. Es la comprobación que faltó las dos veces anteriores: la paleta se
      cambió en los tokens y nada impedía que un archivo quedara atrás.

### Lo que el loop encontró, y lo que decidió no cambiar

Los tres hallazgos —la medida que decía 68 y daba 104, la barra que duplicaba el botón de la
apertura, las reglas en tres extensiones distintas— están explicados en las secciones 2, 9 y 4. Los
tres se corrigieron y los tres tienen ahora una comprobación que los sostiene. Ninguno se veía en una
captura, y eso es lo que hay que recordar del loop: mirar sirve para juzgar, no para medir.

### Lo que se defendió mal, y hay que leer antes de volver a defenderlo

Hubo algo que se vio y **no** se cambió, y quedó escrito acá como decisión deliberada. Era un error, y
se deja el argumento a la vista porque la forma del error es más útil que su corrección.

El argumento decía: en escritorio, una sección de sólo prosa deja la columna de texto a la izquierda
con dos tercios de la página vacíos a su derecha; es la consecuencia aritmética del criterio 4 —con
17 px de Newsreader, una columna de 68 caracteres mide 442 px—; el criterio 4 no se negocia, así que la
columna es angosta por definición; y el lado derecho no está vacío por descuido, es donde va la
fotografía. Cerraba con: «Cuando las fotos lleguen, esa mitad se ocupa sin mover una línea de layout».

Las dos primeras partes son ciertas. La conclusión no. **Un diseño que sólo funciona cuando llega un
material que no controlás no es un diseño con espacio reservado: es una promesa.** Y mientras la
promesa no se cumplió, lo que la familia vio fue esto: once páginas con un solo contenedor, una sola
superficie, un solo ancho de prosa, cero imágenes, treinta y nueve encabezados iguales y dos tercios de
pantalla en beige. La palabra que usaron fue «monótona», y describe una propiedad medible.

Dos lecciones, y la segunda es la que importa:

1. El espacio reservado es honesto como **estado transitorio**, no como layout. Si el material puede
   tardar, la página tiene que verse terminada sin él.
2. **Un argumento correcto puede defender un resultado malo.** Cada paso de ese razonamiento era
   válido y la conclusión era indefendible en cuanto alguien mirara la pantalla. Es la misma forma que
   tuvo el hallazgo de `ink-faint`: una restricción escrita en esta página, incumplida en seis lugares
   de esta página. La diferencia es que a `ink-faint` lo encontró axe, y a esto no lo encontró nada
   porque no había con qué medirlo. De ahí los cuatro criterios nuevos de
   [ADR-021](../../docs/adr/021-segunda-direccion-visual.md), que sí se miden.
