# ADR-051 · Dos puertas para traer un bien: el mail abre cuenta, el teléfono reserva

**Estado**: Aceptada · **Fecha**: 2026-09-16

Enmienda a [ADR-046](./046-compromiso-con-datos-de-retiro.md) (el primer paso ya
no pide dirección), a [ADR-044](./044-tabla-del-catalogo-y-quiero-donar.md) (el
CTA de traer no manda de entrada a crear una cuenta) y a
[ADR-033](./033-aprobacion-de-cuentas.md) (un aviso más al equipo). Cubre
FR-259…FR-261. El HTML público de la ficha sigue siendo el mismo con o sin
sesión ([ADR-037](./037-chrome-de-cuenta.md)).

## Contexto

«Quiero donar» en traer el mismo bien pedía de entrada nombre, dirección y
cuenta. Quien sólo quería dejar un teléfono para que lo llamen tenía que
crearse una casilla. Quien sí quería manejarlo por el sitio no veía, en la
pantalla de alta, por qué hacía falta esa cuenta.

El pedido del 16 de septiembre de 2026 parte el primer paso en dos datos, y
el segundo en dos caminos:

- Nombre, y **teléfono o mail**. Nada más.
- Si pone el mail: crear una cuenta, y en esa pantalla explicar por qué.
- Si pone el teléfono: avisarle al owner que esa persona quiere donar ese
  artículo. Sin cuenta. El ítem queda reservado a su nombre hasta que el
  owner, desde el mismo correo, confirme que se contactó y van a donar, o
  suelte la reserva.
- Un ítem confirmado por sí aparece en el muro como donado por esa persona,
  con la fecha de la confirmación.
- Si crea la cuenta: se asume que se maneja con el sistema. Confirmar el
  correo (validar), pedir después dirección y el resto, y avisarle también al
  owner, con los mismos dos enlaces.

## Decisión

1. **El HTML público de la ficha pide nombre y (teléfono o correo).** Ni
   dirección, ni cantidad, ni «aparecer». Cubrir con plata no cambia. El HTML
   servido es el de alguien sin sesión (ADR-037, SC-213). Quien ya tiene
   sesión ve el formulario de retiro **después de hidratar**, igual que el
   chrome muestra Backoffice: el documento inicial no se personaliza.
2. **El correo abre el sistema.** Un POST con mail y sin sesión redirige a
   `/cuenta/crear` con la vuelta a esa ficha. El mail no viaja en la URL: va
   en una cookie httpOnly de diez minutos, y el alta lo precarga. En esa
   pantalla, si se viene de donar, el texto explica por qué hace falta la
   cuenta: confirmar el correo, dejar después dónde ir a buscar, ver y
   cancelar lo anotado. Confirmar el correo sigue siendo la validación
   (ADR-046): `pending` reserva, `declined` no. Al volver a la ficha, con
   sesión, se pide la dirección y se reserva. El owner recibe
   `staff.new_account` al nacer el perfil y `staff.new_pledge` al anotarse.
3. **El teléfono reserva a nombre de esa persona.** Un POST con teléfono y
   sin mail no crea cuenta. Persiste el aviso en `donation_offers` y crea una
   reserva en `donation_pledges` (`user_id` nulo, `is_anonymous` falso,
   `donor_display_name` = el nombre que dejaron) que mueve
   `reserved_quantity`. El plazo de catorce días sigue siendo la red de
   seguridad. Un mismo teléfono no deja dos reservas del mismo ítem: el
   segundo es el mismo aviso. El spam ya no es «un correo y una fila»: es un
   hueco en el catálogo, y el owner lo suelta con un clic. Un fallo de
   correo no borra la reserva (FR-233).
4. **El owner decide por dos enlaces en el mismo correo.** `staff.phone_offer`
   y `staff.new_pledge` llevan dos destinos que piden sesión con
   `donaciones.escribir`, no un token en el mail (FR-237):

   - `/admin/donaciones/decidir/{id}/si` — «me contacté y donan». Cumple la
     reserva (`fulfill_donation_pledge`). El muro publica el nombre y la
     fecha (`fulfilled_at`).
   - `/admin/donaciones/decidir/{id}/no` — no se concreta. Cancela la reserva
     y devuelve las unidades.

   Los enlaces no mutan en el GET: piden una confirmación con sesión. El
   número de teléfono no viaja en el correo; se lee en `/admin/donaciones`.
   El nombre sí va en `staff.phone_offer`: «tal persona quiere donar» es el
   pedido. Dejar el nombre en este camino **es** elegir aparecer: no hay un
   casillero aparte porque el formulario es nombre y teléfono.
5. **Si llenan los dos, gana el mail.** Eligieron el sistema. El teléfono
   queda para más adelante, en el formulario de retiro, si lo quieren dejar.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir pidiendo dirección y cuenta en el primer paso | Es exactamente el roce: quien deja un teléfono no quiere una casilla, y quien sí la quiere no ve por qué |
| Avisar por teléfono sin reservar | El ítem sigue en la lista y otra persona se lo anota mientras el owner llama. El pedido es sostenerlo a nombre de quien dejó el teléfono |
| Reservar con el teléfono y cumplirla sin el owner | Vuelve el problema que ADR-046 pagó: cualquiera sostiene el catálogo. El dueño confirma, o suelta |
| Un token de capacidad en el correo que cumple o cancela sin sesión | FR-237. El enlace pide la sesión de quien administra |
| Sólo mandar el correo, sin persistir | Si Resend falla, el owner no tiene a quién llamar. El hecho vive en la base; el correo avisa |
| Poner el teléfono en el cuerpo del correo | El resto de los avisos al equipo no llevan datos de terceros. El número se lee en el backoffice. El nombre sí va: «tal persona quiere donar» es el pedido |
| Personalizar la ficha según haya sesión | Rompe ADR-037 y el caché. El formulario de retiro aparece al hidratar, como el chrome |
| Pedir los dos, mail y teléfono | El mínimo es uno. El mail abre el sistema; el teléfono, la llamada y la reserva |

## Consecuencias

**Buenas.** El primer clic pide poco. Quien no quiere cuenta deja un teléfono
y el ítem queda a su nombre hasta que el owner confirma o suelta. Quien sí,
entiende en la pantalla de alta para qué sirve, confirma el correo, deja la
dirección y se anota. Un sí aparece en el muro con nombre y fecha.

**Malas y aceptadas.**

- Un teléfono sostiene el catálogo. El dueño tiene que decidir. El plazo de
  catorce días suelta lo que nadie confirmó.
- Dejar el nombre en el camino del teléfono es aparecer. No hay un segundo
  paso para ocultarse: el formulario es corto a propósito.
- Sin JavaScript, quien ya tiene sesión ve el formulario corto. Si pone
  mail, el alta lo manda a `/cuenta` a completar el retiro. Con JavaScript
  ve el de siempre, en la ficha, al hidratar.
- El nombre de quien avisó viaja en el correo al owner. Es una excepción
  deliberada a «los avisos al equipo no llevan datos de terceros», acotada a
  `staff.phone_offer` y al nombre, no al teléfono.
