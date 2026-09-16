# Feature Specification: Tablero de métricas del owner

**Feature Branch**: `main` — se trabaja sobre `main`, directo, sin rama de feature
(constitución § Flujo de trabajo · Git).

**Created**: 2026-09-16

**Status**: Ready

**Input**: User description: "Necesitamos un dashboard de métricas para el owner, que diga todo lo
que se pueda medir con gráficos. Mete señales dónde puedas."

**Numeración**: los requisitos van de **FR-601** en adelante y los criterios de **SC-601** en
adelante.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el pulso de la campaña en una pantalla (Priority: P1)

La dueña entra al backoffice a preguntar cómo vamos: plata, obra, especie, colas. Hoy esa
respuesta está partida en diez secciones. Con esta feature abre **Métricas** y ve el libro, los
gráficos de lo medible y las excepciones que piden una decisión, con un enlace a la pantalla donde
se actúa.

**Why this priority**: es el pedido. Si sólo se implementa esto, el tablero ya sirve.

**Independent Test**: entrar como `owner` a `/admin/metricas` con el fixture, ver cifras del
libro, al menos un gráfico con su tabla, y las señales que el fixture dispara. Entrar como
`admin` o `editor` termina en `/admin/sin-permiso`.

**Acceptance Scenarios**:

1. **Given** una sesión de `owner` y una campaña cargada, **When** abre `/admin/metricas`,
   **Then** ve el libro en la moneda del objetivo (recibido, gastado, saldo, objetivo interno si
   está), gráficos de lo que hay para medir y una lista de señales. Un gráfico sin observaciones
   no se dibuja.
2. **Given** una sesión de `admin`, `editor`, `auditor` o una cuenta del público, **When** abre
   `/admin/metricas`, **Then** no ve el tablero: quien no tiene `metricas.leer` termina en
   `/admin/sin-permiso` o en la pantalla de acceso.
3. **Given** aportes y gastos en la moneda principal, **When** se renderiza el tablero, **Then**
   hay un gráfico de flujo semanal (entradas y salidas de las últimas doce semanas) y uno
   acumulado. El acumulado lleva una señal en el objetivo interno cuando ese objetivo está
   cargado y es de la misma moneda. El semanal lleva una señal en el promedio de lo recibido.
4. **Given** reservas, ítems de catálogo, cuentas del público o envíos de correo, **When** hay
   al menos una observación, **Then** cada familia tiene su gráfico (pipeline, canal, cobertura
   del catálogo, aprobaciones, salud de correo, hitos, novedades). La especie se cuenta en
   unidades, nunca en pesos (ADR-031).

---

### User Story 2 - Que las excepciones se vean solas (Priority: P1)

Un gráfico no alcanza si hay que cazar el problema. La dueña tiene que ver **arriba** lo que
pide una decisión: conciliación atrasada, reservas por vencer, cuentas en cola, correos
fallidos, gastos sin comprobante, cuentas bancarias sin publicar.

**Why this priority**: "señales dónde puedas" es la mitad del pedido, y es lo que evita que el
tablero sea un póster.

**Independent Test**: construir un `MetricsFacts` de tesoro en el dominio (sin base) y afirmar
cada señal por el motivo correcto; en la pantalla, cada señal enlaza a la sección donde se
actúa.

**Acceptance Scenarios**:

1. **Given** una conciliación de más de treinta días, **When** se arman las señales, **Then**
   aparece una de tono `danger` que enlaza a `/admin/aportes`. **Given** que nunca se concilió,
   **Then** la señal es de tono `warning` y no se finge un dato viejo (misma distinción que
   FR-010).
2. **Given** reservas `reserved` que vencen en tres días o menos, o ya vencidas según
   `expires_at`, **When** se arman las señales, **Then** hay una de tono `danger` hacia
   `/admin/donaciones`. Las `expired` ya cerradas suman una de tono `warning`.
3. **Given** cuentas `pending`, gastos vivos sin comprobante, correos `failed`, o ninguna cuenta
   bancaria publicada, **When** se arman las señales, **Then** cada una aparece con su conteo y
   su enlace (`/admin/donantes`, `/admin/gastos`, `/admin/donaciones` no aplica a correo —el
   detalle operativo se nombra en el cuerpo—, `/admin/cuentas`).
4. **Given** que no hay ninguna excepción, **When** se renderiza el tablero, **Then** no se
   inventa un aviso: se dice que no hay señales pendientes.

---

### Edge Cases

- Sin base o sin campaña: las mismas pantallas `SinDatos` que el resto del backoffice. No un
  tablero en cero.
- Monedas distintas a la del objetivo: se listan aparte, sin convertir, y no entran a los
  gráficos de la moneda principal.
- Un aporte o un gasto anulado no suma. El tablero puede avisar si la plata anulada es una parte
  grande de lo registrado (más del 10 % en la moneda principal).
- Fallo de lectura: aviso de error, no un tablero vacío (principio XII).
- El HTML del tablero no incluye correos, nombres de donantes ni notas privadas.

---

## Requirements *(mandatory)*

- **FR-601**: El backoffice MUST ofrecer `/admin/metricas` a quien tiene `metricas.leer`.
- **FR-602**: `metricas.leer` MUST ser un permiso de `owner` y de nadie más. La navegación MUST
  ocultar el enlace al resto de los roles.
- **FR-603**: El tablero MUST mostrar el libro interno (recibido y gastado no anulados, saldo,
  objetivo interno si está) y MUST NOT publicar esos montos en ninguna página pública.
- **FR-604**: MUST haber gráficos SVG propios —sin librería nueva— para cada familia con
  observaciones: flujo semanal, acumulado contra el objetivo, gastos por categoría, pipeline de
  reservas, canal de cobertura, cobertura del catálogo, aprobaciones, correos, hitos,
  novedades.
- **FR-605**: Cada gráfico MUST ir acompañado de una tabla con las mismas cifras. El color MUST
  NOT ser el único indicador (WCAG 1.4.1).
- **FR-606**: El dominio MUST derivar señales con umbral explícito y `now` inyectable. Donde hay
  un umbral de referencia (objetivo, promedio semanal), el gráfico MUST dibujarlo.
- **FR-607**: Un gráfico sin observaciones MUST omitirse. Un 0 % sin denominador MUST NOT
  dibujarse. Un cero observado (conteo medido) MAY mostrarse.
- **FR-608**: El snapshot del tablero MUST NOT incluir correos, nombres, notas ni destinatarios.
- **FR-609**: Las cantidades en especie MUST NOT convertirse a dinero ni sumarse al libro
  (ADR-031).
- **FR-610**: Los eventos de ADR-010 MUST NOT aparecer en este tablero.
- **FR-611**: `/admin` MUST, para `owner`, resumir las señales de tono `warning` y `danger` con
  enlace al tablero. Si la lectura falla, MUST decirlo.

---

## Success Criteria *(mandatory)*

- **SC-601**: Un `owner` con el fixture ve `/admin/metricas` con el libro, al menos dos gráficos
  con tabla, y las señales que esos datos disparan. axe limpio en esa pantalla.
- **SC-602**: Un `admin` autenticado que pide `/admin/metricas` termina en `/admin/sin-permiso`.
  Sin sesión, la ruta manda a `/admin/login` igual que el resto de las secciones.
- **SC-603**: Los tests de dominio cubren cada señal por el motivo correcto (vistos en rojo
  antes) y la agregación semanal no mezcla monedas ni incluye anulados.
- **SC-604**: `npm run verify` en verde. No hay dependencia nueva de gráficos.

---

## Decisiones

| Decisión | Valor | Por qué |
|---|---|---|
| Quién lo ve | sólo `owner` | Es el pedido; ampliar el permiso es barato |
| Gráficos | SVG propio | Constitución: una dependencia se justifica contra escribir el código |
| Analítica de visitas | fuera | ADR-010: no está en la base y no se copia |
| Especie | unidades | ADR-031 |
| Semanas vacías dentro de las últimas 12 | sí, si hubo algún movimiento en la ventana | Cero observado, no ejemplo |
