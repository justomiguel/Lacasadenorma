# ADR-047 · Tablero de métricas del owner, con gráficos propios y señales

**Estado**: Aceptada; enmendada por ADR-048 · **Fecha**: 2026-09-16

## Contexto

El backoffice ya tiene las cifras del libro en `/admin` y una pantalla por operación. Lo que no
tiene es **una sola vista que recorra todo lo medible** y avise cuando algo pide una decisión:
conciliación atrasada, reservas por vencer, cuentas del público en cola, correos fallidos, gastos
sin comprobante.

El pedido es de producto: un tablero para quien opera la campaña (`owner`), con gráficos, y
señales donde un umbral ya existe. No es analítica de visitas: eso vive afuera, sin cookies ni
personas (ADR-010), y no está en Postgres.

Tres tensiones:

1. Una librería de gráficos (Recharts, Chart.js) agrega una dependencia de UI. La constitución
   pide justificar cada dependencia contra escribir el código, y el backoffice ya rechazó el
   cromo de SaaS.
2. Juntar todas las lecturas en una pantalla **no puede** bajar el privilegio: nombres, correos y
   notas de reserva no hacen falta para graficar. Si el snapshot los trae, un descuido de
   presentación los publica en el HTML.
3. Un cero en este sitio es una afirmación. Un gráfico que inventa semanas, montos o un 0%
   porque falta el denominador rompe el principio VIII.

## Decisión

1. **`/admin/metricas` es una pantalla de `owner`.** El permiso es `metricas.leer`, sólo de
   `owner`. No es un recorte de `finanzas.leer`: junta colas operativas (donantes, reservas,
   correos, cuentas bancarias) que un auditor recorre sección por sección, y que un admin opera
   desde cada lista. El tablero es el lugar desde el que se decide qué mirar primero.
2. **Los gráficos se dibujan con Recharts** (ADR-048), en un componente cliente, con los tokens
   del tema. Cada gráfico es una figura con título, y la tabla de datos acompaña al dibujo: un
   gráfico que sólo se distingue por color no existe para quien no lo ve.
3. **Las señales se derivan en el dominio**, con `now` inyectable. Un umbral que ya existe se
   reutiliza: treinta días de conciliación (FR-010), tres días del recordatorio de reserva
   (`PLEDGE_REMINDER_DAYS`). Un gráfico puede llevar una **señal de referencia** (promedio
   semanal, objetivo interno) dibujada como línea, no como cifra suelta.
4. **El snapshot no trae datos personales.** Montos, cantidades, estados, fechas. Ni correos, ni
   nombres, ni notas, ni destinatarios de `email_deliveries`.
5. **La especie no entra al libro** (ADR-031). El catálogo y las reservas se grafican en unidades,
   nunca convertidas a pesos.
6. **Un gráfico sin observaciones se omite.** Un conteo vacío de una categoría que sí se midió
   (cero reservas vencidas habiendo otras reservas) sí se muestra: es un cero observado, no un
   ejemplo.

La analítica de visitas **no** se copia a Postgres. El tablero la lee del Stats API del
proveedor cuando hay clave (ADR-048). Sin clave, la sección se omite.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Librería de gráficos | Superada por ADR-048: el pedido pide librería; la tabla al pie se queda |
| Abrirlo a `admin` y `auditor` | El pedido es del owner. Un auditor verifica sección por sección; un admin opera las listas. Ampliar el permiso es un cambio de una línea el día que haga falta |
| Guardar eventos de visita en Postgres para graficarlos | ADR-010 lo descartó: escribe en cada visita y mezcla alcance con el libro. ADR-048 lee el proveedor, no la base |
| Un iframe a Plausible/Umami | El tablero mezclaría dos fuentes con dos privilegios. ADR-048 lee el Stats API en el servidor |
| Reusar `listPledges` / `listAccounts` | Traen correo y notas. El snapshot tiene su puerto para no pagar ese costo ni ese riesgo |

## Consecuencias

**Buenas.** El owner ve el pulso y las excepciones en una pantalla. El dominio de señales se
prueba sin base. Los correos no viajan al HTML del tablero.

**Malas y aceptadas.**

- Quien no es `owner` no ve el tablero, aunque ya pueda leer las mismas cifras por separado.
- Sin clave de Stats API, el tablero no habla de visitas aunque el script público esté midiendo.
  La señal lo dice. No se finge un 0.
- Recharts agrega hover. La tabla al pie sigue siendo la fuente para quien no lo ve (ADR-048).
- El atajo **Métricas** vive en el drawer público, no en el encabezado (ADR-037, FR-615). El
  snapshot de chrome expone `owner` además de `staff`.
