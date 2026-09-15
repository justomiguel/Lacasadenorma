# ADR-030 · El muro se expone por privilegio de columna, y borrar la cuenta anonimiza en lugar de borrar

**Estado**: Aceptada · **Fecha**: 2026-09-13

## Contexto

Una reserva tiene, en la misma fila, lo que se publica y lo que no se publica nunca:

| Columna | Público |
|---|---|
| `donor_display_name`, `quantity`, `fulfilled_at`, `item_id` | Sí, si la persona eligió aparecer |
| `user_id` | **Nunca** |
| `donor_note` (mensaje privado a la familia) | **Nunca** |
| `is_anonymous`, `expires_at`, `cancel_reason` | **Nunca** |

Es la primera tabla del proyecto con esa mezcla. Hasta ahora lo público y lo privado estaban en
tablas distintas —los aportes no se publican nunca, los gastos sí— y eso hacía que la decisión de
visibilidad se tomara a nivel de tabla, que es fácil de revisar.

El antecedente que hay que no repetir está en `data-model.md`: `campaign_totals` necesita
`security_invoker = true` porque **las vistas de Postgres bypasean RLS por defecto**, y una vista sin
esa opción sobre `contributions` publicaría los aportes uno por uno. La misma trampa, apuntada a una
tabla con nombres y correos, publica personas.

Y hay una pregunta que no es técnica: qué pasa cuando alguien que donó pide que borren su cuenta. Los
datos personales tienen que irse. Lo que llegó a la obra no puede irse, porque entonces el catálogo
diría que faltan cuarenta chapas de las que treinta ya están en el techo.

## Decisión

**Lo que el público puede ver de una reserva se define con `grant select (columnas)`, no con la
consulta que escriba la aplicación.**

```sql
grant select (id, item_id, quantity, donor_display_name, fulfilled_at)
  on public.donation_pledges to anon;
```

`anon` **no tiene el privilegio** de nombrar `user_id`, `donor_note` ni `is_anonymous`. No es que la
consulta no los pida: es que si los pidiera, Postgres la rechazaría. Un `select *` escrito de apuro
en un repositorio dentro de seis meses falla con "permission denied for column" en lugar de publicar
un correo.

Sobre eso, una policy para `anon` que admite las filas publicables —reservada o entregada, no
anónima— y dos vistas con `security_invoker = true`: `donation_wall` recorta a `fulfilled_at is not
null` (quien ayudó, D2) y `donation_catalog_claims` muestra también la reserva con nombre (FR-255).
Las dos se evalúan con los privilegios de quien consulta y heredan las dos barreras.

Las tres capas responden a tres preguntas distintas, y por eso están las tres: la policy dice **qué
filas**, el privilegio de columna dice **qué columnas**, y `security_invoker` dice **que la vista no
las sortee**.

**El muro muestra sólo lo entregado.** Una reserva no llega al muro; una donación confirmada sí. No
es una decisión de privacidad sino de veracidad: un muro donde figura quien prometió y no cumplió
deja de valer como prueba social, y crea un incentivo perverso trivial de explotar (reservar,
aparecer, abandonar). Es la decisión D2 de la especificación, y la dueña del proyecto puede
revertirla.

**El anonimato es el valor por defecto.** `is_anonymous` es `not null default true`. Aparecer con
nombre requiere una acción explícita, y la restricción
`check (is_anonymous or donor_display_name is not null)` hace imposible una fila que diga "publicá mi
nombre" sin nombre que publicar.

**Borrar la cuenta anonimiza la donación.** `user_id` referencia `auth.users` con
`on delete set null`, y un disparador pone `is_anonymous = true` y `donor_display_name = null` en la
misma operación. La donación sobrevive sin dueño: la cantidad entregada sigue siendo cierta y el
nombre desaparece del muro. Lo que se borra son los datos personales; lo que se conserva es un hecho
sobre la obra.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Una vista `security definer` que proyecte sólo lo público | Es exactamente la trampa de `campaign_totals` al revés: la vista pasa por encima de RLS, y la seguridad queda en que la lista de columnas de la vista nunca cambie mal. Una línea de más en un `select` publica un correo |
| Filtrar en el repositorio de TypeScript | La frontera de datos personales viviría en el código de aplicación, contra el principio V. Y no protege de ningún otro camino a la base: PostgREST, `psql`, una capacidad de agente futura |
| Dos tablas, una pública y una privada | Duplica la reserva y abre la posibilidad de que discrepen. El estado de una donación pasaría a existir en dos lugares |
| Una columna `public_name` que se llena sólo si no es anónima | Es lo que se hace, pero sin privilegio de columna sería la aplicación la que decide llenarla. Con el `grant`, además, `anon` no puede ni ver `is_anonymous` |
| Guardar un hash del correo para deduplicar donantes en el muro | Un hash de correo es un identificador personal, y no hace falta: dos donaciones de la misma persona pueden aparecer como dos líneas |
| Borrado real de la donación al borrar la cuenta | Rompe el historial de lo que llegó a la obra. El catálogo empezaría a pedir de nuevo cosas que ya están puestas |
| Conservar el nombre "porque ya era público" | La persona pidió que se borre. Un dato que fue público no deja de ser suyo |

## Consecuencias

**Buenas.** La propiedad "ninguna página pública contiene un correo ni un identificador de cuenta"
(SC-204) pasa a estar impuesta por el motor. Se prueba con `column_privs_are` de pgTAP, que verifica
que el conjunto de columnas legibles por `anon` es **exactamente** el declarado: si alguien agrega una
columna sensible y la otorga de más, la prueba falla nombrando la columna.

**Malas y aceptadas.**

- **Una columna nueva no se otorga sola, y eso corta en los dos sentidos.** Es la propiedad buscada,
  y también significa que agregar un campo al muro son dos lugares: la migración y el `grant`. El
  síntoma cuando se olvida es un "permission denied for column" en producción, no un dato faltante;
  la prueba de privilegios lo cachea antes.
- Los privilegios de columna **no se ven** en la definición de la tabla. Alguien leyendo el esquema no
  se entera de que `anon` sólo puede leer cinco columnas hasta que lee el `grant`. Queda como
  comentario en la migración y en `data-model.md`.
- Una donación entregada cuya cuenta se borró queda **huérfana y anónima para siempre**: no hay a
  quién agradecerle si después aparece. Es la consecuencia de que el borrado sea real.
- El muro no acumula nada por persona —ni total donado, ni cantidad de donaciones— porque hacerlo
  requeriría agrupar por cuenta, y agrupar por cuenta es justo lo que el privilegio de columna impide.
  Si alguna vez se quiere "quienes más ayudaron", hay que decidirlo de nuevo y con cuidado.
