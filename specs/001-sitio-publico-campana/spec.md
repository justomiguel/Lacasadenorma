# Feature Specification: Sitio público de campaña con transparencia auditable y backoffice

**Feature Branch**: `001-sitio-publico-campana`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "sitio publico de campana con transparencia auditable y backoffice"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entender y decidir en treinta segundos (Priority: P1)

Alguien recibe un enlace por WhatsApp. Abre el sitio en el teléfono, con datos móviles. En menos de
treinta segundos entiende quién fue Norma, qué pasó, qué hay que reconstruir, cuánto se juntó, para
qué se va a usar la plata y cómo puede colaborar. Si decide ayudar, obtiene los datos de la cuenta
bancaria de su país y los copia con un toque.

**Why this priority**: Es la razón de existir del sitio. Si esta historia funciona y ninguna otra
está implementada, el proyecto ya cumple su propósito: la casa se reconstruye. Todo lo demás
sostiene esto.

**Independent Test**: Se puede probar completo abriendo la home en un teléfono, leyéndola, tocando
"Ayudar a reconstruir", eligiendo un país y copiando los datos de la cuenta. Entrega valor sin
backoffice, sin autenticación y sin base de datos.

**Acceptance Scenarios**:

1. **Given** una persona que abre la home por primera vez en un teléfono, **When** lee sin
   desplazarse más allá de la primera pantalla, **Then** ve el nombre del proyecto, una frase que
   explica qué es, y una acción principal para colaborar.
2. **Given** una persona en la home, **When** recorre la página completa, **Then** encuentra
   respondidas, en este orden, las nueve preguntas: quién fue Norma, qué pasó, qué hay que
   reconstruir, cómo colaborar, cuánto se consiguió, en qué se usa el dinero, cómo se rinden los
   fondos, cuál es el futuro del proyecto, y cómo continúa el legado.
3. **Given** una persona que quiere colaborar desde Argentina, **When** entra a la sección de
   aportes, **Then** ve los datos de la cuenta argentina con un control para copiar cada dato
   individualmente y confirmación visible de que se copió.
4. **Given** una persona que quiere colaborar desde Chile o Estados Unidos, **When** elige su país,
   **Then** ve los datos de ese país sin tener que leer los de los otros.
5. **Given** un método de aporte cuyos datos todavía no fueron cargados, **When** se renderiza la
   página, **Then** ese método **no** aparece, y en ningún caso se muestra un dato de ejemplo.
6. **Given** una persona que quiere difundir la campaña, **When** usa la acción de compartir,
   **Then** el enlace se comparte con título, descripción e imagen correctos en WhatsApp.

---

### User Story 2 - Verificar que la plata se usó como se dijo (Priority: P1)

Alguien que ya aportó, o que está evaluando aportar, quiere comprobar que el dinero se usa en lo
que se prometió. Entra a la sección de transparencia y ve el total recibido, el total gastado, el
saldo disponible, el porcentaje ejecutado, cada gasto con su fecha, concepto, categoría y monto, si
tiene comprobante respaldatorio, y cuándo fue la última conciliación.

**Why this priority**: Es lo que separa esta campaña de una que no merece confianza. Sin esto, el
sitio es una promesa; con esto, es un registro verificable.

**Independent Test**: Se prueba entrando a `/transparencia` con datos cargados y comprobando que
los totales cierran aritméticamente con el detalle mostrado, y que la fecha de última conciliación
está visible.

**Acceptance Scenarios**:

1. **Given** una campaña con aportes y gastos registrados, **When** alguien abre la transparencia,
   **Then** ve total recibido, total gastado, saldo y porcentaje ejecutado, y la suma del detalle
   coincide exactamente con los totales.
2. **Given** un gasto con comprobante cargado, **When** alguien lo ve sin haber iniciado sesión,
   **Then** ve que existe un comprobante pero **no** puede acceder al archivo.
3. **Given** aportes individuales registrados, **When** alguien los consulta sin sesión, **Then**
   ve únicamente el agregado; ningún aporte individual ni identidad de quien aportó es accesible.
4. **Given** una campaña sin gastos registrados todavía, **When** alguien abre la transparencia,
   **Then** ve un estado vacío que explica que todavía no hay gastos, no un cero ambiguo ni una
   página en blanco.
5. **Given** que la última conciliación tiene más de treinta días, **When** se muestra la página,
   **Then** la antigüedad del dato es visible para quien lee.

---

### User Story 3 - Publicar un avance en dos minutos desde el teléfono (Priority: P2)

La persona a cargo del proyecto sacó fotos del techo nuevo. Entra a `/admin` desde el teléfono,
inicia sesión, publica una actualización con texto y fotos, registra el gasto del material con su
comprobante, y actualiza el monto recaudado. Todo en un par de minutos.

**Why this priority**: El riesgo más probable del proyecto no es técnico: es que la transparencia
quede desactualizada porque publicar cuesta trabajo. Si esta historia es incómoda, la historia 2
se degrada sola con el tiempo.

**Independent Test**: Se prueba iniciando sesión en `/admin` en viewport de teléfono, creando una
actualización con una imagen, registrando un gasto con comprobante, y verificando que ambos
aparecen en las páginas públicas.

**Acceptance Scenarios**:

1. **Given** una persona sin sesión, **When** intenta abrir cualquier ruta bajo `/admin`, **Then**
   es redirigida a iniciar sesión y no ve ningún dato administrativo.
2. **Given** una persona con rol de editor, **When** abre el backoffice, **Then** puede publicar
   actualizaciones y cargar fotos, pero **no** puede modificar cuentas bancarias ni registrar
   aportes.
3. **Given** una persona con rol de auditor, **When** abre el backoffice, **Then** puede ver todo
   incluidos los comprobantes, y **no** puede modificar nada.
4. **Given** una persona con permisos que registra un gasto, **When** guarda el registro, **Then**
   el gasto aparece en la transparencia pública y los totales se recalculan.
5. **Given** un intento de guardar un gasto con monto negativo o sin moneda, **When** se envía el
   formulario, **Then** la operación es rechazada del lado del servidor con un mensaje claro y
   asociado al campo correspondiente.
6. **Given** cualquier cambio en datos financieros, **When** se guarda, **Then** queda registrado
   quién lo hizo y cuándo.

---

### User Story 4 - Encontrar el proyecto desde un buscador o un asistente (Priority: P2)

Alguien que escuchó del caso busca "la casa de Norma Riacho He Hé" en un buscador, o le pregunta a
un asistente conversacional qué es este proyecto y cómo colaborar. Obtiene información correcta,
atribuida al sitio, con datos actualizados.

**Why this priority**: Amplifica todo lo demás sin costo recurrente, y el contenido de
transparencia con fecha es exactamente el tipo de dato original que los motores citan.

**Independent Test**: Se prueba verificando que cada página tiene metadata propia, que el sitemap
lista las páginas públicas, que los datos estructurados validan y describen sólo contenido
visible, y que las nueve preguntas están respondidas en prosa bajo encabezados propios.

**Acceptance Scenarios**:

1. **Given** cualquier página pública, **When** se inspecciona su HTML servido, **Then** el
   contenido principal está presente sin necesidad de ejecutar JavaScript.
2. **Given** un enlace compartido en WhatsApp, Facebook, LinkedIn o X, **When** se genera la
   vista previa, **Then** muestra título, descripción e imagen correctos y legibles.
3. **Given** los datos estructurados del sitio, **When** se validan, **Then** no afirman nada que
   no esté visible en la página, y no declaran una figura legal que el proyecto todavía no tiene.
4. **Given** un agente que consulta el estado de la campaña, **When** obtiene la respuesta,
   **Then** recibe objetivo, recaudado, porcentaje, moneda y fecha de última actualización, sin
   ningún dato personal.

---

### User Story 5 - Conocer el capítulo siguiente (Priority: P3)

Alguien que ya entendió la campaña quiere saber qué pasa cuando la casa esté terminada. Encuentra
qué es Fundación Norma, qué se propone hacer, y qué es Riacho Conecta.

**Why this priority**: No es necesaria para reconstruir la casa, pero es la razón por la que este
sitio no es una campaña descartable. Convierte un pedido puntual en un proyecto con continuidad.

**Independent Test**: Se prueba abriendo las páginas de legado y de Riacho Conecta y verificando
que explican el proyecto futuro sin prometer nada que no esté decidido.

**Acceptance Scenarios**:

1. **Given** una persona en la página del legado, **When** la lee, **Then** entiende qué continúa
   después de la casa y en qué estado está ese plan.
2. **Given** que Fundación Norma todavía no tiene personería jurídica, **When** se describe el
   proyecto, **Then** el texto no afirma que es una organización constituida.

---

### Edge Cases

- **La fuente de datos no está disponible.** El sitio muestra el contenido editorial y omite las
  cifras, con un aviso comprensible. No muestra ceros, no muestra una página en blanco, y no falla.
- **Un dato obligatorio nunca fue cargado** (por ejemplo, el presupuesto de un rubro). La sección
  se renderiza sin ese dato y sin inventarlo.
- **Alguien intenta acceder a un comprobante por su URL directa** sin permisos. Se le niega el
  acceso; la URL de un archivo privado no es adivinable ni permanente.
- **Un aporte se registró por error.** Se anula con motivo y fecha; los totales lo excluyen y el
  historial conserva el registro de la anulación.
- **La moneda del aporte difiere de la moneda del objetivo.** El sistema no suma montos de monedas
  distintas: los presenta por moneda y sólo convierte con un tipo de cambio explícito y fechado.
- **Un rol sin permiso intenta una mutación** llamando directamente al servidor. Se rechaza en el
  servidor, no sólo en la interfaz.
- **Alguien navega sólo con teclado.** Puede completar todos los flujos, incluida la copia de datos
  bancarios, con foco siempre visible.
- **Alguien tiene activado "reducir movimiento".** No ve ninguna animación no esencial.
- **Un agente pide una operación que mueve dinero.** No existe ninguna capacidad que lo permita.
- **Una imagen no carga.** El espacio conserva su proporción y el texto alternativo comunica qué
  debería verse.

## Requirements *(mandatory)*

### Functional Requirements

**Comprensión y narrativa**

- **FR-001**: El sitio MUST responder, en contenido visible, las nueve preguntas del proyecto:
  qué es La Casa de Norma, quién fue Norma, qué pasó, dónde queda Riacho He Hé, cómo colaborar,
  para qué se usa el dinero, cómo verificar su uso, qué pasa después de reconstruir la casa, y qué
  es Fundación Norma.
- **FR-002**: La home MUST permitir comprender el proyecto completo sin abandonar la página.
- **FR-003**: El relato de la historia de Norma y del accidente MUST estar escrito en lenguaje
  humano, concreto y digno, sin sensacionalismo y sin lenguaje de campaña genérico.
- **FR-004**: Cada página pública MUST tener un único encabezado principal y jerarquía coherente.

**Aportes**

- **FR-005**: El sistema MUST presentar métodos de aporte por transferencia para Argentina, Chile y
  Estados Unidos, cada uno con los datos que su país requiere.
- **FR-006**: Cada dato bancario MUST poder copiarse individualmente con una sola acción, con
  confirmación perceptible del resultado.
- **FR-007**: El sistema MUST NOT mostrar un método de aporte cuyos datos no estén verificados y
  marcados como publicables.
- **FR-008**: El modelo de métodos de aporte MUST permitir agregar nuevos medios (plataformas de
  pago u otros países) sin rediseñar la estructura de datos ni la interfaz.
- **FR-009**: El sitio MUST NOT procesar pagos ni solicitar datos de tarjeta en esta versión.

**Transparencia**

- **FR-010**: El sistema MUST publicar total recibido, total gastado, saldo, porcentaje ejecutado y
  fecha de la última conciliación.
- **FR-011**: El sistema MUST publicar cada gasto con fecha, concepto, categoría, monto, moneda y
  la indicación de si tiene comprobante.
- **FR-012**: Los totales publicados MUST calcularse a partir de los registros individuales, de
  manera que la suma del detalle coincida con el total mostrado.
- **FR-013**: Los archivos de comprobantes MUST NOT ser accesibles públicamente; sólo roles
  autorizados pueden obtenerlos, mediante acceso temporal.
- **FR-014**: Los aportes individuales y la identidad de quienes aportan MUST NOT ser públicos.
- **FR-015**: Los registros financieros MUST NOT poder eliminarse: se anulan con motivo y fecha, y
  la anulación queda registrada.
- **FR-016**: Todo cambio en datos financieros MUST registrar autor y momento.
- **FR-017**: El sistema MUST publicar el presupuesto estimado por rubro y el avance de la
  reconstrucción mediante hitos con estado y fecha.

**Contenido y administración**

- **FR-018**: El contenido editorial (historia, textos, preguntas frecuentes, descripciones) MUST
  ser modificable sin desplegar código para los campos que cambian con frecuencia.
- **FR-019**: El backoffice MUST permitir: registrar aportes, registrar gastos con comprobante,
  publicar actualizaciones, cargar fotografías, administrar cuentas de aporte, administrar hitos y
  editar objetivos.
- **FR-020**: El acceso al backoffice MUST requerir autenticación.
- **FR-021**: El sistema MUST soportar cuatro roles con permisos distintos: propietario,
  administrador, editor y auditor.
- **FR-022**: Toda autorización MUST verificarse del lado del servidor en cada operación, no sólo
  en la interfaz.
- **FR-023**: Toda entrada MUST validarse del lado del servidor, con mensajes de error asociados al
  campo y comprensibles.
- **FR-024**: Toda fotografía MUST requerir texto alternativo antes de poder publicarse.

**Descubribilidad**

- **FR-025**: El contenido principal de cada página MUST estar presente en el HTML servido.
- **FR-026**: Cada página MUST tener metadata propia, URL canónica y estar listada en el sitemap si
  es pública.
- **FR-027**: Los enlaces compartidos MUST generar vistas previas correctas, verificadas para
  WhatsApp en particular.
- **FR-028**: Los datos estructurados MUST describir únicamente información visible en la página y
  MUST NOT afirmar figuras legales, cifras ni fechas no verificadas.

**Capacidades para agentes**

- **FR-029**: El sistema MUST exponer capacidades de sólo lectura para consultar estado de campaña,
  métodos de aporte, avance de la reconstrucción, historia y resumen de transparencia.
- **FR-030**: Ninguna capacidad expuesta a agentes MUST iniciar, confirmar ni facilitar una
  operación financiera.
- **FR-031**: Ninguna capacidad expuesta a agentes MUST devolver datos personales ni información no
  pública.
- **FR-032**: Las capacidades para agentes MUST ejecutar la misma lógica y las mismas validaciones
  que la interfaz humana.
- **FR-033**: El sitio MUST funcionar completamente sin las capacidades para agentes.

**Robustez**

- **FR-034**: Si la fuente de datos no está disponible, el sitio MUST mostrar el contenido
  editorial y omitir las cifras con un aviso comprensible, sin fallar.
- **FR-035**: Todo estado de carga, vacío y de error MUST estar diseñado explícitamente.
- **FR-036**: Ningún error MUST fallar en silencio ni degradar a datos vacíos sin avisar.

### Key Entities

- **Campaña**: la iniciativa de reconstrucción. Tiene objetivo con moneda, descripción, estado y
  fecha de última conciliación.
- **Aporte**: dinero recibido. Tiene monto, moneda, fecha, método por el que llegó, si está
  conciliado, y posible anulación. No es público individualmente.
- **Gasto**: dinero ejecutado. Tiene monto, moneda, fecha, concepto, categoría, rubro de
  presupuesto al que corresponde, comprobantes asociados y posible anulación. Es público.
- **Comprobante**: archivo que respalda un gasto. Su existencia es pública; el archivo no.
- **Rubro de presupuesto**: parte de la obra con monto estimado (por ejemplo, techo, instalación
  eléctrica), usada para explicar en qué se usa el dinero y medir el avance.
- **Hito**: paso de la reconstrucción con estado y fecha, usado para comunicar avance.
- **Actualización**: novedad publicable y compartible, con fecha, texto y fotografías.
- **Fotografía**: imagen con texto alternativo obligatorio, crédito y orden de aparición.
- **Método de aporte**: forma de colaborar, con país, moneda, datos a mostrar, instrucciones y
  estado de publicación.
- **Persona**: figura pública del proyecto, empezando por Norma, con relato y fotografías.
- **Usuario administrador**: persona con acceso al backoffice y un rol asignado.
- **Registro de auditoría**: quién cambió qué y cuándo. Sólo se agrega, nunca se modifica.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona que nunca vio el sitio puede explicar, después de treinta segundos en la
  home en un teléfono, quién fue Norma, qué se está reconstruyendo y cómo colaborar.
- **SC-002**: Copiar un dato bancario requiere como máximo tres toques desde la home.
- **SC-003**: En las páginas principales, la puntuación de performance, accesibilidad, buenas
  prácticas y SEO es de al menos 95 sobre 100 en condiciones de producción.
- **SC-004**: En una conexión móvil de 4G promedio, el contenido principal de la home es legible en
  menos de 2,5 segundos.
- **SC-005**: Cero violaciones de accesibilidad automáticamente detectables en todas las páginas
  públicas, en viewport de teléfono y de escritorio.
- **SC-006**: Todos los flujos se pueden completar usando únicamente el teclado.
- **SC-007**: La suma de los registros individuales de transparencia coincide exactamente con los
  totales publicados, verificado automáticamente.
- **SC-008**: Una persona sin sesión no puede obtener ningún comprobante ni ningún aporte
  individual, verificado automáticamente en cada integración.
- **SC-009**: Publicar una actualización con una fotografía toma menos de dos minutos desde un
  teléfono.
- **SC-010**: Ningún dato de ejemplo o sin verificar aparece en el sitio publicado, verificado
  automáticamente antes de cada despliegue.
- **SC-011**: Un enlace compartido en WhatsApp muestra título, descripción e imagen correctos.
- **SC-012**: Otra persona puede levantar el proyecto en su máquina siguiendo el README, sin
  credenciales, y verlo funcionando.
- **SC-013**: Los nueve flujos críticos del proyecto están cubiertos por pruebas automatizadas que
  corren en cada cambio.

## Assumptions

- Quien llega al sitio lo hace mayoritariamente desde un teléfono, a través de mensajería o redes
  sociales, con conectividad variable.
- Los aportes se reciben por transferencia bancaria fuera del sitio y se registran manualmente
  después de conciliarlos con el banco. El sitio informa y da trazabilidad; no cobra.
- Los datos bancarios reales, el presupuesto, el monto recaudado, las fechas de Norma y las
  fotografías todavía no están disponibles. Hasta que lo estén, el sistema los trata como
  pendientes y **los omite en lugar de simularlos**. La lista completa está en
  `docs/content-guide.md`.
- Fundación Norma no tiene todavía personería jurídica; el contenido y los datos estructurados
  evitan afirmar lo contrario.
- Las identidades de quienes aportan no se publican en esta versión.
- El sitio se publica en castellano rioplatense (sin prefijo de URL) y en inglés (`/en`). Los
  slugs no se traducen. El backoffice, las novedades escritas a mano y las herramientas de WebMCP
  quedan en castellano. Ver ADR-023.
- La conciliación es semanal y la realiza una persona con rol de propietario.
- Riacho Conecta, los programas de formación y los medios de pago electrónicos quedan fuera de
  alcance de esta versión: se deja el modelo preparado, no la implementación.
- El servidor MCP autónomo queda fuera de alcance: se documenta la arquitectura que lo hará posible.
