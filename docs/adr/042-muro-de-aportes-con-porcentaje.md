# ADR-042 · El muro de aportes publica el nombre, y el porcentaje sólo si se prende

**Estado**: Aceptada · **Fecha**: 2026-09-15 · El % en especie de un ítem es [ADR-052](./052-porcentaje-de-ese-item.md), no éste.

Enmienda a [ADR-016](./016-totales-recibidos-agregados.md): el detalle de un aporte sigue
sin camino de lectura pública; el **nombre**, con consentimiento, sí. Enmienda a
[FR-014](../../specs/001-sitio-publico-campana/spec.md): la identidad puede publicarse; el
monto, no. Enmienda a [ADR-040](./040-plata-publica-en-porcentaje.md): el porcentaje de un
aporte sobre lo ya recibido es la única cifra que esa línea puede mostrar, y sólo cuando
admin u owner lo prenden.

## Contexto

`/quienes-ayudaron` nombra a quien trajo material y eligió aparecer. Quien aportó en
plata no figuraba: FR-014 prohibía publicar aportes individuales **e** identidad, y
ADR-016 cerró la tabla `contributions` para `anon` —ni policy, ni privilegio, ni
código que la lea—.

El pedido nuevo es otro: **sí una lista de nombres** de quienes aportaron dinero y
consintieron aparecer, y un interruptor en el backoffice para mostrar o no **qué
porcentaje representa cada uno de lo que ya llegó**. El monto sigue sin publicarse.

Eso choca con dos tentaciones que este sitio ya tuvo:

1. Darle `select` a `anon` sobre `contributions` y filtrar columnas en la consulta.
   La frontera quedaría en la aplicación, que es exactamente lo que ADR-016 descartó.
2. Calcular el porcentaje en la página y dejarlo de devolver cuando el interruptor
   está apagado. PostgREST seguiría pudiendo pedir la cifra.

El denominador honesto es el mismo que ADR-040 ya usa: `campaign_totals.received_minor`
en la misma moneda. No es el objetivo de la obra. No se convierten monedas. Un
truncado a entero menor a 1 no se publica como 0%: se omite.

## Decisión

**El nombre de un aporte en plata puede ser público. El monto, nunca. El porcentaje,
sólo si la campaña lo prende, y lo calcula la base.**

1. **`campaigns.publish_contribution_share boolean not null default false`.** Un solo
   interruptor por campaña, escribible por admin y owner (`campana.escribir`). Apagado
   es el caso seguro: la lista, si hay nombres, muestra sólo el nombre.
2. **Consentimiento en la fila.** `is_anonymous` sigue en `true` por defecto.
   `contributor_display_name` deja de estar reservada: se escribe cuando hay
   consentimiento. `check (is_anonymous or contributor_display_name is not null)`
   hace imposible una fila que diga "publicá mi nombre" sin nombre. La nota de
   conciliación (`source_note`) sigue siendo interna y no se publica.
3. **Vista `contribution_wall`**, alimentada por `private.contribution_wall_for(uuid)`
   `security definer` con `search_path` fijado, el mismo patrón que
   `campaign_totals_for` (ADR-016). Devuelve `id`, `campaign_id`,
   `donor_display_name`, `received_at`, `currency`, `percent_of_received`.
   **Nunca `amount_minor`.** `anon` sigue sin `SELECT` sobre `contributions`.
4. **El porcentaje se decide en la función, no en la interfaz.** Si el interruptor
   está apagado, si no hay recibido en esa moneda, o si el truncado
   `(amount_minor * 100) / received_minor` es menor a 1, la columna es `null`.
   PostgREST no puede pedir un porcentaje que la función no devuelve.
5. **`/quienes-ayudaron` suma una sección de plata.** El muro en especie no
   toma este denominador: su % es de ese ítem (ADR-052). Las capacidades para
   agentes no ganan nombres ni porcentajes de aportes (FR-242, amenaza A5):
   que estén en la página no los vuelve aptos para una API.

El libro interno no cambia: `bigint` + moneda, anulaciones, SC-007 sobre los montos.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| `grant select` de algunas columnas de `contributions` a `anon` | Es el patrón del muro en especie (ADR-030), y acá publicaría `received_at` junto al nombre sobre una tabla que también tiene el monto. Un `select *` o un embed de PostgREST expondría la cifra. La frontera no puede estar en el `grant` de la tabla que guarda el dinero |
| Calcular el porcentaje en TypeScript y ocultarlo en la UI | El interruptor apagado no protegería a quien consulte la vista directo |
| Publicar el porcentaje siempre que hay nombre | El pedido es un interruptor. Apagado es sólo el nombre |
| Usar el objetivo de recaudación como 100% | No está verificado (ADR-040). El 100% conocido es lo que ya llegó |
| Convertir monedas para un único porcentaje | No hay tipo de cambio explícito y fechado |
| Inventar nombres en el fixture de desarrollo | La constitución lo prohíbe. La lista pública arranca vacía; el e2e crea el nombre desde el backoffice |

## Consecuencias

**Buenas.** Quien aportó en plata y eligió aparecer tiene el mismo lugar que quien
trajo material. El equipo decide si esa línea habla en partes de lo ya conocido o
sólo en nombre. El monto no tiene camino de lectura pública: no hay columna, no hay
privilegio, no hay código que lo pida.

**Malas y aceptadas.**

- Hay una función `security definer` más. Devuelve identidad consentida y un
  entero opcional, no un monto; acepta un `uuid`; tiene `search_path` fijado; y
  no devuelve filas de una campaña en borrador.
- Un aporte chico sobre un total grande no muestra porcentaje aunque el
  interruptor esté prendido. Es honesto: un 0% sería una cifra falsa.
- El nombre, una vez publicado, identifica. El consentimiento se registra en la
  fila y se puede revertir (el aporte pasa a anónimo y el nombre se borra de la
  columna pública). El rastro de auditoría anota *si* apareció, no el nombre:
  el registro lo leen más roles que la tabla.
