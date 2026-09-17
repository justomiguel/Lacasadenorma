# ADR-051 · Dos puertas para traer un bien: el mail abre cuenta, el teléfono reserva

**Estado**: Aceptada · **Fecha**: 2026-09-16

Enmienda a [ADR-046](./046-compromiso-con-datos-de-retiro.md) (el primer paso ya
no pide dirección), a [ADR-044](./044-tabla-del-catalogo-y-quiero-donar.md) (el
CTA de traer no manda de entrada a crear una cuenta) y a
[ADR-033](./033-aprobacion-de-cuentas.md) (un aviso más al equipo). Cubre
FR-259…FR-262. El HTML público de la ficha sigue siendo el mismo con o sin
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
   sesión ve **después de hidratar** un botón: no se pide nombre, teléfono ni
   dirección. La cuenta ya dice quién es. Un clic reserva y manda
   `staff.new_pledge`.
2. **El correo abre el sistema.** Un POST con mail y sin sesión redirige a
   `/cuenta/crear` con la vuelta a esa ficha. El mail no viaja en la URL: va
   en una cookie httpOnly de diez minutos, y el alta lo precarga. En esa
   pantalla, si se viene de donar, el texto explica por qué hace falta la
   cuenta: confirmar el correo, ver y cancelar lo anotado. Confirmar el
   correo sigue siendo la validación (ADR-046): `pending` reserva, `declined`
   no. Al volver a la ficha, con sesión, un clic reserva. No se pide
   dirección, ni «nombre para mostrar», ni nota para la familia: quién se
   maneja con el sistema lo elige después en `/cuenta`. El owner recibe
   `staff.new_account` al nacer el perfil y `staff.new_pledge` al anotarse.
3. **El teléfono reserva a nombre de esa persona.** Un POST con teléfono y
   sin mail no crea cuenta. Persiste el aviso en `donation_offers` y crea una
   reserva en `donation_pledges` (`user_id` nulo, anónima: el nombre de
   contacto es para quien coordina, no para el muro) que mueve
   `reserved_quantity`. El plazo de catorce días sigue siendo la red de
   seguridad. Un mismo teléfono no deja dos reservas del mismo ítem: el
   segundo es el mismo aviso. El spam ya no es «un correo y una fila»: es un
   hueco en el catálogo, y el owner lo suelta con un clic. Un fallo de
   correo no borra la reserva (FR-233).
4. **El owner decide por dos enlaces en el mismo correo.** `staff.phone_offer`
   y `staff.new_pledge` llevan dos destinos que piden sesión con
   `donaciones.escribir`, no un token en el mail (FR-237):

   - `/admin/donaciones/decidir/{id}/si` — «me contacté y donan». Cumple la
     reserva (`fulfill_donation_pledge`). En el camino del teléfono, esa
     pantalla es la segunda: si la persona aceptó aparecer, se carga el
     nombre para mostrar y, si quiere, una nota privada. Sin ese nombre, el
     sí cuenta la donación y no la publica. En el camino del mail no se
     piden: se eligen en `/cuenta`.
   - `/admin/donaciones/decidir/{id}/no` — no se concreta. Cancela la reserva
     y devuelve las unidades.

   Los enlaces no mutan en el GET: piden una confirmación con sesión. El
   nombre va en `staff.phone_offer`: «tal persona quiere donar» es el pedido,
   no el renglón del muro. El número viaja **como botón de WhatsApp**
   (`https://wa.me/` con código de país, sin `+`): es el acceso directo para
   escribirle. No es un enlace que autentique. El logo de WhatsApp no entra
   al HTML del correo —no hay imágenes remotas (ADR-010)—; el texto del
   botón nombra la marca y el número. El número también se lee en
   `/admin/donaciones`.
5. **Quien dejó el teléfono ve un gracias en la ficha, no un diálogo.** El
   POST redirige a `?reservado=1#gracias`. Ahí hay un aviso `role="status"`
   que dice «Gracias por donar» y que nos vamos a estar comunicando. No es
   un `alert()`, ni un modal: es el estado diseñado de esa pantalla
   (ADR-032). El formulario se desmonta si ya no queda cupo; por eso el
   aviso vive en la ficha, igual que `?conflicto=1`.
6. **Si llenan los dos, gana el mail.** Eligieron el sistema. El teléfono no
   se pide de nuevo al volver con sesión: el correo de la cuenta alcanza.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Seguir pidiendo dirección y cuenta en el primer paso | Es exactamente el roce: quien deja un teléfono no quiere una casilla, y quien sí la quiere no ve por qué |
| Avisar por teléfono sin reservar | El ítem sigue en la lista y otra persona se lo anota mientras el owner llama. El pedido es sostenerlo a nombre de quien dejó el teléfono |
| Reservar con el teléfono y cumplirla sin el owner | Vuelve el problema que ADR-046 pagó: cualquiera sostiene el catálogo. El dueño confirma, o suelta |
| Un token de capacidad en el correo que cumple o cancela sin sesión | FR-237. El enlace pide la sesión de quien administra |
| Sólo mandar el correo, sin persistir | Si Resend falla, el owner no tiene a quién llamar. El hecho vive en la base; el correo avisa |
| Poner el teléfono en el cuerpo, sin enlace | El pedido del 17 de septiembre de 2026 es escribirle ya: el número va en un botón `wa.me`, no como un renglón para copiar. El resto de los avisos al equipo sigue sin datos de terceros |
| Pedir dirección al donar, con o sin sesión | El pedido del 17 de septiembre de 2026 es nombre y un canal. La coordinación es por teléfono, WhatsApp o el correo de la cuenta, no un domicilio en el formulario |
| Pedir de nuevo el nombre a quien ya tiene sesión | La cuenta ya dice quién es. Un clic reserva y avisa al owner (`staff.new_pledge`) |
| Personalizar la ficha según haya sesión | Rompe ADR-037 y el caché. El botón aparece al hidratar, como el chrome |
| Pedir los dos, mail y teléfono | El mínimo es uno. El mail abre el sistema; el teléfono, la llamada y la reserva |
| Pedir «nombre para mostrar» y nota en la ficha | El primer clic es nombre y un canal. Aparecer se decide después: en `/cuenta` si hay mail, en el sí del owner si hay teléfono |
| Publicar el nombre de contacto del teléfono al confirmar | Ese nombre es para llamarlos. El del muro es el que aceptaron poner, en la pantalla del sí |

## Consecuencias

**Buenas.** El primer clic pide poco. Quien no quiere cuenta deja un teléfono
y el ítem queda a su nombre hasta que el owner confirma o suelta. Quien sí,
entiende en la pantalla de alta para qué sirve, confirma el correo y, al
volver a la ficha, con un clic se anota. Un sí con nombre aceptado aparece
en el muro con fecha.

**Malas y aceptadas.**

- Un teléfono sostiene el catálogo. El dueño tiene que decidir. El plazo de
  catorce días suelta lo que nadie confirmó.
- El sí del teléfono pide un dato más si aceptaron aparecer. Es un paso del
  owner, no de quien dejó el número: esa persona no tiene cuenta.
- Sin JavaScript, quien ya tiene sesión ve el formulario corto (nombre y
  canal). Si pone mail, el alta lo manda a `/cuenta`; al volver, con
  JavaScript, un clic reserva. Con JavaScript ve el botón al hidratar.
- El nombre y el teléfono de quien avisó viajan en el correo al owner. Es
  una excepción deliberada a «los avisos al equipo no llevan datos de
  terceros», acotada a `staff.phone_offer`: el nombre, y el número como
  botón de WhatsApp. El resto de los avisos no los lleva.
