# ADR-031 · Una donación en especie no entra en el libro

**Estado**: Aceptada · **Fecha**: 2026-09-13 · Enmendada por [ADR-041](./041-estimado-publico-y-cubrir-con-plata.md): el estimado se publica en la ficha, etiquetado. Sigue sin entrar al libro. Enmendada por [ADR-052](./052-porcentaje-de-ese-item.md): en público, quien trajo se nombra en partes de **ese** ítem, no en plata.

## Contexto

El catálogo introduce una segunda forma de ayudar: en lugar de transferir plata, alguien compra las
chapas y las lleva. Los ítems pueden tener un valor estimado, porque la familia necesita saber si lo
que falta son doscientos mil pesos de cemento o dos millones de techo para priorizar.

Ese valor estimado es una tentación inmediata: si el techo vale un millón y alguien lo donó, parece
que la campaña avanzó un millón, y sería lindo que la barra de progreso lo mostrara.

Sería lindo y sería falso, y el sitio tiene una regla escrita sobre eso: **ningún dato inventado llega
a la interfaz** (constitución, principio VIII). Un valor estimado no es un monto recibido. Nadie lo
conciló con un banco, no hay comprobante, y su número salió de una cotización que alguien miró un
martes.

Hay además una propiedad del sitio que ya está probada automáticamente y que esto rompería:
**SC-007, la suma del detalle de transparencia coincide exactamente con los totales publicados.**
`campaign_totals` suma aportes conciliados y gastos registrados. Meterle un valor estimado la vuelve
una vista que no cierra contra ningún registro verificable.

## Decisión

**`donation_pledges` no alimenta `campaign_totals` ni ninguna cifra de dinero.** Ni el valor
estimado, ni una conversión, ni un renglón aparte dentro del total. El libro sigue siendo lo que era:
plata que entró y plata que salió.

El valor estimado del ítem vive en el esquema como `estimated_unit_amount_minor` + `currency`,
**nullable las dos juntas**, con `check ((estimated_unit_amount_minor is null) = (currency is null))`,
y su uso interno sigue: ordenar el catálogo por lo que más pesa. La ficha del ítem **sí** lo
publica, siempre como estimado y no como precio fijo (ADR-041). El listado y el libro no.

Las donaciones en especie se cuentan **en unidades y en cosas**: "de las 40 chapas, 30 ya están".
Esa es una frase verificable, la puede confirmar cualquiera que mire el techo, y no necesita que nadie
se ponga de acuerdo en un precio. En el muro y en la columna de nombre del catálogo, esa parte se
publica como porcentaje de **ese** ítem (5 de 10 es el 50% de esas chapas), no como monto (ADR-052).

Si alguien prefiere transferir el monto para que la familia compre, eso **es un aporte** y sigue el
camino que ya existe (ADR-006): entra al libro, se concilia y aparece en el total. Las dos formas de
ayudar conviven sin mezclarse, y la diferencia entre ellas es exactamente la diferencia entre plata
y cosas.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Sumar el valor estimado al total recaudado | Publica como recaudado algo que nadie recibió en una cuenta. Es el tipo de cifra que hace que después nadie crea ninguna otra |
| Un segundo total, "recibido en especie", en la misma barra de progreso | Dos monedas que no son monedas en el mismo gráfico. Y sigue siendo un número estimado presentado al lado de números conciliados |
| Crear un aporte por cada donación en especie, con un método de pago "especie" | Contamina el libro con filas sin comprobante ni conciliación bancaria posible, y rompe el significado de `reconciled_at` |
| Publicar el valor estimado en la tarjeta de cada ítem | Es un precio que alguien va a comparar con el del negocio de la esquina; cuando no coincida, el que queda mal es el sitio. Reevaluable (D3) |
| No guardar ningún valor estimado | La familia se queda sin forma de priorizar. El dato es útil adentro; lo que no corresponde es publicarlo |
| Convertir todo a una moneda con un tipo de cambio | Ya está prohibido para los aportes reales sin tipo de cambio explícito y fechado. Para valores estimados sería inventar dos veces |

## Consecuencias

**Buenas.** SC-007 sigue siendo cierto y sigue estando probado sin tocar nada: `campaign_totals` no
conoce las nuevas tablas. La transparencia mantiene una propiedad simple de explicar —"todo peso que
aparece acá entró a una cuenta"— y el catálogo gana otra igual de simple: "todo lo que aparece acá se
cuenta en cosas". Y hay una prueba nueva que lo fija: registrar una donación en especie **no cambia
ningún total**.

**Malas y aceptadas.**

- **La ayuda total del proyecto no tiene un número.** No se puede decir "se juntó el equivalente a
  tanto", porque la mitad está en pesos conciliados y la otra mitad en chapas. Es incómodo para
  comunicar y es la consecuencia de no inventar el número.
- El avance de la obra se mide por dos caminos distintos —hitos y porcentaje del presupuesto por un
  lado, unidades del catálogo por el otro— y pueden dar impresiones distintas al mismo tiempo. Se
  mitiga con `budget_item_id` en el ítem, que al menos los hace hablar del mismo rubro.
- Un estimado publicado en la ficha se va a comparar con el mostrador. La etiqueta
  de ADR-041 no evita la comparación; evita que el sitio afirme que coinciden.
