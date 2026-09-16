# ADR-050 · Acciones del catálogo: ver, editar la fila y borrar, en el backoffice

**Estado**: Aceptada · **Fecha**: 2026-09-16

Enmienda a [ADR-044](./044-tabla-del-catalogo-y-quiero-donar.md) (la tabla de
lo que falta) y a [ADR-037](./037-chrome-de-cuenta.md) (el HTML público no se
personaliza). Cubre FR-258.

## Contexto

El listado público `/catalogo` es una tabla: qué falta, cuánto, si alguien la
tomó, el estimado y «Quiero donar». Quien opera la campaña —el `owner`— necesita
sobre **esa misma lista** tres acciones de planilla: ver el detalle, editar esa
fila, borrar.

Hoy `/admin/catalogo` no es una tabla. Es una lista de registros con un
`<details>` «Editar este ítem». No hay ver. No hay borrar, aunque la policy
`donation_items_delete` ya se lo da a `admin` y `owner`.

Meter esas acciones en `/catalogo` público chocaría con dos decisiones ya
pagadas: el HTML público es idéntico con o sin sesión y se cachea (ADR-037,
SC-213), y «Quiero donar» al lado de un tacho es un error caro.

## Decisión

1. **Las acciones viven en `/admin/catalogo`.** Esa pantalla pasa a ser una
   tabla, la misma lectura que `/catalogo`: qué, cantidad, si está publicado,
   el estimado, y una columna **Acciones**. El alta sigue arriba, en «Agregar
   un ítem». El HTML de `/catalogo` no cambia.
2. **Tres iconos de acción (`ICON_ACTION`, 44 px), no identificadores.** Ver
   (ojo) abre la ficha pública `/catalogo/{id}`. Editar (lápiz) pone **esa
   fila** en modo edición con `?editar={id}`: un GET, sin JavaScript. Borrar
   (tacho) abre un `<details>` de confirmación y manda un POST. El pictograma
   no reemplaza el nombre: el nombre accesible va en un `sr-only`.
3. **Borrar es `catalogo.borrar`: `admin` y `owner`.** Espeja
   `donation_items_delete` (`has_min_role('admin')`). El `editor` crea, edita y
   ve; no ve el tacho. La frontera sigue siendo la policy: el permiso existe
   para no ofrecer el botón que la base va a negar.
4. **Un ítem con reservas o entregas no se borra.** `donation_pledges.item_id`
   es `on delete restrict` y las reservas no se borran (FR-222). Postgres
   responde `23503`; la aplicación lo traduce a un mensaje en castellano
   (`CatalogItemReferencedError`). Despublicar lo saca del sitio. Un ítem sin
   ninguna reserva —un alta mal cargada, un duplicado— sí se borra, con rastro
   `donation_item.deleted`.
5. **Esto no es un registro financiero.** «Nada se borra» sigue valiendo para
   aportes, gastos y reservas: se anulan. El catálogo es el inventario de lo
   que falta. Borrar una fila que nadie tomó no borra plata ni un compromiso.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Acciones en `/catalogo` según el rol | Personaliza el HTML público, rompe el caché (ADR-037) y pone borrar al lado de donar |
| Island de cliente que inyecta los iconos al hidratar | Sin JavaScript el owner no opera. El backoffice ya existe para esto |
| Seguir con `RecordList` y sumar dos `RowAction` | El pedido es una columna de iconos en la tabla, no tres textos subrayados |
| Soft-delete con `voided_at` | El catálogo no es el libro. Un ítem que nadie tomó no tiene que quedar como anulado |
| Dejar borrar también al editor | La policy ya lo niega. Un botón que falla al enviarse es peor que un botón que no aparece |
| Cascada sobre las reservas | FR-222: una reserva no se borra. El `RESTRICT` es esa regla en la base |

## Consecuencias

**Buenas.** El owner recorre lo que falta como planilla: mira la ficha, corrige
esa fila, tira un alta equivocada. El editor sigue cargando sin poder borrar.
El sitio público no se entera.

**Malas y aceptadas.**

- Un ítem que alguna vez se reservó —aunque la reserva esté cancelada o
  vencida— no se puede borrar: la fila de `donation_pledges` sigue ahí. Se
  despublica. Es el costo de no borrar compromisos.
- Ver un borrador abre `/catalogo/{id}` y responde 404: esa ficha no está en
  el sitio. Publicar y volver a ver. No hay una ficha privada de preview.
- `?editar=` recarga la página. Es el precio de que el modo edición funcione
  sin JavaScript.
