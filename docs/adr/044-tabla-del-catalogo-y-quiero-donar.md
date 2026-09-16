# ADR-044 · El catálogo es una tabla también en el teléfono, con estimado y un «Quiero donar»

**Estado**: Aceptada · **Fecha**: 2026-09-15

Enmienda a [ADR-041](./041-estimado-publico-y-cubrir-con-plata.md) (el estimado
también se publica en el listado), a [ADR-032](./032-relato-mobile-editorial.md)
(el CTA de cada fila es secundaria) y a FR-209 / FR-214 / FR-254 / FR-256.

## Contexto

En teléfono el listado de lo que falta se apilaba: cada columna era un bloque
debajo de la anterior. Se leía como una lista, no como una tabla. Quien quería
ayudar no veía un precio ni un botón para anotarse: tenía que abrir la ficha
para enterarse de que se puede traer el mismo bien o cubrirlo con plata.

En la ficha, al cubrilo con plata, los datos de transferencia, Mercado Pago y
PayPal aparecían todos juntos, más un selector de país. Quien elegía
transferencia veía igual el link de Mercado Pago. Confunde.

Los precios de referencia de la casa básica estaban en nulo a propósito:
ADR-041 no inventaba promedios. El pedido ahora es publicarlos, sacados de
internet, con Formosa primero cuando hay un número de esa plaza.

## Decisión

1. **`/catalogo` es una tabla en todo ancho de pantalla.** `thead` visible,
   cada fila es `table-row`. Si no entra, se desplaza adentro de un
   `overflow-x-auto`: no se apila y no desborda la página (criterio 10 de
   `revision-visual.spec.ts`).
2. **Columnas del listado:** qué, cantidad, si alguien la tomó, nombre,
   estimado por unidad, estimado total de lo que falta, y al final «Quiero
   donar». En Qué, una miniatura de la foto (subida o de referencia) junto al
   título, no una columna más (ADR-043). Sin foto, el título solo: MUST NOT
   reservar un hueco. El total es `netCoverAmount(unit, remaining)`: lo que
   queda, no lo pedido original. Ítem cubierto: sin botón y sin total.
3. **«Quiero donar» es `SecondaryAction`.** Una primaria por pantalla, y esa
   sigue siendo «Ayudar a reconstruir». El CTA de fila abre la ficha
   (`/catalogo/{id}`). El HTML público es idéntico con o sin sesión
   (ADR-037): si no hay sesión, el formulario de la ficha redirige a
   **crear una cuenta** con `volver` a esa ficha. Quien ya tiene cuenta
   pasa a ingresar desde ahí, con la misma vuelta.
4. **El estimado del listado es el mismo de la ficha.** Sale de
   `estimated_unit_amount_minor` + `currency`. Etiquetado: no es un precio
   fijo. Si no hay número cargado, la celda es un em dash, no un cero. Los
   estimados de la casa básica viven en
   `docs/sql/catalogo-casa-basica.sql`, con fuente y fecha en
   `docs/research/2026-09-precios-catalogo.md`. Un ítem sin fuente queda
   nulo. No se scrapea en runtime.
5. **`formatMoney` en público: `components/catalog/money.ts` y
   `cover-amount.tsx`.** ESLint sigue vedando el resto (ADR-040).
6. **En la ficha, cuatro canales en radios.** Traer el mismo bien (default),
   transferencia, Mercado Pago, PayPal. Los datos de un medio —CBU, link,
   extra de Mercado Pago— se muestran **sólo** cuando ese canal está elegido.
   Sin JavaScript lo hace `:has()` sobre el radio. Enmenda ADR-046: el
   formulario de reserva aparece **sólo** en traer el bien, con nombre,
   teléfono optativo y dirección de retiro. Cubrir con plata no reserva.
7. **El aviso al equipo es el de siempre.** Quien completa «Quiero donar»
   **a traer** reserva, y `notifyPledgeClaimed` manda `staff.new_pledge` a
   `EMAIL_STAFF_ADDRESS` (el buzón del owner). Un click en el listado no
   manda correo: todavía no hay compromiso. Un fallo de correo no deshace la
   reserva (FR-233). Transferir no manda ese correo: no hay reserva.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir apilando en mobile para no desbordar | El pedido es ver una tabla. El desborde se corta con scroll interno |
| Primaria «Quiero donar» en cada fila | ADR-032: una primaria por pantalla, y ya está tomada |
| Inventar 86 precios de Mercado Libre sin fuente | Constitución VIII. Sin fuente, nulo |
| Scraping en cada request | Un número que cambia sin rastro. El seed es el rastro |
| Mostrar todos los medios y que «se entiendan» | Es exactamente la confusión que hay que sacar |
| Mail al owner en el click del listado | Cada ojeada al catálogo sería un correo. El hecho es la reserva |

## Consecuencias

**Buenas.** En el teléfono se escanea lo que falta, cuánto sale de estimado y
se empieza a donar sin adivinar el flujo. En la ficha, transferir no mezcla
Mercado Pago. El owner se entera cuando alguien se anota de verdad.

**Malas y aceptadas.**

- Una tabla ancha en 360 px se desplaza de costado. Es una tabla, no una
  tarjeta. La miniatura en Qué hace la fila más alta; se queda adentro de
  `max-w-quote` para no recortar estimado ni donar en 1440.
- Los estimados se vencen. Se actualizan en el SQL y en la nota de research,
  no en un comentario.
- Un valor fiscal de Formosa no es el ticket del corralón. La etiqueta de
  estimado cubre esa distancia; no la niega.
- `formatMoney` ahora tiene dos archivos públicos. La compuerta sigue siendo
  la lista de ESLint, no la confianza.
