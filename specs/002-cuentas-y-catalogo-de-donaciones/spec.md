# Feature Specification: Cuentas del público, catálogo de donaciones en especie y muro de quienes ayudaron

**Feature Branch**: `main` — se trabaja sobre `main`, directo, sin rama de feature
(constitución § Flujo de trabajo · Git).

**Created**: 2026-09-13

**Status**: Draft — tres decisiones de producto pendientes de la dueña del proyecto, listadas en
§ Decisiones pendientes. El resto está resuelto con el valor recomendado ya aplicado, de modo que la
especificación es implementable sin esperar.

**Input**: User description: "Quiero poder crear un sistema de login para autenticar usuarios, usar
resend para envio de mails en general, y un catálogo de donaciones. Para que la gente pueda ver qué
donar desde un catálogo y evitar donar dos veces algo. La gente puede pedir donar algo y se lo
asigna. Para eso debe crearse una cuenta, puede poner que la donación sea anónima si desea y sino su
donación aparecerá en una sección especial de la página."

**Numeración**: los requisitos de esta feature van de **FR-201** en adelante y los criterios de
**SC-201** en adelante. La feature 001 usa FR-001…FR-036 y SC-001…SC-013, y las dos se citan entre
sí: numerar corrido haría ambiguo cada "FR-012" escrito en un ADR.

---

## Por qué esto cambia algo que ya estaba decidido

Hasta hoy el sitio tiene **una sola audiencia con sesión**: entre dos y cinco personas de confianza
que administran la campaña. Toda la seguridad de la base está construida sobre esa premisa. Abrir el
registro al público la rompe: `authenticated` deja de significar "alguien de la familia" y pasa a
significar **cualquiera con un correo**.

Eso no es un detalle de implementación, es un cambio de modelo de amenazas, y es lo primero que hay
que resolver. Está en FR-201…FR-206 y en [ADR-027](../../docs/adr/027-identidad-publica.md).

La segunda cosa que cambia: hasta ahora el sitio **no guardaba ningún dato personal de quien visita**
(ADR-010, `/legales/privacidad`). A partir de esta feature guarda correo y, si la persona quiere,
nombre público. La política de privacidad publicada deja de ser cierta el día que esto se despliegue,
así que se actualiza en el mismo commit.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver qué falta y pedir donarlo sin que se done dos veces (Priority: P1)

Alguien quiere ayudar pero no con plata: quiere comprar las chapas del techo, o la puerta, o una
bolsa de cemento. Hoy el sitio sólo sabe recibir transferencias, así que esa persona escribe por
WhatsApp y pregunta qué falta. Le contestan cuando pueden, y a veces dos personas terminan comprando
lo mismo.

Con esta feature entra al catálogo, ve la lista de lo que falta con cuánto falta de cada cosa, elige
una, y queda asignada a su nombre. Lo que ya está tomado deja de ofrecerse.

**Why this priority**: es la razón del pedido, y es lo único de esta feature que resuelve un problema
que hoy le cuesta trabajo real a la familia. Si se implementa sólo esto, el catálogo ya sirve.

**Independent Test**: se prueba completo entrando a `/catalogo` con datos cargados, reservando un
ítem con una cuenta, y verificando que la cantidad disponible bajó y que reservar el último ejemplar
dos veces en paralelo falla una de las dos con un mensaje comprensible.

**Acceptance Scenarios**:

1. **Given** un catálogo con ítems publicados, **When** alguien lo abre sin sesión, **Then** ve una
   tabla por categoría: qué es, cuántos faltan de los que hacen falta, si alguien ya la tomó, y el
   nombre **sólo** si esa persona eligió aparecer. Una reserva anónima se ve como tomada, sin nombre.
2. **Given** un ítem cuya cantidad necesaria ya está cubierta entre lo reservado y lo entregado,
   **When** se renderiza el catálogo, **Then** ese ítem aparece marcado como cubierto y **no** ofrece
   la acción de reservar.
3. **Given** dos personas que intentan reservar el último ejemplar disponible **al mismo tiempo**,
   **When** las dos confirman, **Then** una lo obtiene y la otra recibe un mensaje que explica que
   alguien se adelantó y le ofrece el catálogo actualizado. En ningún caso quedan reservadas más
   unidades que las necesarias.
4. **Given** alguien con sesión que reserva dos de los cinco ejemplares que faltan, **When** guarda,
   **Then** el catálogo pasa a mostrar que faltan tres y su reserva queda visible en su propia
   cuenta.
5. **Given** una reserva que nadie entregó, **When** pasa el plazo de la reserva, **Then** el ítem
   vuelve a estar disponible y la persona se enteró antes de que eso pasara.
6. **Given** alguien sin sesión que toca «Quiero donar» en **traer el mismo bien**, **When** llega a la pantalla de cuenta,
   **Then** después de ingresar o registrarse y confirmar el correo vuelve a la ficha del mismo ítem y completa la reserva
   con nombre, un teléfono si lo hay y la dirección de retiro, sin buscarlo de nuevo. No espera a que el equipo habilite la cuenta.
7. **Given** un ítem publicado, **When** alguien abre su ficha, **Then** ve la foto o el espacio
   reservado, la descripción, las cantidades, quién se anotó con nombre si eligió aparecer, y
   cómo donarlo: traer el bien (formulario de retiro) o cubrirlo con plata (datos de pago, sin reserva).
8. **Given** alguien que elige transferencia, Mercado Pago o PayPal en la ficha, **When** mira esa opción,
   **Then** ve los datos de pago y **no** un formulario de reserva ni un pedido de cuenta. El nombre, si quiere aparecer,
   se pide cuando el equipo anota la transacción.
9. **Given** un ítem publicado con foto de referencia o subida, **When** alguien abre `/catalogo`,
   **Then** ve una miniatura de esa foto junto al título, en la misma celda Qué. **Given** un ítem
   sin ninguna de las dos, **When** abre el listado, **Then** no ve un hueco reservado en esa fila:
   el título alcanza.

---

### User Story 2 - Tener una cuenta, y decidir si mi nombre se ve (Priority: P1)

Para reservar hace falta una cuenta: sin eso no hay forma de decirle a nadie "esto es tuyo" ni de
avisarle cuando el plazo se vence. La persona se registra con su correo, confirma, y desde su cuenta
ve lo que reservó, cambia su nombre público y decide si su donación aparece con nombre o de forma
anónima.

**Why this priority**: es el prerrequisito de la historia 1, y es la parte que toca datos personales,
así que es donde un error cuesta más caro.

**Independent Test**: se prueba registrándose con un correo, confirmándolo, entrando a `/cuenta`,
cambiando el nombre público y la preferencia de anonimato, y verificando que una sesión del público
no puede leer ni escribir nada de la campaña ni entrar al backoffice.

**Acceptance Scenarios**:

1. **Given** alguien sin cuenta, **When** se registra con correo y contraseña, **Then** recibe un
   correo de confirmación y **no** puede iniciar sesión hasta confirmarlo.
2. **Given** alguien que olvidó su contraseña, **When** la pide, **Then** recibe un enlace de
   recuperación por correo y puede fijar una nueva.
3. **Given** una cuenta del público con sesión activa, **When** intenta abrir cualquier ruta del
   backoffice, **Then** no ve ningún dato administrativo y recibe una explicación, no un error.
4. **Given** una cuenta del público, **When** intenta leer aportes, gastos no publicados,
   comprobantes, roles, el registro de auditoría o las reservas de otras personas, **Then** la base
   se lo niega, independientemente de lo que haga la interfaz.
5. **Given** una persona que reserva un ítem, **When** elige que su donación sea anónima, **Then** su
   nombre no aparece en ninguna página pública, y su reserva sí aparece en su propia cuenta.
6. **Given** una persona que quiere irse, **When** borra su cuenta, **Then** sus datos personales
   dejan de existir y lo que ya donó se conserva como donación anónima, sin su nombre.
7. **Given** el anonimato como preferencia, **When** alguien crea su cuenta y no elige nada,
   **Then** el estado por defecto es **anónimo**: aparecer con nombre es una decisión explícita.
8. **Given** una sesión abierta, **When** abre el menú, **Then** ve su nombre (o «Tu cuenta» si
   todavía no eligió uno), su retrato si cargó uno, un enlace a su cuenta y cómo cerrar la sesión.
9. **Given** alguien en su cuenta, **When** sube una foto suya, **Then** esa foto aparece en el menú
   y en `/cuenta`, y **no** aparece en ninguna página pública.
10. **Given** alguien en su cuenta, **When** cambia la contraseña, **Then** la sesión sigue abierta
    y la contraseña anterior ya no sirve.

---

### User Story 3 - Que se vea quién ayudó (Priority: P2)

Alguien compró la puerta y le gustaría que se sepa: no por vanidad, porque ver una lista de vecinos
y conocidos que ya pusieron algo es lo que convence al que duda. Cuando la familia confirma que la
donación llegó, el nombre aparece en la sección de quienes ayudaron, con lo que donó y cuándo.

**Why this priority**: es lo que convierte el catálogo en algo que se contagia. No hace falta para
que la casa reciba las chapas, sí para que reciba las siguientes.

**Independent Test**: se prueba confirmando la llegada de una donación no anónima y verificando que
el nombre aparece en `/quienes-ayudaron`; y confirmando una anónima y verificando que no aparece en
ninguna parte, ni en el HTML servido.

**Acceptance Scenarios**:

1. **Given** una donación no anónima cuya llegada la familia confirmó, **When** alguien abre la
   sección de quienes ayudaron, **Then** ve el nombre que esa persona eligió, qué donó y la fecha.
2. **Given** una donación anónima confirmada, **When** se renderiza cualquier página pública,
   **Then** su nombre no aparece, y tampoco aparece el correo ni ningún identificador de nadie.
3. **Given** una reserva que todavía no llegó, **When** se renderiza el muro, **Then** **no** figura:
   el muro dice quién ayudó, no quién prometió ayudar.
4. **Given** alguien que cambia de opinión sobre su anonimato, **When** lo cambia en su cuenta,
   **Then** el muro público refleja el cambio sin intervención de nadie.
5. **Given** que todavía nadie donó nada en especie, **When** alguien abre la sección, **Then** ve un
   estado vacío que explica que es la primera donación la que abre la lista, no una página en blanco
   ni una lista de ejemplo.

---

### User Story 4 - La familia carga el catálogo y confirma lo que llegó (Priority: P2)

La persona a cargo arma la lista de lo que falta desde el teléfono: título, cuánto hace falta, en qué
unidad, una foto si la tiene. Cuando el material llega, marca la donación como recibida, y ahí el
nombre pasa al muro y el catálogo actualiza cuánto falta.

**Why this priority**: sin esto el catálogo no existe, pero puede cargarse una vez a mano en la base
para probar las historias 1 y 3. Es la que hace que el catálogo siga siendo cierto en el mes tres.

**Independent Test**: se prueba desde `/admin/catalogo` en viewport de teléfono, creando un ítem,
publicándolo, viendo la ficha desde el icono de la fila, editando esa fila, y desde `/admin/donaciones`
confirmando la llegada de una reserva y cancelando otra con motivo. Un ítem sin reservas se borra
desde la misma tabla; uno con reservas se rechaza.

**Acceptance Scenarios**:

1. **Given** un rol con permiso de contenido, **When** carga un ítem del catálogo, **Then** puede
   publicarlo y aparece en `/catalogo` con la cantidad que declaró.
2. **Given** una reserva, **When** un rol con permiso financiero confirma que llegó, **Then** el
   catálogo pasa esa cantidad de reservada a entregada y la donación queda en condiciones de
   aparecer en el muro.
3. **Given** una reserva que la persona abandonó, **When** un rol con permiso financiero la cancela,
   **Then** la cancelación queda registrada con motivo y fecha, y la cantidad vuelve a estar
   disponible.
4. **Given** un rol de editor, **When** abre el backoffice, **Then** puede administrar el catálogo y
   **no** puede ver los nombres, los correos ni las notas de quienes reservaron.
5. **Given** un ítem con tres unidades ya reservadas, **When** alguien intenta bajar la cantidad
   necesaria a dos, **Then** la operación se rechaza con un mensaje que explica que hay tres
   comprometidas, en lugar de dejar el ítem sobrevendido.
6. **Given** cualquier cambio en el catálogo o en una reserva, **When** se guarda, **Then** queda
   registrado quién lo hizo y cuándo.
7. **Given** el owner en `/admin/catalogo`, **When** mira la tabla de lo que falta, **Then** cada
   fila tiene una columna Acciones con ver (abre la ficha pública), editar (esa fila entra en modo
   edición) y borrar (pide confirmación). **Given** un editor, **Then** ve ver y editar y **no** ve
   borrar. **Given** un ítem con reservas o entregas, **When** confirma el borrado, **Then** se
   rechaza con un mensaje que lo explica y el ítem sigue.

---

### User Story 5 - Enterarse por correo (Priority: P2)

La persona que reservó recibe un correo que confirma qué se comprometió a donar, con las
instrucciones de cómo entregarlo y hasta cuándo está reservado. Unos días antes del vencimiento
recibe un recordatorio. Cuando la familia confirma la llegada, recibe un agradecimiento. Y la familia
recibe un aviso cuando alguien reserva algo, para no tener que mirar el panel.

**Why this priority**: sin correo, una reserva es una promesa que nadie recuerda y el catálogo se
llena de ítems bloqueados por gente de buena fe que se olvidó. Igual el catálogo funciona sin correo
—por eso no es P1— y tiene que seguir funcionando cuando el proveedor falla.

**Independent Test**: se prueba reservando un ítem y verificando que el correo se envió con el
contenido correcto y en el idioma de quien reservó; y cortando la credencial del proveedor, que la
reserva se completa igual, que la pantalla lo dice, y que el fallo queda registrado.

**Acceptance Scenarios**:

1. **Given** alguien que reserva un ítem, **When** la reserva queda hecha, **Then** recibe un correo
   con qué reservó, cuántos, hasta cuándo, cómo entregarlo y cómo cancelar.
2. **Given** una reserva próxima a vencer, **When** falta el plazo de aviso, **Then** la persona
   recibe un recordatorio, y recibe **uno solo** aunque el proceso de aviso corra varias veces.
3. **Given** una persona que navega el sitio en inglés, **When** recibe cualquier correo, **Then**
   está en inglés; en castellano si navega en castellano.
4. **Given** el proveedor de correo caído o sin credencial configurada, **When** alguien reserva un
   ítem, **Then** la reserva **se completa**, la pantalla muestra los datos de entrega en lugar de
   prometer un correo que no llegó, y el fallo queda registrado para la familia.
5. **Given** una donación confirmada como recibida, **When** se confirma, **Then** la persona recibe
   un agradecimiento y, si eligió aparecer, el enlace a la sección donde está su nombre.
6. **Given** cualquier correo del sistema, **When** llega, **Then** viene del dominio del proyecto,
   dice por qué lo recibe quien lo recibe, y no contiene ningún dato de otra persona.

---

### Edge Cases

- **Dos reservas simultáneas por el último ejemplar.** Una gana. La otra recibe un mensaje diseñado,
  no un error. La base no puede quedar sobrevendida ni por un instante.
- **Alguien reserva y nunca entrega.** La reserva vence y el ítem vuelve al catálogo. El vencimiento
  no depende de que un proceso programado esté vivo: si el programador falla, la reserva siguiente
  sobre ese ítem libera lo vencido antes de tomar nada.
- **Alguien acapara el catálogo.** Hay un tope de reservas activas por cuenta, y la familia puede
  cancelar cualquiera con motivo.
- **Cuentas creadas para molestar.** Sin correo confirmado no hay sesión, y sin sesión no hay reserva.
- **La persona borra su cuenta con donaciones ya entregadas.** El historial se conserva sin su
  nombre; el muro deja de mostrarla.
- **La misma persona con dos correos.** El sistema no lo detecta ni lo intenta: son dos cuentas, y no
  hay ningún daño en que lo sean.
- **El proveedor de correo rechaza la dirección.** El fallo es visible en el backoffice; la operación
  que lo disparó no se revierte por eso.
- **Un ítem se despublica con reservas activas.** Las reservas siguen valiendo y se pueden entregar;
  el ítem deja de ofrecerse a nuevas personas.
- **La familia baja la cantidad necesaria por debajo de lo ya comprometido.** Se rechaza con un
  mensaje que dice cuántas hay comprometidas.
- **Alguien pide reservar más unidades de las que faltan.** Se rechaza del lado del servidor con el
  número disponible en el mensaje.
- **Una cuenta del público llama directamente al servidor** intentando escribir en la campaña, leer
  aportes o reservar a nombre de otro. La base lo niega, no la interfaz.
- **Un ítem sin foto subida.** El listado y la ficha muestran la foto de referencia del tipo
  (ADR-043). En la ficha, etiquetada con epígrafe y crédito. En el listado, miniatura en Qué,
  sin epígrafe por fila: el caption de la tabla dice que es ilustrativa. Si tampoco hay
  referencia, la ficha reserva el espacio y dice qué foto va ahí; el listado omite la foto y
  no reserva un hueco (ADR-021).
- **Alguien navega sólo con teclado, o con lector de pantalla.** Registrarse, reservar y cambiar el
  anonimato se completan igual, con foco visible y errores anunciados.
- **La fuente de datos no está disponible.** El catálogo y el muro se omiten con aviso, como el resto
  de las cifras (FR-034). Registrarse y reservar no se ofrecen si no se puede cumplir.

---

## Requirements *(mandatory)*

### Functional Requirements

**Identidad: dos audiencias, una sola base**

- **FR-201**: El sistema MUST permitir que cualquier persona cree una cuenta con correo y contraseña,
  y MUST exigir la confirmación del correo antes de la primera sesión.
- **FR-202**: El sistema MUST tratar a una cuenta del público y a una cuenta del equipo como
  audiencias distintas, y la distinción MUST vivir en la base, no en la interfaz: una cuenta sin rol
  interno asignado es del público.
- **FR-203**: Una cuenta del público MUST NOT poder leer aportes, gastos no publicados, comprobantes,
  roles, registro de auditoría, reservas de otras personas, ni ningún dato personal ajeno.
- **FR-204**: Una cuenta del público MUST NOT poder escribir en ninguna tabla de la campaña, salvo
  sus propios datos de perfil y sus propias reservas, y estas últimas sólo por la operación que el
  sistema expone para eso.
- **FR-205**: Toda regla de acceso que hoy dependa de "tener sesión" MUST reescribirse para depender
  de "tener rol interno" o de "ser dueño de la fila", y esa condición MUST verificarse con una
  compuerta automática, no con una revisión a ojo.
- **FR-206**: El acceso al backoffice MUST seguir requiriendo rol interno; una cuenta del público con
  sesión válida MUST recibir una negativa comprensible y ninguna información administrativa.
- **FR-207**: Ningún dato de autorización MUST leerse de un campo que la propia persona pueda editar.
- **FR-208**: Las personas MUST poder cambiar su contraseña, recuperarla por correo y borrar su
  cuenta desde el sitio, sin intervención del equipo.

**Catálogo**

- **FR-209**: El sistema MUST publicar un catálogo de lo que falta como tabla en todo ancho de
  pantalla (también en teléfono: MUST NOT apilar cada columna como lista). Cada ítem tiene qué es,
  una foto compacta del tipo en la misma celda que el título cuando hay una (la subida o la de
  referencia; MUST NOT reservar un hueco de foto en la fila), cuántas unidades hacen falta, en qué
  unidad se cuenta, cuántas siguen faltando, si alguien ya la tomó, el nombre público o la ausencia
  de nombre, el estimado por unidad y el estimado total de lo que falta cuando hay un valor
  cargado, y un control «Quiero donar» al final de la fila que abre la ficha (ADR-043, ADR-044).
  MUST NOT usar una acción primaria en la fila. MUST NOT agregar una columna sólo para la foto.
- **FR-210**: El sistema MUST calcular lo que falta descontando lo reservado y lo ya entregado, y
  MUST NOT ofrecer para reservar un ítem cubierto.
- **FR-211**: El sistema MUST hacer **imposible** que queden comprometidas más unidades de las
  necesarias, incluso con pedidos simultáneos. La garantía MUST estar en la base de datos y MUST NOT
  depender de una comprobación previa en la aplicación.
- **FR-212**: Un ítem MUST poder llevar una foto con texto alternativo. Si el equipo subió una
  foto real desde el backoffice, esa MUST mostrarse en el listado y en la ficha. Si no, MUST
  mostrarse la foto de referencia del tipo de material (ADR-043). En la ficha, con epígrafe que
  diga que es solamente ilustrativa y que no representa el objeto real. En el listado, compacta
  junto al título, sin epígrafe por fila: el caption de la tabla lo dice. Sin ninguna de las dos,
  la ficha reserva el espacio y declara qué va ahí; el listado omite la foto. MUST NOT usar stock
  ni imagen generada en el relato (historia, incendio, obra).
- **FR-213**: Un ítem MUST poder asociarse a un rubro del presupuesto existente, para que el catálogo
  y el presupuesto cuenten la misma obra.
- **FR-214**: Un ítem MUST poder tener un valor estimado con su moneda, o no tenerlo. Si no lo tiene,
  la interfaz lo omite en lugar de estimarlo (en el listado, un em dash; no un cero). Si lo tiene, el
  listado y la ficha MUST publicarlo etiquetado como estimado, no como precio fijo (ADR-041, ADR-044).
  El total del listado MUST ser el estimado de unidad por las unidades que siguen faltando.
- **FR-215**: El catálogo MUST NOT mostrar un ítem no publicado.
- **FR-258**: `/admin/catalogo` MUST ser una tabla con una columna Acciones. Ver MUST abrir la ficha
  pública `/catalogo/{id}`. Editar MUST poner esa fila en modo edición con `?editar={id}` y MUST
  funcionar sin JavaScript. Borrar MUST pedir confirmación, MUST estar visible sólo para un rol con
  `catalogo.borrar` (`admin` y `owner`), MUST fallar si hay reservas o entregas —incluso canceladas—
  y MUST dejar rastro. MUST NOT aparecer en el HTML de `/catalogo` (ADR-037, ADR-050).
- **FR-253**: El catálogo MUST agrupar los ítems publicados por una categoría cerrada
  (`materiales`, `aberturas`, `instalaciones`, `electrodomesticos`, `muebles`, `ajuar`).
  MUST NOT aceptar una categoría libre. `metro_cubico` es una unidad del catálogo, para
  arena, ripio y similares.
- **FR-254**: Cada ítem publicado MUST tener una página propia con la foto (la subida, o la de
  referencia del tipo, o el espacio reservado), la descripción, las cantidades y, si queda algo,
  un solo formulario que explique que se puede traer el mismo bien o cubrirlo con plata. El
  listado MUST mostrar la misma foto en miniatura en la celda Qué cuando hay una, sin epígrafe
  por fila y sin hueco si no hay. El epígrafe y el crédito completos viven en la ficha.
- **FR-255**: El catálogo MUST mostrar el nombre de quien reservó o entregó un ítem sólo cuando
  esa persona eligió aparecer. MUST NOT mostrar el nombre, el correo ni el identificador de una
  reserva o donación anónima. Lo anónimo se ve sólo como cantidad tomada, sin nombre.
- **FR-256**: Cubrir un ítem con plata MUST ofrecer transferencia (estimado neto), Mercado Pago
  (estimado más 10%, con la posibilidad de sumar más) y PayPal (estimado neto). MUST NOT
  convertir monedas. MUST decir que el monto es estimado, no fijo. MUST NOT mostrar los datos de
  un medio (CBU, alias, link, recargo) hasta que ese medio esté elegido.
- **FR-257**: Cubrir un ítem con plata MUST mostrar transferencia, Mercado Pago y PayPal y MUST NOT
  crear una reserva ni pedir cuenta. MUST NOT sumar el estimado a los totales de dinero de la campaña.
  El nombre, si la persona quiere aparecer, MUST pedirse cuando el equipo anota la transacción, no
  antes.

**Reservas**

- **FR-216**: Una persona con sesión y correo confirmado MUST poder reservar una o más unidades de un
  ítem disponible para **traerlo**, y la reserva MUST quedar asignada a su cuenta. MUST NOT exigir
  que el equipo haya habilitado la cuenta (`approved`). Una cuenta `declined` MUST NOT reservar.
  Reservar un bien físico MUST pedir nombre de contacto, correo o teléfono, y la dirección donde ir
  a buscar. El correo de la cuenta satisface «mail o teléfono». Esos datos MUST NOT publicarse.
  Si falta un dato, el sistema MUST llevar el foco y el scroll al primer campo inválido y MUST
  marcar su borde con el color de peligro. MUST NOT enviar el formulario.
- **FR-217**: Toda reserva MUST tener fecha de vencimiento, y al vencer MUST devolver las unidades al
  catálogo.
- **FR-218**: La liberación de lo vencido MUST ser correcta aunque el proceso programado que la
  ejecuta no corra.
- **FR-219**: El sistema MUST limitar la cantidad de reservas activas por cuenta.
- **FR-220**: La persona que reservó MUST poder cancelar su reserva desde su cuenta.
- **FR-221**: Un rol con permiso financiero MUST poder confirmar la llegada de una donación y
  cancelar una reserva con motivo.
- **FR-222**: Ninguna reserva ni donación MUST poder borrarse: se cancela o se marca vencida, con
  motivo y fecha, y el registro queda.
- **FR-223**: Todo cambio de estado de una reserva y todo cambio en el catálogo MUST registrar autor
  y momento en el rastro de auditoría existente.
- **FR-224**: Una donación en especie MUST NOT sumarse a los totales de dinero de la campaña ni
  alterar el porcentaje ejecutado.

**Anonimato y muro**

- **FR-225**: Toda reserva MUST tener una preferencia de anonimato, y el valor por defecto MUST ser
  anónimo.
- **FR-226**: El sistema MUST publicar una sección con las donaciones **no** anónimas cuya llegada
  fue confirmada, mostrando el nombre elegido, qué se donó y la fecha.
- **FR-227**: La sección pública MUST NOT exponer correo, identificador de cuenta, nota privada ni
  ningún otro dato de quien donó, y la imposibilidad MUST estar impuesta por privilegios de la base,
  no por la consulta que escriba la aplicación.
- **FR-228**: Una donación anónima MUST NOT aparecer en ninguna página pública, tampoco de forma
  agregada que permita identificarla.
- **FR-229**: Un cambio de preferencia de anonimato MUST reflejarse en el sitio público sin
  intervención del equipo.
- **FR-230**: El nombre que se publica MUST ser el que la persona eligió para mostrar, nunca el
  nombre derivado de su correo.

**Correo**

- **FR-231**: El sistema MUST enviar, desde el dominio del proyecto: confirmación de cuenta,
  recuperación de contraseña, confirmación de reserva, recordatorio de vencimiento, agradecimiento
  por donación recibida, y aviso al equipo de una reserva nueva.
- **FR-232**: Todo correo MUST estar en el idioma en que la persona usó el sitio.
- **FR-233**: El envío de correo MUST NOT ser condición para que la operación que lo dispara se
  complete.
- **FR-234**: Un fallo de envío MUST quedar registrado y visible para el equipo, y MUST comunicarse a
  la persona en pantalla en lugar de prometerle un correo que no va a llegar.
- **FR-235**: Un mismo correo MUST NOT enviarse dos veces por un reintento.
- **FR-236**: Sin credencial del proveedor configurada, el sistema MUST seguir funcionando y MUST NOT
  ofrecer flujos que dependan del correo para completarse.
- **FR-237**: Ningún correo MUST contener datos de otra persona, ni secretos, ni enlaces que
  autentiquen sin expirar.

**Privacidad**

- **FR-238**: El sistema MUST recolectar el mínimo: correo; nombre para mostrar si la persona
  lo escribe o si entra con una red que lo entrega; y una foto de retrato si la persona la
  sube o si esa red entrega una. El local-part del correo MUST NOT usarse como nombre. La foto
  MUST NOT publicarse.
- **FR-239**: La política de privacidad publicada MUST describir qué se guarda, para qué, cuánto
  tiempo y cómo se borra, en los dos idiomas, **en el mismo despliegue** que habilita el registro.
- **FR-240**: Borrar la cuenta MUST eliminar los datos personales y MUST conservar la donación como
  anónima, para no romper el historial de lo que efectivamente llegó.

**Agentes y descubribilidad**

- **FR-241**: El sistema MUST exponer el catálogo como capacidad de sólo lectura para agentes, con lo
  que falta de cada ítem.
- **FR-242**: Ninguna capacidad para agentes MUST devolver nombres de donantes ni permitir reservar.
- **FR-243**: El catálogo y la sección de quienes ayudaron MUST tener metadata propia, estar en el
  sitemap y estar disponibles en los dos idiomas.

**Chrome de cuenta (ADR-037)**

- **FR-244**: Con sesión activa, el menú MUST mostrar el nombre que la persona eligió —o una
  etiqueta de «tu cuenta» si no eligió ninguno—, un retrato si hay uno, un enlace a `/cuenta` y la
  acción de cerrar sesión. MUST NOT derivar un nombre del correo (FR-230).
- **FR-245**: El HTML de las páginas públicas MUST seguir siendo idéntico con o sin sesión. El chrome
  de cuenta MUST hidratarse después, por un snapshot privado, y MUST NOT leer cookies en el
  documento público.
- **FR-246**: Una persona MUST poder subir, cambiar y borrar una foto de retrato desde `/cuenta`. El
  archivo MUST vivir en un bucket privado, MUST pertenecer sólo a su dueña, y MUST NOT aparecer en
  el muro ni en ninguna respuesta pública.
- **FR-247**: El retrato MUST ser un recorte rectangular, no un avatar circular. Sin foto, el espacio
  se reserva y se dice qué va ahí, sin imagen de archivo ni icono de relleno.
- **FR-248**: Una persona con sesión MUST poder cambiar su contraseña desde `/cuenta`, sin pasar por
  el correo de recuperación.

**Alta con redes sociales (ADR-039)**

- **FR-249**: El sistema MUST permitir crear una cuenta e ingresar con los proveedores sociales
  nativos de Supabase Auth que estén habilitados. Sin ninguno habilitado, MUST NOT mostrar el
  control. MUST NOT inventar un proveedor ni mostrar uno «próximamente».
- **FR-250**: El alta por una red social MUST nacer anónima y `pending`, igual que el alta por
  correo. MUST copiar al perfil el nombre y la foto que la red entregue, si los campos están
  vacíos. MUST NOT pisar un nombre o una foto que la persona ya haya elegido. MUST NOT
  publicarlos en el muro ni saltear la habilitación del equipo (ADR-033).
- **FR-251**: El callback MUST canjear el código en el servidor, MUST NOT respetar un `next` de la
  query, y MUST fallar con un estado diseñado si el proveedor no entrega un correo.
- **FR-252**: Si ya existe una cuenta confirmada con el mismo correo, entrar con una red social
  MUST usar esa cuenta. MUST NOT crear una segunda.

### Key Entities

- **Cuenta del público**: alguien que se registró para poder reservar. Tiene correo confirmado,
  idioma de preferencia, nombre para mostrar si decidió aparecer, y un retrato optativo que no se
  publica. No tiene rol interno, y esa ausencia es lo que la define.
- **Ítem del catálogo**: algo que hace falta para la obra. Tiene qué es, cantidad necesaria, unidad,
  cuánto está reservado, cuánto entregado, valor estimado opcional, foto opcional, rubro de
  presupuesto opcional y estado de publicación.
- **Reserva**: el compromiso de una cuenta de donar una cantidad de un ítem. Tiene cantidad, estado,
  vencimiento, preferencia de anonimato, nombre a mostrar, nota privada para la familia, y fecha de
  cada cambio de estado. No se borra.
- **Envío de correo**: el registro de que se intentó mandar un correo, de qué tipo, a qué cuenta, con
  qué resultado. Sólo se agrega.
- **Muro de quienes ayudaron**: la proyección pública de las reservas entregadas y no anónimas. No es
  una tabla: es lo único que el público puede ver de una reserva.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-201**: Una persona que llega al catálogo sin cuenta puede quedar con un ítem reservado a su
  nombre en menos de tres minutos, contando el registro y la confirmación del correo.
- **SC-202**: En ninguna circunstancia quedan comprometidas más unidades que las necesarias,
  verificado con una prueba que ejecuta dos reservas concurrentes sobre el último ejemplar.
- **SC-203**: Una sesión del público no puede escribir nada fuera de su propio perfil y sus propias
  reservas, y no puede leer nada que un visitante sin sesión no pueda leer, verificado
  automáticamente sobre **toda** tabla y **toda** operación.
- **SC-204**: Ninguna página pública contiene el correo ni el identificador de ninguna cuenta,
  verificado sobre el HTML servido.
- **SC-205**: Una donación anónima no aparece en ninguna respuesta pública, verificado
  automáticamente.
- **SC-206**: Cero violaciones de accesibilidad detectables automáticamente en el catálogo, el muro y
  las pantallas de cuenta, en viewport de teléfono y de escritorio.
- **SC-207**: Los flujos de registro, reserva y cambio de anonimato se completan sólo con teclado.
- **SC-208**: La suma de lo reservado más lo entregado nunca supera lo necesario para ningún ítem,
  verificado por una restricción de la base y por una prueba que intenta violarla.
- **SC-209**: Los totales de dinero publicados no cambian al registrar una donación en especie,
  verificado automáticamente.
- **SC-210**: El recordatorio de vencimiento llega una sola vez por reserva, verificado ejecutando el
  proceso de aviso dos veces.
- **SC-211**: Con el proveedor de correo sin configurar, el catálogo, la reserva y el muro siguen
  funcionando, y la pantalla lo dice, verificado en el modo de prueba sin datos.
- **SC-212**: El tiempo entre que la familia confirma una donación y que el nombre aparece en el muro
  no supera los cinco minutos sin intervención manual.
- **SC-213**: El HTML servido de las páginas públicas no cambia según haya sesión o no, verificado
  sobre el documento inicial; el nombre, el correo y el retrato aparecen después, en el menú.
- **SC-214**: Con un proveedor social habilitado, una persona puede crear la cuenta desde el botón
  de esa red y aterrizar en `/cuenta` con sesión, con el nombre de esa red ya en el perfil, anónima
  y `pending`. Si esa dirección ya tenía cuenta, entra a ésa. Verificado en el harness local.
- **SC-215**: Desde `/admin/catalogo` el owner ve, edita en la fila y borra un ítem sin reservas; el
  editor no ve borrar. Verificado en e2e, en viewport de teléfono y de escritorio.

---

## Decisiones pendientes

Tres decisiones son de producto y las toma la dueña del proyecto. Cada una tiene un valor recomendado
**ya aplicado** en esta especificación: si no se responden, se implementa el recomendado, y cambiarlo
después es baratísimo en dos de los tres casos.

### D1 — ¿La reserva es automática o la aprueba la familia?

El pedido dice "la gente puede pedir donar algo y se lo asigna", y eso se puede leer de dos maneras.

| Opción | Qué implica |
|---|---|
| **Automática (recomendada, aplicada)** | Quien reserva se lleva el ítem al instante. Menos fricción, más donaciones, y el riesgo de bloqueo se controla con vencimiento y tope por cuenta |
| Con aprobación | Nadie bloquea nada sin que la familia diga sí, pero el ítem queda en limbo hasta que alguien mire el panel, y agrega un estado más al modelo |

Cambiar de automática a con aprobación después es agregar un estado: barato.

### D2 — ¿El nombre aparece al reservar o cuando la donación llegó?

| Opción | Qué implica |
|---|---|
| **Cuando llegó (recomendada, aplicada)** | El muro dice la verdad: quien está ahí donó. Nadie pone su nombre reservando y desapareciendo. El costo es que la gratificación tarda |
| Al reservar | Gratificación inmediata y más contagio, pero el muro pasa a decir "prometió" y hay que sacar nombres cuando una reserva vence |

### D3 — ¿Se publica el valor estimado de cada ítem?

Reabierta y resuelta en [ADR-041](../../docs/adr/041-estimado-publico-y-cubrir-con-plata.md),
enmendada por [ADR-044](../../docs/adr/044-tabla-del-catalogo-y-quiero-donar.md):
el listado y la ficha lo publican etiquetado como estimado, no fijo. El libro no.

| Opción | Qué implica |
|---|---|
| No publicarlo | Se guarda para que la familia priorice, y no se muestra. Impide cubrir el ítem con plata |
| Publicarlo sólo en la ficha | Hay que abrir cada renglón para saber cuánto sale. El pedido es verlo en la tabla |
| **Publicarlo en el listado y la ficha, etiquetado (aplicada)** | Se escanea lo que falta y un estimado. El sitio no afirma que coincida con el mostrador |

---

## Assumptions

- El correo con contraseña sigue siendo el método que no depende de un tercero. OAuth es una
  alternativa, no un reemplazo: el catálogo cerrado, los botones sólo si están habilitados, copiar
  nombre y foto de la red como propuesta (no al muro) y unificar el mismo correo están en
  [ADR-039](../../docs/adr/039-oauth-nativo.md).
- Sin doble factor para el público, igual que hoy para el equipo. Una cuenta del público no da acceso
  a nada más que a sus propias reservas, así que el daño de un robo de credencial es acotado.
- Sin captcha en esta versión. La confirmación de correo más el tope de reservas activas son la
  defensa. Queda escrito como riesgo aceptado, con el disparador para revisarlo: la primera reserva
  de mala fe.
- La entrega física se coordina con los datos de retiro de la reserva (nombre, correo o teléfono,
  dirección). Los canales de `/contacto` siguen publicados. El sitio ya no asume que la logística
  vive sólo afuera: guarda la dirección para que el equipo pueda ir a buscar (ADR-046).
- Cubrir un ítem con plata no reserva. La transacción (transferencia, PayPal, Mercado Pago) es la
  prueba. El nombre se pide si la transacción se hace, cuando el equipo la anota.
- Una donación en especie no es plata y no entra en el libro. Si alguien prefiere transferir el monto
  para que la familia compre, eso es un aporte y sigue el camino que ya existe.
- El catálogo lo carga la familia. Nadie del público puede proponer ítems en esta versión.
- Los correos son de texto con formato mínimo, sin imágenes remotas ni seguimiento de apertura, en
  coherencia con ADR-010.
- El plazo de reserva y el tope de reservas por cuenta son números que la familia va a querer ajustar
  con la experiencia. Empiezan en catorce días y cinco reservas, en un solo lugar del código.
- Las cuentas del público y las del equipo conviven en el mismo proveedor de identidad. Un proyecto
  separado duplicaría la identidad y volvería imposible que el muro y el backoffice hablen de la
  misma persona.
- Requiere un dominio verificado en el proveedor de correo antes de que cualquier correo salga. Es
  trabajo de configuración, no de código, y está en el runbook.
