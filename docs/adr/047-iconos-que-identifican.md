# ADR-047 · Un icono al lado del nombre, siempre que identifique

**Estado**: Aceptada · **Fecha**: 2026-09-16 · **Enmendada**: 2026-09-20

Enmienda a [ADR-032](./032-relato-mobile-editorial.md) (el selector de país y
los datos para transferir) y a [ADR-012](./012-design-system.md) (de dónde
salen los pictogramas). No toca el relato fotográfico ni el catálogo de
marcas de terceros ([ADR-021](./021-segunda-direccion-visual.md),
`check:marcas`).

## Contexto

Quien llega a `/ayudar/dinero` ve tres países y, en Argentina y Chile, una
lista de datos bancarios. El banco ya lleva su logo (Brubank, Scotiabank). El
resto era texto: el tab de país, Alias, CBU, titular. En la ficha del
catálogo, «Transferencia» tampoco tenía marca; Mercado Pago y PayPal sí.

El pedido es que **donde un icono identifica, vaya**. No como adorno: para
barrer Alias, CBU y país sin leer dos veces. La constitución VIII sigue
prohibiendo la iconografía por relleno —un pictograma al lado de cada
párrafo, un pack de Lucide, un emoji—. Lo que cambia es el vacío en los
lugares que ya se escanean: transferencia, países, caminos de ayudar,
canales de la ficha, llamar y escribir.

Al ponerlos, el tamaño no era uno. Alias iba a 16 px junto a una caption de
14 px; el globo de Internacional, 16 px junto a un cuerpo de 17 px; los
caminos de `/ayudar`, 20 px junto a un título de 24–30 px. `BrandMark` ya
seguía la letra (`1.15em`). Había que unificar colocación y tamaño, no
inventar un tamaño más.

## Decisión

1. **Si un control, un campo, un canal, un camino o un ítem de menú se puede
   reconocer de un vistazo, lleva su marca.** El nombre no se reemplaza: el
   icono es `aria-hidden` y el texto sigue siendo lo que se lee y se oye.
2. **Antes del nombre, en la misma línea.** El pictograma es el primer hijo
   del renglón que nombra la cosa (el tab, la etiqueta, el radio, el título
   de camino, el enlace del drawer). No va después. No va arriba como
   kicker. No va al lado de un párrafo de relato. Eso es el criterio de
   «siempre antes del subtítulo»: antes de *ese* nombre, no antes de
   cualquier titular del sitio.
3. **El tamaño es `1.15em` de esa letra.** Al menos el cuerpo de la palabra
   a la que acompaña, un poco más para que el trazo —que no llena el
   viewBox— se lea del mismo tamaño que la capital. Lo impone el token
   `--identifying-mark` y la clase `identifying-mark` / el componente
   `IdentifyingMark`. Las banderas miden esa altura y 3:2 de ancho
   (`identifying-flag`). `BrandMark` usa la misma clase. El `em` escala con
   el zoom de texto (WCAG 1.4.4).
4. **Dos familias, ningún pack.**
   - **Identifica** (qué es esto): `IdentifyingMark` + trazo, o `BrandMark`,
     o `CountryFlag`. Oliva sobre papel; hereda tinta en el drawer.
   - **Actúa** (qué hago): `ICON_ACTION` de 44 px (copiar, cerrar, menú) o
     flecha *después* del texto en la secundaria. No se envuelven en
     `IdentifyingMark`.
   - Sin relleno, sin Lucide, sin Heroicons, sin emoji.
5. **En la transferencia, cada fila tiene marca.** Alias, CBU, cuenta,
   titular, CUIT, RUT, correo, banco y tipo salen de `COPY_FIELD_MARKS`. El
   tab de país lleva bandera o globo. «Transferencia» en la ficha lleva el
   pictograma de banco; «traer el mismo bien», el de caja.
6. **Los tres caminos de `/ayudar` también.** Ir, donar plata y traer
   artículos llevan su pictograma antes del título, a 1.15 em de ese título.
7. **Un botón con caja y nombre lleva marca.** Primaria, compacta, contorno
   y envío público: el pictograma va **antes** del nombre, en
   `IdentifyingMark` (o `BrandMark` si es una marca). `ICON_ACTION` ya es el
   icono. La secundaria sigue con la flecha **después** del texto. El
   backoffice se pone al día cuando se toca cada pantalla.
8. **La compuerta es `npm run check:iconos`.** Una etiqueta de `CopyField`
   sin marca, un selector de país sin bandera, un camino de ayudar sin
   `IdentifyingMark`, un botón con caja sin marca, un `size={16}` o un
   `import` de un pack rompen el build. Un párrafo en una Skill no alcanza.

El 1.15 em no se inventó acá. Apple escala SF Symbols con el texto. Material
alinea el icono a la izquierda del label y recomienda que el glifo no quede
más chico que la letra. Nielsen: reconocer de un vistazo, no recordar. WCAG
1.1.1: el pictograma es decorativo (`aria-hidden`) porque el nombre ya está.
WCAG 1.4.4: si el tamaño es `px`, el zoom de texto deja el icono atrás.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir con el tab de país en texto solo | El pedido es reconocer el país de un vistazo. La bandera ya existía en Mercado Pago |
| Un pack de iconos (Lucide, Heroicons) | Se lee como plantilla. La constitución VIII lo cierra como relleno |
| Reemplazar el nombre por el icono | Quien no reconoce el pictograma no sabe qué copia. El lector de pantalla oiría un vacío |
| Poner un icono en cada párrafo del relato | Eso sí es relleno. El relato sigue siendo foto y prosa |
| Un tamaño fijo (16 o 20 px) para todos | Junto a un título queda chico; junto a una caption, a veces grande. El `em` es el que ya usaba `BrandMark` |
| El icono arriba del título, como kicker | El sitio ya rechazó la sobrelínea en versales. Un pictograma encima repite ese delator |
| El icono después del nombre | En LTR se barre izquierda → derecha: primero se reconoce, después se lee |

## Consecuencias

**Buenas.** `/ayudar/dinero` se barre: país, banco, Alias, CBU. La ficha
distingue traer, transferir y los dos medios con marca. Un camino de
`/ayudar` lleva el pictograma del mismo cuerpo que su título. La regla vive
en Skills, en `.cursor/rules/iconos.mdc` y en la compuerta.

**Malas y aceptadas.** Hay más pictogramas en `icons.tsx`. Cada campo nuevo
de transferencia pide una entrada en `COPY_FIELD_MARKS` o `check:iconos`
falla. El tab de país ahora tiene bandera: ADR-032 decía que el nombre
alcanzaba; esta decisión lo enmienda. Un título de sección (`text-section-title`)
hace el icono visiblemente más grande que una caption: es el punto.

## Enmienda · Botón con caja, marca antes (2026-09-20)

La dueña pidió que todo botón vaya con icono. VIII ya lo cubría como control;
faltaba nombrarlo y frenarlo. `PrimaryAction` exige `icon`. `HelpCta` y
`SubmitButton` (cuenta) envuelven la marca. Un archivo que usa
`primaryActionClass`, `compactPrimaryActionClass` o
`compactOutlineActionClass` sin `IdentifyingMark`, `HelpActionLabel` ni
`BrandMark` lo corta `check:iconos`. Ingresar lleva persona; Ayudar, las
manos. El backoffice no entra en esta pasada.
