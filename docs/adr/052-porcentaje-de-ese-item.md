# ADR-052 · El porcentaje en especie es de ese ítem, y Donar queda hasta el 100%

**Estado**: Aceptada · **Fecha**: 2026-09-17

Enmienda a [ADR-044](./044-tabla-del-catalogo-y-quiero-donar.md) (el CTA sigue
mientras falte algo), a [ADR-031](./031-donacion-en-especie-no-es-plata.md) (en
público, una persona se nombra en partes de **ese** bien) y a
[FR-209](../../specs/002-cuentas-y-catalogo-de-donaciones/spec.md) /
[FR-210](../../specs/002-cuentas-y-catalogo-de-donaciones/spec.md) /
[FR-226](../../specs/002-cuentas-y-catalogo-de-donaciones/spec.md) / FR-263.
No enmienda [ADR-042](./042-muro-de-aportes-con-porcentaje.md): ese porcentaje
es de plata sobre lo ya recibido.

## Contexto

El catálogo ya sabe que un ítem de 10 unidades con 5 entregadas **sigue
faltando**. `remaining` descuenta lo reservado y lo entregado, `canClaim` es
verdadero mientras queda algo, y la tabla esconde «Quiero donar» sólo cuando
está cubierto. Lo que no decía es cómo se nombra a quien trajo esas 5.

Hasta acá el listado ponía un sí/no y un nombre, y el muro «5 · Ladrillos».
Quien mira no ve qué parte de **ese** material cubrió esa persona. El pedido
es otro: si de 10 se donan 5, aparece que fulano donó el 50% de ese bien, y
el botón de donar sigue hasta el 100%.

Mezclar esto con el % de un aporte en plata sería inventar una conversión.
ADR-042 habla de `received_minor` en una moneda. Un ladrillo no es un peso.
El 100% conocido de un ítem es `needed_quantity` de ese ítem.

## Decisión

**El porcentaje de una donación en especie es la parte de ese ítem. Donar se
ofrece hasta que no queda nada.**

1. **Denominador: `needed_quantity` de ese ítem.** No el total de plata, no
   lo que ya llegó de otros ítems, no lo que todavía falta. Cinco de diez es
   50% de *ese* material, aunque el resto de la casa esté a otro ritmo.
2. **Numerador: las unidades públicas de esa persona.** En el catálogo, la
   suma de sus reservas y entregas con nombre. En el muro, la cantidad de
   esa entrega. Lo anónimo no se nombra (FR-255): mueve cantidades, no %.
3. **Entero truncado, como la plata.** `(unidades * 100) / needed`. Un
   truncado menor a 1 no se publica como 0%. Un valor que se pasa de 100 se
   acota. Lo calcula el dominio sobre cantidades que ya son públicas: no hay
   columna nueva ni `grant` nuevo. La cantidad en unidades sigue existiendo
   en la vista. La interfaz del **catálogo** habla en unidades cuando el bien
   es contable (`unidad`, `bolsa`, `juego`) y en % cuando es una medida. El
   muro sigue en %.
4. **«Quiero donar» mientras `remaining > 0`.** Que alguien ya haya tomado
   parte no esconde el CTA. Cubierto (`remaining = 0`) sí: no hay qué pedir.
   El sí/no de «¿la tomó alguien?» no gobierna el botón.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Esconder Donar cuando `taken` es verdadero | Una toma parcial dejaría el resto sin camino. El pedido es hasta el 100% |
| Seguir publicando «5 · Ladrillos» | No dice qué parte de ese bien cubrió esa persona |
| Usar lo recibido en plata como 100% | Inventa un tipo de cambio (ADR-031, ADR-042) |
| Calcular el % en SQL como `contribution_wall` | Acá la cantidad ya es pública. La frontera de ADR-042 existe porque el monto no lo es |
| Publicar 0% cuando el truncado da cero | Cifra falsa, la misma regla que ADR-042 |

## Consecuencias

**Buenas.** En el listado y en Quiénes ayudaron se lee de un vistazo quién
cubrió qué parte de un material, y el resto se puede donar. El 100% de un
ítem es un hecho sobre la obra, no una cotización.

**Malas y aceptadas.**

- Un ítem de una sola unidad no tiene donación parcial: 1 de 1 es 100% y
  Donar se va. Es correcto.
- Un aporte chico sobre un ítem grande no muestra porcentaje. El nombre, si
  eligió aparecer, sí.
- Si el ítem dejó de estar publicado, el muro puede no conocer
  `needed_quantity` y omite el % en lugar de inventarlo.

## Enmienda · Unidades en el catálogo (2026-09-20)

La interfaz del **catálogo** ya no habla sólo en %. Contable = unidades;
medida = %. El muro sigue en % (ADR-042).
