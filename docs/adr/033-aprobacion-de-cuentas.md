# ADR-033 · Una cuenta del público no reserva nada hasta que el equipo la habilita

**Estado**: Aceptada · **Fecha**: 2026-09-13 · Enmendada por [ADR-046](./046-compromiso-con-datos-de-retiro.md): confirmar el correo alcanza para anotarse a traer un bien. `declined` sigue sin reservar. Enmendada por [ADR-051](./051-dos-puertas-para-traer.md): el teléfono reserva sin cuenta; el owner confirma o suelta desde el correo.

## Contexto

Abrir el registro (ADR-027) resolvió *quién puede entrar*. No resolvió *quién puede
comprometer material*. Con la confirmación de correo, cualquiera con una dirección
válida obtiene sesión y, en la fase D, podría reservar el último ejemplar de un ítem.

Para esta campaña eso es demasiado pronto. Quien administra quiere ver el pedido,
decidir, y que la persona se entere por correo. No es un captcha ni un rol interno:
es una habilitación, hecha a mano, de una cuenta que ya demostró que el correo es
suyo.

Los correos que salen de este flujo son los primeros que una persona desconoce recibe
de este dominio. Si se ven como un aviso genérico de un SaaS, se marcan como
promoción o como phishing, y el dominio entero paga el costo. Por eso las plantillas
van vestidas con la dirección visual del sitio (ADR-025), no con un párrafo suelto.

## Decisión

**Toda cuenta del público nace `pending`.** Confirmar el correo crea el perfil y no
habilita la reserva. Habilitarla es una operación de `admin` o `owner` en
`/admin/donantes`, deja rastro, y manda un correo.

Estados, y ninguno más:

| Estado | Qué puede hacer la persona | Qué hace el equipo |
|---|---|---|
| `pending` | Entrar a `/cuenta`, elegir nombre y anonimato, anotarse a traer un bien con datos de retiro (ADR-046) | Habilitar o rechazar |
| `approved` | Reservar, cancelar lo propio | Coordinar la entrega |
| `declined` | Entrar a `/cuenta`, irse. No reservar | Reconsiderarlo: de `declined` se puede pasar a `approved` |

No hay vuelta de `approved` a `pending`. Si hay que frenar a alguien que ya reservó,
se cancelan las reservas con motivo (fase D), no se le saca la habilitación por
debajo.

**La columna no la escribe quien se registra.** El `insert` exige `pending`. El
`update` de la persona no incluye `approval_status`: es privilegio de columna, no
una policy que se pueda olvidar. La única vía de cambio es
`public.review_donor_account()`, `security definer`, acotada a `has_min_role('admin')`.

**Los correos de este flujo, y los que le siguen.** Se manda correo cuando alguien
tiene que enterarse o tiene que hacer algo. No se manda correo para confirmar que
un dato se guardó.

| Disparador | A quién | Clase | Tiene que actuar |
|---|---|---|---|
| Perfil creado, correo ya confirmado | La persona | `account.received` | Esperar |
| Ídem | El equipo | `staff.new_account` | **Sí: revisar en `/admin/donantes`** |
| Habilitación | La persona | `account.approved` | Ya puede reservar |
| Rechazo | La persona | `account.declined` | Irse, o responder el correo |
| Reserva hecha | La persona | `pledge.confirmed` | Traer lo anotado |
| Ídem | El equipo | `staff.new_pledge` | **Sí: coordinar la entrega** |
| Tres días antes del vencimiento | La persona | `pledge.reminder` | Traer o cancelar |
| La persona cancela | El equipo | `staff.pledge_cancelled` | **Sí: dejar de esperar eso** |
| Venció sin entregar | El equipo | `staff.pledge_expired` | El ítem volvió a la lista |
| Llegó el material | La persona | `pledge.fulfilled` | Nada: es el cierre |

Lo que **no** manda correo, y el motivo:

- Cambiar el nombre o el anonimato: es la misma persona hablándose a sí misma.
- Recuperar la contraseña, confirmar la cuenta, cambiar de dirección: el token lo emite Auth;
  el correo lo manda Resend por la API (ADR-028).
- Un envío que falló: queda en `email_deliveries` y se lee en el backoffice. Mandar
  un correo para decir que no se pudo mandar un correo es el agujero.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Habilitación automática al confirmar el correo | Es lo que ya hacía la fase A. El pedido nuevo es precisamente que el equipo vea a quién le está abriendo el catálogo |
| Que `editor` habilite | `editor` administra el catálogo —qué falta, con qué foto— y no ve datos personales (ADR-027). Habilitar una cuenta es ver un correo y decidir sobre una persona |
| Un rol nuevo `revisor` | Para entre dos y cinco personas es un estado más que mantener. `admin` ya confirma llegadas |
| Lista de espera sin correo al equipo | El pedido se pudre en `/admin` hasta que alguien entre. El correo es el que convierte "hay que mirar" en "llegó algo" |
| Rechazar sin correo a la persona | Quedaría una sesión que no puede reservar y nadie le explicó por qué. Peor que un no |

## Consecuencias

**Buenas.** El catálogo no se juega con cuentas recién creadas. El equipo tiene un
lugar y un correo para la decisión. La persona tiene un estado diseñado en `/cuenta`
—pendiente, habilitada, rechazada— en lugar de un error al reservar.

**Malas y aceptadas.**

- Confirmar el correo ya permite anotarse a traer. Si el equipo rechaza después,
  las reservas activas se cancelan a mano, con motivo (ADR-046). El tiempo muerto
  entre confirmar y habilitar ya no bloquea el catálogo.
- Un rechazo queda en la fila hasta que la persona borra la cuenta. No se borra
  solo: borrar sin que lo pida es exactamente lo que FR-208 le reserva a ella.
- Las plantillas HTML pesan más que un párrafo. Cada cliente de correo las va a
  pintar un poco distinto. Se acepta a cambio de que se reconozcan como de este
  sitio y no como de un proveedor.
