# Fase 1 — Especificación de UX y sistema de diseño

Este documento define la identidad visual antes de escribir componentes, porque el principio VIII
de la constitución no se puede cumplir improvisando. Es la referencia contra la que se juzga el loop
de revisión visual.

---

## 1. Intención

La experiencia tiene que recorrer, en este orden: **memoria → ayuda → reconstrucción → futuro**.

Debe generar empatía, confianza y esperanza. **No** debe generar lástima. La diferencia es
concreta: la lástima se produce insistiendo en la pérdida; la confianza se produce mostrando trabajo,
números y avance. Por eso la página no se abre con el accidente: se abre con Norma.

Referencia conceptual: un libro documental o un suplemento dominical bien hecho. No una landing.
No un dashboard.

### Lo que está prohibido, y por qué es fácil caer

| Prohibido | Por qué se cae solo | Qué se hace en su lugar |
|---|---|---|
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

---

## 2. Tipografía

Dos voces, elegidas deliberadamente:

| Uso | Familia | Motivo |
|---|---|---|
| Títulos y prosa | **Newsreader** (variable) | Serif diseñada para leer en pantalla, con eje óptico. Da voz humana y editorial sin sonar antigua |
| Interfaz, etiquetas, cifras | **Archivo** (variable) | Grotesca de **Omnibus-Type, Buenos Aires**. La voz funcional del sitio es tipografía argentina; no es decorativo, es de dónde viene el proyecto |

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
| `--color-paper` | `oklch(98.6% 0.006 85)` | Fondo. Blanco cálido, no `#fff`: el blanco puro sobre pantalla brillante cansa |
| `--color-paper-sunk` | `oklch(96.4% 0.008 85)` | Bloques diferenciados, sin bordes |
| `--color-ink` | `oklch(22% 0.014 65)` | Texto. Casi negro **cálido**, no gris azulado |
| `--color-ink-muted` | `oklch(48% 0.014 65)` | Epígrafes, metadatos. Contraste ≥ 4.5:1 sobre papel |
| `--color-ink-faint` | `oklch(54% 0.012 65)` | Tercer nivel: créditos de foto, "(opcional)", línea legal. Contraste ≥ 4.5:1 sobre papel |
| `--color-rule` | `oklch(88% 0.008 65)` | Reglas de un pixel. Reemplazan a las cards |
| `--color-brick` | `oklch(52% 0.142 38)` | **Acento único.** Tierra colorada de Formosa y ladrillo de obra. Enlaces, acciones, la barra de progreso |
| `--color-brick-strong` | `oklch(44% 0.148 38)` | Estado activo y `:hover` |
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
| `ink` | 16,7:1 | 15,6:1 |
| `ink-muted` | 6,3:1 | 5,9:1 |
| `ink-faint` | 4,9:1 | 4,6:1 |
| `brick` | 5,7:1 | 5,3:1 |

`ink-faint` estuvo definido en `62%`, por debajo del umbral, con la condición de usarse sólo en
texto de 24 px o más —lo que WCAG 2.2 permite—. La condición no se sostuvo: los seis lugares donde
el sistema necesita un tercer nivel de tinta son texto chico, porque es ahí donde la jerarquía hace
falta. Una restricción que ningún uso real respeta es una trampa, así que el token se oscureció a
`54%` y la restricción desapareció. Lo encontró axe en la suite E2E, no una revisión a ojo, y por
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

Nueve páginas públicas. El nombre de cada URL está en castellano porque el sitio es en castellano.

### Home `/`

El orden responde las nueve preguntas en la secuencia en que una persona las hace:

1. **Apertura.** Retrato de Norma a sangrado, y sobre el papel debajo: "La Casa de Norma" en
   display, la línea "Reconstruimos una casa. Construimos un legado.", y dos acciones: *Ayudar a
   reconstruir* (primaria) y *Conocer la historia de Norma* (secundaria, enlace de texto con regla,
   no un segundo botón: dos botones compitiendo diluyen la decisión).
2. **Quién fue Norma.** Tres o cuatro párrafos, con foto lateral. Termina en enlace a la historia
   completa.
3. **Qué pasó.** Dos párrafos sobrios. Enlace a la página completa.
4. **Qué hay que reconstruir.** Rubros del presupuesto con monto cuando existe; si no, sólo el
   rubro.
5. **Cómo va.** Barra de progreso, monto recaudado, fecha de conciliación, y avance de hitos. Si no
   hay objetivo cargado, se muestra lo recaudado sin porcentaje.
6. **Cómo ayudar.** Los tres países, con la cuenta del país detectado por idioma/región primero, y
   copiado directo desde la home (SC-002: máximo tres toques).
7. **En qué se usó.** Tres cifras (recibido, gastado, saldo) y enlace a la transparencia completa.
8. **Qué sigue.** Fundación Norma y Riacho Conecta, en dos párrafos.
9. **Preguntas.** Las nueve preguntas como `h3` con respuesta directa debajo, en prosa.

### Resto de las páginas

| Ruta | Contenido |
|---|---|
| `/norma` | La historia completa. Ensayo fotográfico. Es la página que hace que el proyecto sea de una persona, no de una causa |
| `/que-paso` | El accidente, con respeto. Sin detalles gráficos. Termina en qué se necesita ahora, para que no cierre en la pérdida |
| `/reconstruccion` | Qué se perdió, qué hay que reparar, presupuesto por rubro, hitos, fotos del avance |
| `/ayudar` | Los tres países en detalle, con instrucciones y qué hacer después de transferir |
| `/transparencia` | Cifras arriba, libro de gastos abajo, comprobantes indicados, fecha de conciliación, explicación del método |
| `/novedades` y `/novedades/[slug]` | Actualizaciones fechadas; cada una compartible con su propia vista previa |
| `/legado` | Fundación Norma: qué se propone, en qué estado está |
| `/riacho-conecta` | El programa de formación y sus temas |
| `/legales/privacidad`, `/legales/terminos` | Qué se recolecta, para qué, cuánto se conserva |

### Navegación

Encabezado mínimo: el nombre del proyecto a la izquierda y *Ayudar* a la derecha. En mobile,
**sin menú hamburguesa**: el encabezado lleva sólo esas dos cosas y la navegación completa vive en
el pie. Un menú oculto en un sitio de nueve páginas agrega un toque y JavaScript sin dar nada.

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

Es el elemento con más peso de la página, y hoy es el que falta.

- Sin fotos reales, **no se usan ilustraciones ni imágenes de stock ni imágenes generadas**. Se
  reserva el espacio con la proporción correcta y un texto honesto de qué va ahí. Un espacio vacío
  con intención se lee como respeto; una foto de stock se lee como mentira.
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

### Lo que el loop encontró, y lo que decidió no cambiar

Los tres hallazgos —la medida que decía 68 y daba 104, la barra que duplicaba el botón de la
apertura, las reglas en tres extensiones distintas— están explicados en las secciones 2, 9 y 4. Los
tres se corrigieron y los tres tienen ahora una comprobación que los sostiene. Ninguno se veía en una
captura, y eso es lo que hay que recordar del loop: mirar sirve para juzgar, no para medir.

Queda algo que se vio y **no** se cambió, y conviene que esté escrito para que no se "arregle" sin
leer esto. En escritorio, una sección de sólo prosa deja la columna de texto a la izquierda con dos
tercios de la página vacíos a su derecha. Es la consecuencia aritmética del criterio 4: con 17 px de
Newsreader, una columna que entre en 68 caracteres mide 442 px, y para llenar 700 px con 68
caracteres habría que subir el cuerpo a 24 px, que es el tamaño de una bajada. El criterio 4 no se
negocia, así que la columna es angosta por definición. Y el lado derecho no está vacío por descuido:
es donde va la fotografía, que es el elemento con más peso del sitio y el que hoy falta (sección 10).
La apertura y la lista de novedades ya lo reservan explícitamente. Cuando las fotos lleguen, esa
mitad se ocupa sin mover una línea de layout.
