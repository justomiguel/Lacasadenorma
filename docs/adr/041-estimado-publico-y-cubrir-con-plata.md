# ADR-041 · El estimado se publica en la ficha, y se puede cubrir con plata

**Estado**: Aceptada · **Fecha**: 2026-09-15

Enmienda a ADR-031 (D3) y a ADR-040 en un solo lugar: la ficha de un ítem del
catálogo. El resto del sitio público sigue sin montos.

## Contexto

Quien quiere ayudar a veces no puede llevar el objeto: prefiere transferir para
que la familia lo compre. Para decidir necesita un número, y el número que hay
es un promedio de artículo **nuevo** de ese tipo. No es una cotización, no es
lo que va a pedir el corralón, y no entra al libro.

ADR-031 y ADR-040 cerraron esa puerta con razón: un `$` en público se lee como
precio, y un estimado en `campaign_totals` se lee como plata recibida. Las dos
cosas siguen prohibidas. Lo que cambia es **mostrar el estimado en la ficha**,
etiquetado, para poder cubrir el ítem por transferencia, Mercado Pago o PayPal.

Mercado Pago cobra. El recargo que se usa acá es el **10%**. Quien transfiere
directo no lo paga. En Mercado Pago el sugerido es el estimado más ese 10%, y
se puede **sumar más** —nunca menos—. PayPal no lleva ese recargo: el sugerido
es el neto. El sitio no convierte monedas.

Cubrir con plata reserva las mismas unidades que anotarse a traerlo. Cuando el
equipo confirma que el dinero llegó, el ítem queda cubierto a nombre de esa
persona si eligió aparecer. El estimado **no** se asienta como aporte: el
aporte entra al libro cuando se concilia, por el camino que ya existe (ADR-006).

## Decisión

1. **La ficha publica `estimated_unit_amount_minor` + `currency` cuando están
   cargados.** Siempre con la frase de que es un estimado, no un precio fijo.
   Si no hay estimado, se omite el número (FR-214): no se inventa.
2. **Tres canales de plata en la ficha**, con logo al lado del nombre:
   - Transferencia: el estimado neto, sin el 10%.
   - Mercado Pago: neto × 1,10 (entero, sin `float`) como sugerido, con campo
     para sumar más. El link es el publicado en `ayudar.json`; el sitio no cobra.
   - PayPal: el estimado neto. En PayPal cada quien elige el equivalente; acá
     no hay tipo de cambio.
3. **`cover_channel` en la reserva**: `bring` · `transfer` · `mercadopago` ·
   `paypal`. Default `bring`. No se publica. El backoffice lo ve para saber si
   esperar una caja o una transferencia.
4. **El libro no se toca.** Cumplir una reserva, aunque el canal sea plata, no
   escribe en `campaign_totals`. SC-007 y ADR-031 siguen valiendo.
5. **`formatMoney` en público sólo en `components/catalog/cover-amount.tsx`.**
   El resto del sitio público sigue vedado por ESLint (ADR-040).
6. **La capacidad `get_donation_catalog` cita el mismo estimado** que la ficha,
   etiquetado. Si la página no tiene número, el JSON tampoco (A5).

Los precios de referencia los carga el equipo en el backoffice. El SQL de
producción de la casa básica **no inventa** promedios de Mercado Libre.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir sin publicar el estimado | No se puede cubrir con plata sin un número, y el pedido es cubrirlo |
| Publicar el estimado como precio de lista, sin la etiqueta | Quien compare con el negocio de la esquina lee un error del sitio |
| Meter el estimado en `campaign_totals` al cumplir | Publica como recaudado una cotización. ADR-031 |
| Cobrar Mercado Pago desde el sitio (Checkout Preference) | El sitio no procesa pagos (ADR-006). El link publicado alcanza |
| Convertir el estimado a dólares para PayPal | Una conversión sin tipo de cambio fechado es inventar un monto |
| Dejar PayPal sólo en «resto del mundo» | Quien cubre un ítem tiene que poder elegir PayPal también desde Argentina o Chile |
| Inventar 86 promedios de Mercado Libre en el SQL | Constitución, principio VIII: sin dato verificado, el número se omite |

## Consecuencias

**Buenas.** Se puede cubrir un ítem con plata sin mentir el libro. El recargo
de Mercado Pago se ve antes de pagar. PayPal no queda escondido en otra pestaña
de país. El agente y la ficha dicen el mismo estimado.

**Malas y aceptadas.**

- Un estimado publicado se va a comparar con el precio real. La etiqueta no
  evita la comparación; evita que el sitio afirme que coinciden.
- El 10% es un número redondo, no la comisión exacta de cada cuenta de Mercado
  Pago. Si un día se sabe otra, se cambia acá y en el test, no en un comentario.
- Quien suma de más en Mercado Pago manda ese total a un link genérico: el
  sitio no prefija el monto en la URL. La persona lo escribe del otro lado.
- El catálogo público vuelve a tener un `$` en un rincón. La compuerta es el
  archivo único, no la confianza.
