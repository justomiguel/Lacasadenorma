# Fase 1 — Modelo de datos

Continúa `specs/001-sitio-publico-campana/data-model.md`, con sus dos reglas intactas —monto entero
en unidad mínima con su moneda, y nada financiero se borra— y tres propias:

1. **La sobreventa no es un estado alcanzable.** No "no se produce": no existe. Lo garantiza un
   `check` de tabla, no el código que la toca ([ADR-029](../../docs/adr/029-reserva-sin-sobreventa.md)).
2. **Lo que el público ve de una reserva lo decide un `grant` de columnas**, no la consulta que
   escriba la aplicación ([ADR-030](../../docs/adr/030-muro-por-privilegio-de-columna.md)).
3. **Una donación en especie no es plata**: nada de acá alimenta `campaign_totals`
   ([ADR-031](../../docs/adr/031-donacion-en-especie-no-es-plata.md)).

Todo el DDL de este documento se levantó y se atacó sobre PostgreSQL 17.11 local antes de escribirlo
(`research.md` §8).

---

## 1. Lo que se agrega

```
auth.users
   └── donor_profiles        (nombre público, idioma; una fila por cuenta que participa)

campaigns
   └── donation_items        (qué falta, cuánto, cuánto reservado, cuánto entregado)
          └── donation_pledges   (quién se comprometió a qué; NO públicas salvo cinco columnas)

email_deliveries             (cada intento de envío; sólo se agrega)
donation_offers              (aviso por teléfono: nombre y número, nunca públicos)
```

Vistas: `donation_catalog` (lo que falta, público), `donation_catalog_claims` (quién tomó y eligió aparecer) y `donation_wall` (quién ayudó, público).

Funciones: `claim_donation_item`, `offer_donation_item`, `cancel_donation_pledge`,
`fulfill_donation_pledge`, `release_expired_holds`, `record_email_delivery`.

**No se toca** ninguna tabla existente. `campaign_totals` queda igual, y eso es una decisión, no una
omisión (ADR-031).

---

## 2. Tablas

Convenciones heredadas: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not
null default now()`, `published_at` nulo = borrador.

### `donor_profiles` — la cuenta del público

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK → `auth.users` `on delete cascade` | La misma clave que la cuenta: no hay identificador nuevo que filtrar |
| `display_name` | `text` **nullable** | Nulo hasta que la persona elija uno o entre con una red que lo entregue. **No** se deriva del correo (FR-230) |
| `locale` | `text not null default 'es'` `check (locale in ('es','en'))` | Idioma de los correos (FR-232) |
| `default_anonymous` | `boolean not null default true` | Preferencia; cada reserva guarda la suya |
| `approval_status` | `text not null default 'pending'` | `pending` \| `approved` \| `declined`. Confirmar el correo **no** habilita (ADR-033) |
| `reviewed_at`, `reviewed_by` | | Nulos exactamente cuando el estado es `pending` |
| `review_note` | `text` nullable | Motivo del rechazo, si alguien lo dejó. No es público |
| `portrait_path` | `text` **nullable** | Ruta en el bucket privado `avatares`. Nulo = no subió foto. **No se publica** (ADR-037, FR-246) |
| `created_at`, `updated_at` | | |

**Por qué existe y no se usa `auth.users` directo**: `authenticated` no puede leer `auth.users`, y no
debería. Esta tabla guarda lo poco que la aplicación necesita y nada más. El correo **no se copia**:
vive en `auth.users` y viaja en el claim `email` del token de su dueño.

**Invariante**: `default_anonymous = false` requiere `display_name` no vacío. Se valida en la
aplicación y se refuerza en la reserva, que es donde importa.

**Quién escribe el estado.** El `insert` exige `pending`. El `update` de la persona **no incluye**
`approval_status`: es privilegio de columna, no una policy. La única vía de cambio es
`public.review_donor_account()`, acotada a `has_min_role('admin')` (ADR-033).

### `donation_items` — el catálogo

| Columna | Tipo | Notas |
|---|---|---|
| `campaign_id` | `uuid` → `campaigns` `on delete cascade` | |
| `budget_item_id` | `uuid` **nullable** → `budget_items` `on delete set null` | Para que el catálogo y el presupuesto hablen de la misma obra (FR-213) |
| `title` | `text` | "Chapas del techo" |
| `description` | `text` nullable | Qué sirve y qué no: medida, material, calidad |
| `unit` | enum `donation_unit` | `unidad` \| `metro` \| `metro_cuadrado` \| `metro_cubico` \| `bolsa` \| `litro` \| `juego` |
| `category` | enum `donation_item_category` | `materiales` \| `aberturas` \| `instalaciones` \| `electrodomesticos` \| `muebles` \| `ajuar` (FR-253) |
| `needed_quantity` | `integer not null` | |
| `reserved_quantity` | `integer not null default 0` | **Derivada, y la mueven sólo tres funciones** |
| `fulfilled_quantity` | `integer not null default 0` | Ídem |
| `estimated_unit_amount_minor` | `bigint` **nullable** | Valor de referencia. La ficha lo publica etiquetado (ADR-041); el listado y el libro no |
| `currency` | `char(3)` **nullable** | Nula exactamente cuando el monto es nulo |
| `photo_media_id` | `uuid` nullable → `media` | Foto real subida desde el backoffice. Si es nula, la ficha usa la de referencia del título (ADR-043, FR-212); si tampoco hay, se reserva el espacio |
| `sort_order` | `integer` | Orden editorial: primero lo que más falta |
| `published_at` | `timestamptz` nullable | Nulo = no se ofrece (FR-215) |

```sql
constraint donation_items_needed_positive check (needed_quantity > 0),

-- La garantía de FR-211. Verificada atacándola con un update de superusuario.
constraint donation_items_not_oversubscribed check (
  reserved_quantity >= 0
  and fulfilled_quantity >= 0
  and reserved_quantity + fulfilled_quantity <= needed_quantity
),

-- Un monto sin moneda no es un monto (constitución § Dinero).
constraint donation_items_value_with_currency check (
  (estimated_unit_amount_minor is null) = (currency is null)
),
constraint donation_items_value_positive check (
  estimated_unit_amount_minor is null or estimated_unit_amount_minor > 0
)
```

**Sobre las dos columnas derivadas.** Son redundantes con la suma de las reservas activas, y esa
redundancia es el precio de poder poner un `check`: no se puede restringir un agregado de otra tabla.
Se paga con una prueba pgTAP que verifica que el contador coincide con la suma después de reservar,
cancelar, vencer y entregar (ADR-029, consecuencias).

### `donation_pledges` — el compromiso

| Columna | Tipo | Notas |
|---|---|---|
| `item_id` | `uuid` → `donation_items` `on delete restrict` | `restrict`: un ítem con historia no se borra |
| `user_id` | `uuid` **nullable** → `auth.users` `on delete set null` | Nulo = la cuenta se borró (FR-240), o es una reserva por teléfono sin cuenta (ADR-051) |
| `quantity` | `integer` `check (> 0)` | |
| `status` | enum `pledge_status` | `reserved` \| `fulfilled` \| `cancelled` \| `expired` |
| `is_anonymous` | `boolean not null default true` | **El default es el anonimato** (FR-225) |
| `donor_display_name` | `text` nullable | En el mail, lo elige su dueña en `/cuenta`. En el teléfono, se carga en el sí si aceptaron (FR-262) |
| `donor_note` | `text` nullable | Mensaje privado a la familia. **Nunca público** |
| `cover_channel` | enum `donation_cover_channel` `not null default 'bring'` | `bring` \| `transfer` \| `mercadopago` \| `paypal`. No se publica (ADR-041) |
| `expires_at` | `timestamptz not null` | `now() + 14 días`, en un solo lugar del código |
| `reminded_at` | `timestamptz` nullable | Que el recordatorio salga una sola vez (FR-235) |
| `fulfilled_at`, `cancelled_at`, `cancel_reason` | | |
| `created_at` | | |

```sql
constraint donation_pledges_quantity_positive check (quantity > 0),

-- "Publicá mi nombre" sin nombre que publicar es un estado imposible.
constraint donation_pledges_named_when_public check (
  is_anonymous
  or (donor_display_name is not null and length(btrim(donor_display_name)) > 0)
),

-- Nada se borra: se cancela con motivo (FR-222).
constraint donation_pledges_cancel_has_reason check (
  (cancelled_at is null) = (cancel_reason is null)
),
constraint donation_pledges_fulfilled_has_date check (
  (status = 'fulfilled') = (fulfilled_at is not null)
)
```

**Máquina de estados.** Las únicas transiciones legales, en la base por las funciones y en
`src/domain/pledge-status.ts` para que la interfaz no ofrezca lo imposible:

```
reserved ──fulfill──▶ fulfilled   (terminal)
    │
    ├────cancel───▶ cancelled     (terminal, con motivo)
    └────expire───▶ expired       (terminal)
```

Desde un estado terminal no se sale. Una donación entregada por error se corrige con una fila nueva y
una cancelación con motivo, igual que un aporte mal registrado no se edita.

`offer_donation_item()` es la otra vía de insert: crea una reserva con `user_id` nulo, nombre
público y teléfono de contacto, y una fila en `donation_offers`. `claim_donation_item()` sigue
siendo la vía con sesión. Nadie tiene `INSERT` sobre `donation_pledges`.

### `donation_offers` — aviso por teléfono, sin cuenta

| Columna | Tipo | Notas |
|---|---|---|
| `item_id` | `uuid` → `donation_items` `on delete restrict` | |
| `pledge_id` | `uuid` nullable → `donation_pledges` `on delete restrict` | La reserva que sostiene el ítem. Nulo sólo en filas de prueba |
| `contact_name` | `text not null` | Nombre para llamar. Nunca público |
| `contact_phone` | `text not null` | Teléfono para llamar. Nunca público |
| `created_at` | | |

Único `(item_id, contact_phone)`: un mismo teléfono no deja dos avisos del mismo ítem. `anon` no
tiene `SELECT`. La única vía de insert es `offer_donation_item()`, concedida a `anon` y
`authenticated`.

### `email_deliveries` — qué se intentó mandar

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `bigint generated always as identity` | |
| `kind` | `text` `check (kind ~ '^[a-z_]+\.[a-z_]+$')` | Forma, no lista: `account.*`, `pledge.*`, `staff.*` (ADR-028, ADR-033) |
| `pledge_id` | `uuid` nullable → `donation_pledges` | Nulo en los correos de cuenta |
| `about_user_id` | `uuid` nullable → `auth.users` | El sujeto de un correo de cuenta. Nulo en los de reserva |
| `recipient` | `text` | **La resuelve la función**, no quien llama (ADR-028). Nulo si `kind` es `staff.*` |
| `status` | `text` `check (status in ('sent','failed','skipped'))` | `skipped` = sin credencial configurada |
| `provider_id` | `text` nullable | El `id` que devuelve Resend, para cruzar con su consola |
| `error` | `text` nullable | Sin cuerpo del mensaje, sin token, sin secretos (principio X) |
| `occurred_at` | `timestamptz` | |

Sin policy de `update` ni de `delete`, como `audit_log`: la ausencia es la garantía.

---

## 3. Vistas públicas

```sql
create view public.donation_catalog with (security_invoker = true) as
select
  i.id, i.campaign_id, i.budget_item_id, i.title, i.description, i.unit,
  i.needed_quantity,
  i.needed_quantity - i.reserved_quantity - i.fulfilled_quantity as remaining_quantity,
  i.fulfilled_quantity, i.photo_media_id, i.sort_order, i.category,
  i.estimated_unit_amount_minor, i.currency
from public.donation_items i
where i.published_at is not null;
```

`remaining_quantity` se calcula en la base (FR-210) y **nunca** es negativo, porque el `check` de la
tabla lo impide. El estimado entra a la vista para la ficha (ADR-041); sigue fuera del libro. El
`where published_at is not null` es FR-215 en la vista, además de la policy sobre la tabla: un
editor con sesión no ve borradores por este camino.

```sql
create view public.donation_wall with (security_invoker = true) as
select p.id, p.item_id, p.quantity, p.donor_display_name, p.fulfilled_at
from public.donation_pledges p
where p.fulfilled_at is not null;
```

Cinco columnas, las mismas cinco del `grant`. La vista no nombra `status` ni `is_anonymous`:
`anon` no tiene privilegio para esas columnas. El recorte a lo **entregado** usa `fulfilled_at`,
que sí está otorgado, para que una reserva con nombre no llegue al muro (D2) aunque la policy de
`anon` ahora admita reservas con nombre —las necesita el catálogo (FR-255). Lo anónimo lo sigue
filtrando la policy.

```sql
create view public.donation_catalog_claims with (security_invoker = true) as
select p.id, p.item_id, p.quantity, p.donor_display_name, p.fulfilled_at
from public.donation_pledges p;
```

Las mismas cinco columnas. `fulfilled_at` nulo es reserva; con fecha, ya llegó. Lo anónimo no
existe para `anon`.

`security_invoker = true` en las tres, y no es opcional: sin eso la vista corre con los privilegios de
su dueño y sortea RLS (`research.md` §6).

---

## 4. Matriz de visibilidad ampliada

`donante` es la persona nueva: autenticada, **sin fila en `user_roles`**. Es la columna que hay que
leer con atención, porque es la que antes no existía.

| Tabla | `anon` | **`donante`** | `auditor` | `editor` | `admin` | `owner` |
|---|---|---|---|---|---|---|
| `donor_profiles` | nada | **su propia fila: leer; escribir nombre, idioma y anonimato. No el estado** | leer | nada | leer + habilitar | leer + habilitar |
| `donation_items` | leer publicados | leer publicados | leer todo | crear/editar | CRUD | CRUD |
| `donation_pledges` | **5 columnas de reservas y entregas con nombre** | **las propias, completas** | leer todas | **nada** | leer + operar | leer + operar |
| `email_deliveries` | nada | nada | leer | nada | leer | leer |
| `donation_catalog` (vista) | leer | leer | leer | leer | leer | leer |
| `donation_catalog_claims` (vista) | leer | leer | leer | leer | leer | leer |
| `donation_wall` (vista) | leer | leer | leer | leer | leer | leer |
| Todo lo de la feature 001 | como estaba | **lo mismo que `anon`, y nada de escritura** | como estaba | como estaba | como estaba | como estaba |

Cuatro decisiones que hay que notar:

- **`editor` no ve ninguna reserva.** Administra el catálogo —qué falta, cuánto, la foto— y no accede
  a nombres, correos ni notas privadas. Es la misma lección que obligó a escribir `can_read_ledger()`
  en lugar de usar el rango: `editor` está por encima de `auditor` en la jerarquía, así que
  `has_min_role('auditor')` le abriría los datos personales. Por eso hay una función nueva,
  **`private.can_read_donors()`**, con la misma forma que `can_read_ledger()` y por la misma razón.
- **`donante` no ve las reservas de otra gente**, ni siquiera las publicables con sus columnas
  completas: su policy le da las propias, y lo público lo ve por la vista como cualquiera.
- **`donante` ve sobre la feature 001 exactamente lo que ve `anon`, y no escribe nada.** Ahí no hace
  falta policy nueva: las que hay piden rol interno y no lo tiene. Lo que hace falta es **probarlo**,
  y eso es la persona `donante` agregada a `030-matriz-de-permisos.sql`.

  La frase correcta **no es "nada"**, y la diferencia importa. Las policies internas están escritas
  como `published_at is not null or private.has_min_role('auditor')`, así que a una cuenta del
  público le dan lo publicado —que ya es público— y nada más. Decir "nada" sería más lindo y sería
  falso, y una afirmación falsa en este documento es la clase de cosa que después se cita como
  garantía. La prueba compara la columna de `donante` contra la de `anon` **fila por fila**, en lugar
  de repetir a mano una lista que puede envejecer: una policy nueva que le dé a `authenticated` algo
  que `anon` no tiene aparece ahí sola.

  Las cuatro celdas donde `donante` sí difiere de `anon`: en `contributions`, `expense_receipts`,
  `user_roles` y `audit_log` el veredicto es `nada` y no `sin privilegio`. El `grant` existe —lo
  necesita `admin`, que es el mismo rol de base de datos— y lo que filtra es la policy. Es **una sola
  barrera** donde `anon` tiene dos, y por eso está escrito acá en lugar de pasar desapercibido.
- El `insert` sobre `donation_pledges` **no existe para nadie**. Las reservas las crea
  `claim_donation_item()`, igual que el rastro lo escribe `record_audit()` (ADR-019).

### Privilegios de tabla y de columna

```sql
grant select on public.donation_items, public.donation_catalog, public.donation_catalog_claims, public.donation_wall
  to anon, authenticated;

-- INSERT/UPDATE por columna: `reserved_quantity` y `fulfilled_quantity` no se
-- escriben con un update directo, ni siquiera como `owner`. Las mueve sólo la
-- función de reserva (ADR-029). DELETE lo filtra la policy a `admin`+.
grant insert (
  campaign_id, budget_item_id, title, description, unit, needed_quantity,
  estimated_unit_amount_minor, currency, photo_media_id, sort_order, published_at
) on public.donation_items to authenticated;
grant update (
  campaign_id, budget_item_id, title, description, unit, needed_quantity,
  estimated_unit_amount_minor, currency, photo_media_id, sort_order, published_at
) on public.donation_items to authenticated;
grant delete on public.donation_items to authenticated;
grant select, insert, delete on public.donor_profiles to authenticated;
grant update (display_name, locale, default_anonymous, portrait_path) on public.donor_profiles
  to authenticated;
grant select on public.email_deliveries to authenticated;

-- El muro: cinco columnas, sólo lectura, y ninguna más (ADR-030).
grant select (id, item_id, quantity, donor_display_name, fulfilled_at)
  on public.donation_pledges to anon;

-- `authenticated` ve su propia reserva completa, y sigue sin poder insertarla.
grant select, update (is_anonymous, donor_display_name, donor_note)
  on public.donation_pledges to authenticated;
```

Un `select user_id from donation_pledges` como `anon` falla con
`42501: permission denied for table donation_pledges`. Ese mensaje exacto —"for table", no "for
column"— es lo que espera la prueba, y está verificado ejecutándolo.

### Índices exigidos por las policies y por las funciones

`donation_items(campaign_id, sort_order)`, `donation_items(published_at)`,
`donation_pledges(item_id)`, `donation_pledges(user_id)`,
`donation_pledges(status, expires_at)` — la usa `release_expired_holds()` —,
`donation_pledges(status, is_anonymous, fulfilled_at desc)` — la usa el muro —,
`email_deliveries(pledge_id, kind)` — la usa la deduplicación del recordatorio —,
`email_deliveries(kind, about_user_id)` donde `sent` — la de los correos de cuenta —.
Verificados con `has_index` de pgTAP, como los de la feature 001.

---

## 5. Funciones

Las de reserva son `security definer`, viven con `set search_path = ''`, y **comprueban autorización
en su primera línea**. Las tres primeras son el único camino para mover un contador.

Hay dos más, de cuentas, que existen desde la fase B y no mueven material:

### `review_donor_account(user_id, decision, note)`

`grant execute to authenticated`. La primera línea pide `has_min_role('admin')`. Acepta `approved` o
`declined`. De `pending` se sale a cualquiera de los dos; de `declined` sólo se vuelve a `approved`.
De `approved` no se sale (ADR-033).

### `donor_contact(user_id) → text`

El correo de `auth.users`, o nulo. `can_read_donors()` por dentro: para el resto es un oráculo mudo,
no un error que delate que la fila existe.

### `claim_donation_item(item_id, quantity, is_anonymous, display_name, note, cover_channel, contact_name, contact_phone, pickup_address) → donation_pledges`

`grant execute to authenticated`. En una transacción:

1. `auth.uid() is not null`, o error. **Y nada más sobre la identidad**: tener sesión ya implica
   correo confirmado, porque `enable_confirmations = true` impide iniciar sesión sin confirmar. No se
   mira `user_metadata.email_verified`, que lo escribe la propia persona (`research.md` §4). El
   comentario de la función lo dice, para que nadie "refuerce" el chequeo con el campo equivocado.
2. El perfil no está `declined`. `pending` y `approved` reservan (ADR-046).
3. Si el canal es `bring`: nombre de contacto y dirección de retiro, o error `datos_de_retiro`.
4. `release_expired_holds(item_id)` — el vencimiento auto-sanante de FR-218.
5. Tope de reservas activas por cuenta, o error (FR-219).
6. El `update` condicional que resuelve la concurrencia:

```sql
update public.donation_items
   set reserved_quantity = reserved_quantity + p_quantity
 where id = p_item_id
   and published_at is not null
   and reserved_quantity + fulfilled_quantity + p_quantity <= needed_quantity
returning * into claimed;

if claimed.id is null then
  raise exception 'sin_disponibilidad' using errcode = '23514';
end if;
```

5. Inserta la reserva con `user_id = auth.uid()` — no con un parámetro, así que **no se puede reservar
   a nombre de otro** — y, si el canal es `bring`, los datos de retiro. El formulario público no llama
   esta función para cubrir con plata (ADR-046).

Probado con dos sesiones concurrentes: la segunda espera el lock, reevalúa, y pierde (`research.md`
§8).

### `cancel_donation_pledge(pledge_id, reason) → void`

`authenticated`. Cancela si la reserva es **de quien llama** o si quien llama pasa
`has_min_role('admin')`. Devuelve las unidades al contador. El motivo es obligatorio para el equipo y
opcional para el dueño de la reserva, que ya dijo lo que tenía que decir cancelando.

### `fulfill_donation_pledge(pledge_id) → void`

`authenticated`, sólo `has_min_role('admin')`. Mueve la cantidad de `reserved` a `fulfilled` y sella
`fulfilled_at`. Es el momento en que un nombre puede llegar al muro (D2) y el que dispara el
agradecimiento.

### `release_expired_holds(item_id default null) → integer`

**Sin `grant execute` a nadie**: la invocan las otras funciones y `pg_cron`. Sin parámetro libera
todo; con parámetro, un ítem. Devuelve cuántas liberó, para que el cron lo registre.

### `record_email_delivery(kind, pledge_id, status, provider_id, error) → void`

`authenticated`. **Resuelve el destinatario por dentro** a partir de la reserva y de `auth.users`, en
lugar de aceptarlo por parámetro: así una cuenta del público no puede usar el registro de envíos para
anotar direcciones ajenas ni para averiguar la de nadie. Sólo admite escribir sobre una reserva propia
o, con rol interno, sobre cualquiera.

---

## 6. Invariantes de dominio (tests unitarios)

| Invariante | Consecuencia si se viola |
|---|---|
| `remaining = needed − reserved − fulfilled`, nunca negativo | El catálogo ofrecería lo que no hay |
| Un ítem cubierto no ofrece la acción de reservar | Una persona completaría un formulario para recibir un error |
| `reserved + fulfilled ≤ needed` | Es el `check`: error de la base |
| Sólo las cuatro transiciones del diagrama son legales | Una reserva cancelada podría "entregarse" |
| Anónima ⇒ sin nombre publicado, en toda proyección | Se publicaría lo que alguien pidió que no |
| No anónima ⇒ nombre presente y no vacío | Es el `check` |
| Una donación en especie no altera ningún `Money` | SC-209 |
| El idioma del correo es el de la cuenta, con `es` por defecto | Un correo en el idioma equivocado |
| El contador del ítem = suma de reservas activas | Dos fuentes discrepando sobre lo disponible |

---

## 7. Degradación sin base de datos ni proveedor de correo

| Estado | Catálogo y muro | Reservas | Correo |
|---|---|---|---|
| Con Supabase y con `RESEND_API_KEY` | Completos | Sí | Sí |
| Con Supabase, sin `RESEND_API_KEY` | Completos | **Sí** | Se registra `skipped` y la pantalla lo dice (FR-233, FR-234) |
| Sin Supabase | **Omitidos con aviso** (FR-034) | No se ofrecen | — |

Nunca se muestra un catálogo vacío como si no faltara nada, ni un muro vacío como si nadie hubiera
ayudado: la ausencia de datos y la ausencia de conexión se comunican distinto.

---

## 8. Frontera con `content/`

Sigue la línea de la feature 001: **la prosa es del repositorio, los datos operativos son de la
base.**

| Dato | Fuente autoritativa | Motivo |
|---|---|---|
| Título y descripción de cada ítem, cantidades, foto | Base | Los carga la familia desde el teléfono y cambian todas las semanas |
| Prosa del catálogo: qué es, cómo se entrega, qué pasa después de reservar | `content/*/catalogo.json` | Se revisa con calma y pasa por revisión de código |
| Textos de las pantallas de cuenta y sus errores | `content/*/cuenta.json` | Ídem |
| Los cuatro correos del producto | `content/*/emails.json` | Ídem, en los dos idiomas |
| Los tres correos de identidad | **Panel de Supabase** | Los emite GoTrue. Su texto queda copiado en `docs/runbook.md` para poder reponerlo (ADR-028) |
| Qué datos personales se guardan y cómo se borran | `content/*/legales.json` | Es contenido publicado y es obligación de FR-239 |
