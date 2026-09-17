# ADR-046 · El compromiso pide datos de retiro, no una cuenta como prueba

**Estado**: Aceptada · **Fecha**: 2026-09-15 · Enmendada por [ADR-051](./051-dos-puertas-para-traer.md): el primer paso ya no pide dirección; con sesión no se pide nombre ni dirección, sólo se avisa al owner.

Enmienda a [ADR-033](./033-aprobacion-de-cuentas.md) (confirmar el correo
alcanza para anotarse a traer), a [ADR-041](./041-estimado-publico-y-cubrir-con-plata.md)
(cubrir con plata ya no reserva desde el formulario público), a
[ADR-044](./044-tabla-del-catalogo-y-quiero-donar.md) (el CTA de la ficha
explica los dos casos) y a la asunción de la spec 002 de que el sitio no
guarda direcciones.

## Contexto

«Quiero donar» abre la ficha y, sin sesión, manda a crear una cuenta, confirmar
el correo y esperar a que el equipo habilite. Eso se lee como si la cuenta
fuera la prueba de que la ayuda es real. No lo es: una cuenta `pending` no le
dice al equipo dónde ir a buscar una bolsa de cemento, y una transferencia
ya identifica a quien pagó.

El pedido del 15 de septiembre de 2026 es el dato mínimo operativo:

- Si es un bien físico: nombre, mail o teléfono, y la dirección donde ir a
  buscar.
- Si es transferencia, PayPal o Mercado Pago: sólo el nombre, y sólo si la
  transacción se hace.

La spec 002 asumía que la entrega se coordinaba fuera del sitio y que no se
guardaban direcciones. Eso deja al equipo sin el dato que necesita para ir.

## Decisión

1. **La cuenta no verifica la donación.** Existe para ver y cancelar lo
   anotado, y para tener un correo confirmado al que escribir. Confirmar el
   mail dice que esa dirección es de esa persona, no que el material va a
   llegar. El HTML público de la ficha lo dice antes de pedir la cuenta
   (ADR-037: el HTML sigue siendo el mismo con o sin sesión).
2. **Traer el mismo bien reserva, y pide datos de retiro.** Nombre de
   contacto, correo o teléfono, y dirección de retiro. El correo de la cuenta
   satisface «mail o teléfono»; el teléfono es para que el equipo pueda
   llamar. La dirección es obligatoria. Nombre y dirección son `required` en
   el HTML: si falta un dato, el envío no sale, el primer campo inválido
   entra en vista, recibe el foco y el borde pasa a danger. Nada de eso se
   publica. Vive en `donation_pledges` (`contact_name`, `contact_phone`,
   `pickup_address`), no en `donor_profiles`. `anon` no puede nombrar esas
   columnas.
3. **Confirmar el correo alcanza para anotarse a traer.** `pending` y
   `approved` reservan. `declined` no. ADR-033 sigue: la cuenta nace
   `pending`, el equipo puede rechazarla para frenar a alguien, y el correo
   `staff.new_account` avisa. Lo que ya no hace es dejar a la persona esperando
   una habilitación antes de dejar la dirección.
4. **Cubrir con plata no reserva desde el sitio.** Transferencia, Mercado
   Pago y PayPal muestran los datos de pago y nada más: no hay cuenta, no hay
   formulario, no hay `claim_donation_item`. La transacción es la prueba. El
   nombre, si la persona quiere aparecer, se pide cuando el equipo anota lo
   que llegó (ADR-006, ADR-042). El estimado no entra al libro (ADR-031).
5. **Al borrar la cuenta se van nombre, teléfono y dirección de retiro.**
   Es el mismo FR-240: lo que llegó se conserva como hecho sobre la obra,
   sin dato personal.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir pidiendo cuenta + habilitación como prueba de que la ayuda es real | Es exactamente la confusión: el equipo no puede ir a buscar, y quien transfiere ya quedó identificado por el banco |
| Un formulario público sin cuenta, con dirección | Sin captcha ni correo confirmado cualquiera sostiene el catálogo. El correo confirmado es la defensa que ya está (spec 002, riesgo aceptado) |
| Reservar también al cubrir con plata, pidiendo sólo un nombre | Inventa un compromiso anterior a la transacción. El pedido es el nombre *si* la transacción se hace |
| Guardar el teléfono y la dirección en `donor_profiles` | Son del compromiso, no de la persona para siempre. Un segundo lugar del que hay que acordarse de borrar |
| Pedir mail y teléfono siempre | El mínimo es uno de los dos. El mail de la cuenta ya está |

## Consecuencias

**Buenas.** Quien toca «Quiero donar» entiende los dos caminos. El equipo
recibe una reserva con dónde ir. Quien transfiere no crea una cuenta para
demostrar que pagó.

**Malas y aceptadas.**

- Cubrir un ítem con plata no baja el contador del catálogo hasta que el
  equipo lo actualice (baja `needed_quantity` o confirma una llegada por el
  camino de siempre). Dos transferencias por la misma chapa son más plata
  para la obra, no una sobreventa de un objeto.
- Hay un tiempo en el que una cuenta `pending` ya sostuvo un ítem. Si el
  equipo la rechaza después, las reservas activas se cancelan a mano, con
  motivo. No se inventa un disparo automático: sería borrar sin que lo pida.
- El sitio ahora guarda un domicilio. La política pública lo nombra en el
  mismo commit. No se publica.
