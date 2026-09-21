-- El perfil de una cuenta del público: sólo el propio, y todo el propio.
--
-- `030-matriz-de-permisos.sql` ya dice lo que una cuenta del público **no** puede:
-- ahí `donor_profiles` es una fila más de una matriz de 360 celdas y su veredicto
-- se mide contando filas. Eso alcanza para las negaciones y no alcanza para dos
-- cosas que este archivo cubre:
--
--   1. **Qué fila** ve, y no cuántas. Un bug que devolviera la fila de otra persona
--      en lugar de la propia daría el mismo veredicto —una fila— y la matriz lo
--      dejaría pasar.
--   2. Que el **camino legítimo** funcione. Una regla que impide crear el propio
--      perfil es igual de rota que una que deja editar el ajeno, y se descubre el
--      día del despliegue en lugar del día de la prueba.
--
-- Las policies de `donor_profiles` son las primeras del proyecto que se resuelven
-- por **propiedad** y no por rol: `id = (select auth.uid())`. Es el patrón que
-- ADR-027 introduce y el que van a copiar `donation_pledges` y todo lo que venga
-- después, así que se prueba acá una vez y bien.
--
-- Las dos cuentas se insertan dentro de la transacción y se revierten al terminar.

begin;
select plan(72);

insert into auth.users (id, email) values
  ('20000000-0000-4000-8000-000000000001', 'quien.dona@ejemplo.invalid'),
  ('20000000-0000-4000-8000-000000000002', 'quien.tambien.dona@ejemplo.invalid'),
  ('20000000-0000-4000-8000-000000000003', 'quien.se.va@ejemplo.invalid'),
  ('20000000-0000-4000-8000-000000000005', 'quien.administra@ejemplo.invalid'),
  ('20000000-0000-4000-8000-000000000006', 'quien.pide.cuenta@ejemplo.invalid');

-- El perfil ajeno existe de entrada. El propio **no**: crearlo es el primer caso.
insert into public.donor_profiles (id, display_name, locale, default_anonymous) values
  ('20000000-0000-4000-8000-000000000002', 'Vecina de la cuadra', 'es', false);

-- Reservas reales para anotar envíos. `email_deliveries.pledge_id` referencia
-- `donation_pledges`; un UUID inventado choca con la clave foránea.
insert into public.campaigns (id, slug, title, summary, status, published_at) values
  ('c8000000-0000-4000-8000-000000000001', 'obra-correos', 'Obra de correos', 'Resumen', 'active', now());

insert into public.donation_items (
  id, campaign_id, title, unit, needed_quantity, published_at
) values (
  'ab800000-0000-4000-8000-000000000001',
  'c8000000-0000-4000-8000-000000000001',
  'Chapas para anotar envíos',
  'unidad',
  10,
  now()
);

insert into public.donation_pledges (
  id, item_id, user_id, quantity, expires_at
) values
  (
    '30000000-0000-4000-8000-000000000001',
    'ab800000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    1,
    now() + interval '14 days'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'ab800000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    1,
    now() + interval '14 days'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    'ab800000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    1,
    now() + interval '14 days'
  );

-- Tres filas para el muro: una entregada con nombre, una entregada anónima y
-- una reservada con nombre. Las tres juntas dicen D2 y FR-225: aparece sólo
-- quien ya trajo y eligió aparecer.
insert into public.donation_pledges (
  id, item_id, user_id, quantity, status, is_anonymous, donor_display_name,
  expires_at, fulfilled_at
) values
  (
    '30000000-0000-4000-8000-000000000004',
    'ab800000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    2,
    'fulfilled',
    false,
    'Vecina de la esquina',
    now() + interval '14 days',
    now() - interval '1 day'
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    'ab800000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    1,
    'fulfilled',
    true,
    null,
    now() + interval '14 days',
    now() - interval '1 day'
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    'ab800000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    1,
    'reserved',
    false,
    'Todavía no llegó',
    now() + interval '14 days',
    null
  );

-- ── Estructura ──────────────────────────────────────────────────────────────
-- Lo que las policies asumen. Sin la clave foránea con `on delete cascade`, borrar
-- la cuenta dejaría el perfil huérfano y el nombre publicado para siempre (FR-240).

select col_is_pk(
  'public', 'donor_profiles', 'id',
  'el perfil usa la misma clave que la cuenta: no hay un identificador nuevo que se pueda filtrar'
);

select fk_ok(
  'public', 'donor_profiles', 'id',
  'auth', 'users', 'id',
  'el perfil referencia auth.users, que es donde vive el correo y donde no se copia'
);

select is(
  (
    select confdeltype
      from pg_constraint
     where conname = 'donor_profiles_id_fkey'
  ),
  'c'::"char",
  'la referencia es on delete cascade: borrar la cuenta borra el perfil, y no hay forma de olvidarse (FR-240)'
);

select is_empty(
  $q$
    select 'default_anonymous = ' || default_anonymous
      from public.donor_profiles
     where id = '20000000-0000-4000-8000-000000000001'
  $q$,
  'la cuenta que va a crear su perfil todavía no tiene uno: lo que sigue no está midiendo una fila que ya estaba'
);

-- ── El camino legítimo, en el orden en que lo recorre una persona ───────────

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {}}';

insert into public.donor_profiles (id) values ('20000000-0000-4000-8000-000000000001');

update public.donor_profiles
   set display_name = 'Quien dona', default_anonymous = false, locale = 'en'
 where id = '20000000-0000-4000-8000-000000000001';

update public.donor_profiles
   set portrait_path = '20000000-0000-4000-8000-000000000001/retrato.jpg'
 where id = '20000000-0000-4000-8000-000000000001';

select throws_ok(
  $q$
    update public.donor_profiles
       set portrait_path = '20000000-0000-4000-8000-000000000002/retrato.jpg'
     where id = '20000000-0000-4000-8000-000000000001'
  $q$,
  '23514',
  null,
  'el retrato no puede apuntar a la carpeta de otra persona (ADR-037)'
);

reset role;

select results_eq(
  $q$
    select display_name, locale, default_anonymous, portrait_path
      from public.donor_profiles
     where id = '20000000-0000-4000-8000-000000000001'
  $q$,
  $q$ values (
    'Quien dona'::text,
    'en'::text,
    false,
    '20000000-0000-4000-8000-000000000001/retrato.jpg'::text
  ) $q$,
  'una cuenta del público crea su perfil y elige su nombre público, su idioma y su anonimato (FR-208, FR-230, FR-232)'
);

-- El anonimato es el default, y es una decisión de producto: aparecer con nombre se
-- elige, no se hereda. Se afirma sobre la columna y no sobre una fila, porque lo que
-- importa es lo que pasa cuando la aplicación **no** manda el campo.
select is(
  (
    select column_default
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'donor_profiles'
       and column_name = 'default_anonymous'
  ),
  'true',
  'y el valor por defecto de la columna es el anonimato: quien no elige nada no aparece (FR-225)'
);

-- ── Lo que ve, y no cuántas filas ve ────────────────────────────────────────

create temporary table lo_que_ve (id uuid) on commit drop;

do $$
declare
  vistos uuid[];
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {}}',
    true
  );

  -- Se acumula en una variable y se guarda después, con el rol ya restituido:
  -- `authenticated` no tiene privilegio para escribir en una tabla temporal de esta
  -- sesión, y el registro de la prueba no puede depender de eso.
  select array_agg(p.id order by p.id) into vistos from public.donor_profiles p;

  reset role;
  perform set_config('request.jwt.claims', '', true);

  insert into lo_que_ve (id) select unnest(coalesce(vistos, '{}'::uuid[]));
end
$$;

select results_eq(
  $q$ select id from lo_que_ve order by id $q$,
  $q$ values ('20000000-0000-4000-8000-000000000001'::uuid) $q$,
  'lo que una cuenta del público lee de donor_profiles es su propia fila, y se verifica por identidad y no por cantidad (FR-203)'
);

-- ── Las negaciones que no se pueden medir contando ──────────────────────────
-- Un UPDATE negado por RLS **no lanza excepción**: afecta cero filas y devuelve
-- éxito (amenaza E5). Por eso acá se mira el dato después, igual que la prueba del
-- CBU de `030`: un test que sólo verificara que no hubo error pasaría también si el
-- nombre de la otra persona hubiera cambiado.

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {}}';

update public.donor_profiles
   set display_name = 'Nombre puesto por otra persona', default_anonymous = true
 where id = '20000000-0000-4000-8000-000000000002';

delete from public.donor_profiles where id = '20000000-0000-4000-8000-000000000002';

reset role;

select results_eq(
  $q$
    select display_name, default_anonymous
      from public.donor_profiles
     where id = '20000000-0000-4000-8000-000000000002'
  $q$,
  $q$ values ('Vecina de la cuadra'::text, false) $q$,
  'después de que otra cuenta del público intenta renombrarla, anonimizarla y borrarla, la vecina sigue con el nombre que eligió (FR-203, E5)'
);

-- La otra mitad de la propiedad: el `with check` del UPDATE. Sin él, una cuenta
-- podría mover su propia fila a un `id` ajeno y quedarse con el perfil de otra
-- persona, que es la amenaza E4 sobre datos personales.
create temporary table mudanza (motivo text) on commit drop;

do $$
declare
  resultado text;
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {}}',
    true
  );

  begin
    update public.donor_profiles
       set id = '20000000-0000-4000-8000-000000000004'
     where id = '20000000-0000-4000-8000-000000000001';
    resultado := 'no falló';
  exception
    when others then
      resultado := sqlstate;
  end;

  reset role;
  perform set_config('request.jwt.claims', '', true);

  insert into mudanza (motivo) values (resultado);
end
$$;

select isnt(
  (select motivo from mudanza),
  'no falló',
  'una cuenta no puede mudar su perfil a un id ajeno: la policy de update lleva with check y no sólo using (E4)'
);

-- ── El idioma es una lista cerrada ──────────────────────────────────────────
-- `locale` decide en qué idioma sale cada correo (FR-232). Un valor que la
-- aplicación no sabe traducir tiene que ser imposible, no un correo en blanco.

select throws_ok(
  $s$
    update public.donor_profiles set locale = 'pt'
     where id = '20000000-0000-4000-8000-000000000001'
  $s$,
  '23514',
  null,
  'el idioma sólo puede ser es o en: los dos que el sitio publica (ADR-014, ADR-023)'
);

-- ── Un nombre en blanco no es un nombre ─────────────────────────────────────
-- `display_name` nulo significa "todavía no decidí aparecer". Una cadena de
-- espacios significaría lo mismo y se publicaría como un renglón vacío en el muro.

select throws_ok(
  $s$
    update public.donor_profiles set display_name = '   '
     where id = '20000000-0000-4000-8000-000000000001'
  $s$,
  '23514',
  null,
  'el nombre público es nulo o es un nombre: una cadena de espacios se publicaría como un renglón vacío'
);

-- ── Irse ────────────────────────────────────────────────────────────────────
-- FR-208 y `docs/privacy.md` § Derechos: el borrado se ejerce desde `/cuenta`, sin
-- pedirle permiso a nadie y sin dar explicaciones. Eso obliga a que la aplicación
-- web pueda borrar una fila de `auth.users`, y la aplicación web **no tiene la
-- clave secreta**: la única credencial que maneja es la publicable, que se resuelve
-- como `authenticated`.
--
-- La alternativa era darle a Next la clave `service_role` para llamar a
-- `auth.admin.deleteUser()`. Una clave que saltea RLS por completo, presente en el
-- proceso que sirve el sitio público, para una operación que la persona hace sobre
-- sí misma: el remedio es peor. Una función `security definer` acotada a
-- `auth.uid()` no puede borrar a nadie más, ni con el argumento equivocado, porque
-- no recibe argumentos.

select has_function(
  'public', 'delete_own_account', '{}'::name[],
  'la cuenta se borra desde el sitio con una función acotada, no con la clave secreta en el servidor web (FR-208)'
);

select function_privs_are(
  'public', 'delete_own_account', '{}'::name[], 'anon', '{}'::text[],
  'y anon no puede ni invocarla: sin sesión no hay cuenta propia que borrar (E3)'
);

insert into public.donor_profiles (id, display_name, default_anonymous) values
  ('20000000-0000-4000-8000-000000000003', 'Quien se va', false);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000003", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $s$ select public.delete_own_account() $s$,
  'una cuenta del público se borra a sí misma sin intervención de nadie (FR-208)'
);

reset role;
set local "request.jwt.claims" = '';

select is_empty(
  $q$ select id from auth.users where id = '20000000-0000-4000-8000-000000000003' $q$,
  'la cuenta ya no existe: el borrado es de auth.users y no una marca de baja'
);

select is_empty(
  $q$ select id from public.donor_profiles where id = '20000000-0000-4000-8000-000000000003' $q$,
  'y el perfil se fue con ella por la cascada, sin que nadie tuviera que acordarse (FR-240)'
);

-- Una persona con rol interno **no** se borra sola, y no es una restricción
-- arbitraria: `owner` es el rol que otorga roles. Si la última propietaria pudiera
-- irse desde `/cuenta`, el proyecto quedaría sin nadie que pueda volver a entrar al
-- backoffice, y la recuperación sería un `insert` a mano en la base de producción.
-- Quien administra la campaña se da de baja quitándose el rol primero.
insert into public.user_roles (user_id, role) values
  ('20000000-0000-4000-8000-000000000005', 'owner');

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000005", "role": "authenticated",
    "app_metadata": {"user_role": "owner"}}';

select throws_ok(
  $s$ select public.delete_own_account() $s$,
  'P0001',
  null,
  'quien tiene rol interno no se borra desde /cuenta: se le quita el rol primero, para que el proyecto no quede sin owner'
);

reset role;
set local "request.jwt.claims" = '';

-- ── El registro de envíos ───────────────────────────────────────────────────
-- `email_deliveries` guarda a qué dirección se intentó mandar cada correo, y eso
-- la convierte en un índice de direcciones de correo de gente que donó. Dos cosas
-- tienen que ser verdad, y las dos se prueban acá porque ninguna se ve leyendo la
-- migración:
--
--   1. **Quien anota no elige el destinatario.** La función lo resuelve por dentro
--      desde `auth.users` (ADR-028). Si aceptara la dirección por parámetro, el
--      registro de envíos sería un lugar donde una cuenta del público puede
--      escribir la dirección de otra persona, o descubrirla por diferencia.
--   2. **Quien anota no lee.** Una cuenta del público registra su propio envío y no
--      puede leer ni esa fila. Es la misma forma que `audit_log`: `editor` escribe
--      en el rastro y no lo lee (ADR-019), acá quien dona anota y no lee.

select has_table(
  'public', 'email_deliveries',
  'existe el registro de envíos: un correo que no salió tiene que quedar en algún lado (ADR-028)'
);

-- Igual que `audit_log`: la ausencia de policy **es** la garantía. Nada de lo que
-- se intentó mandar se corrige ni se borra después, ni por `owner`.
select is_empty(
  $q$
    select policyname::text
      from pg_policies
     where schemaname = 'public'
       and tablename = 'email_deliveries'
       and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  $q$,
  'email_deliveries no tiene policy de insert, update ni delete: se agrega por función y no se corrige nunca'
);

-- TRUNCATE ignora RLS, así que la lista entera de privilegios dice más que la
-- ausencia de una policy. Es la misma aserción que protege `audit_log`.
select table_privs_are(
  'public', 'email_deliveries', 'authenticated',
  array['SELECT'],
  'authenticated sobre email_deliveries tiene exactamente SELECT: la escritura pasa por record_email_delivery()'
);

select table_privs_are(
  'public', 'email_deliveries', 'anon',
  array[]::text[],
  'anon no tiene ningún privilegio sobre el registro de envíos: sin sesión no hay correo que consultar'
);

select has_function(
  'public', 'record_email_delivery',
  array['text', 'uuid', 'text', 'text', 'text', 'uuid'],
  'la única vía de escritura del registro de envíos, y no recibe la dirección de destino (ADR-028)'
);

select function_privs_are(
  'public', 'record_email_delivery',
  array['text', 'uuid', 'text', 'text', 'text', 'uuid'],
  'anon', array[]::text[],
  'y anon no puede invocarla: Postgres otorga EXECUTE a PUBLIC en toda función nueva y esta migración lo revoca (E3)'
);

select function_privs_are(
  'public', 'record_email_delivery',
  array['text', 'uuid', 'text', 'text', 'text', 'uuid'],
  'service_role', array['EXECUTE']::text[],
  'service_role puede anotar: es el servidor, cuando no hay sesión (oferta por teléfono, ADR-028)'
);

-- ── Anotar lo propio, sin nombrar a nadie ───────────────────────────────────

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $s$
    select public.record_email_delivery(
      'pledge.confirmed', '30000000-0000-4000-8000-000000000001', 'sent', 're_abc123', null
    )
  $s$,
  'una cuenta del público registra el envío de su propia confirmación de reserva'
);

-- La misma sesión, y ni su propia fila. `email_deliveries` es operativo: quien dona
-- ve sus reservas en `/cuenta`, no el detalle de qué se le intentó mandar.
select is_empty(
  $q$ select id from public.email_deliveries $q$,
  'y no puede leer ni la fila que acaba de escribir: anota sin leer, como editor en el rastro de auditoría'
);

select throws_ok(
  $s$
    select public.record_email_delivery(
      'pledge.confirmed', '30000000-0000-4000-8000-000000000002', 'sent', 're_def456', null,
      '20000000-0000-4000-8000-000000000002'
    )
  $s$,
  '42501',
  null,
  'y no puede anotarle un envío a otra cuenta: apuntar a alguien más pide can_read_donors() (ADR-028)'
);

-- El aviso al equipo no tiene destinatario en la base, y eso es exacto: la
-- dirección del equipo vive en `EMAIL_STAFF_ADDRESS`, en el entorno del servidor.
-- Anotar ahí una dirección sería copiar un dato de configuración a una tabla.
select lives_ok(
  $s$
    select public.record_email_delivery(
      'staff.new_pledge', '30000000-0000-4000-8000-000000000001', 'skipped', null, null
    )
  $s$,
  'el aviso al equipo se anota igual, y sin destinatario: esa dirección es del entorno y no de la base'
);

reset role;
set local "request.jwt.claims" = '';

-- La dirección la resolvió la función. Quien llamó nunca la escribió, y esta
-- aserción es la única forma de comprobarlo: compara lo guardado contra
-- `auth.users`, que es de donde tenía que salir.
select results_eq(
  $q$
    select d.kind, d.recipient, d.status
      from public.email_deliveries d
     where d.pledge_id = '30000000-0000-4000-8000-000000000001'
     order by d.kind
  $q$,
  $q$
    values ('pledge.confirmed'::text, 'quien.dona@ejemplo.invalid'::text, 'sent'::text),
           ('staff.new_pledge'::text, null::text, 'skipped'::text)
  $q$,
  'la dirección guardada es la de auth.users de quien llamó, y la del aviso al equipo es nula (ADR-028)'
);

-- Sin sesión el cliente público recibe 401 de PostgREST. El servidor anota con
-- service_role: staff.* no pide persona; un correo de persona pide p_user_id.
set local role service_role;

select lives_ok(
  $s$
    select public.record_email_delivery(
      'staff.phone_offer', '30000000-0000-4000-8000-000000000003', 'skipped', null, null
    )
  $s$,
  'service_role anota un correo de equipo sin sesión: es la oferta por teléfono'
);

select throws_ok(
  $s$
    select public.record_email_delivery(
      'pledge.confirmed', '30000000-0000-4000-8000-000000000003', 'sent', 're_x', null
    )
  $s$,
  '42501',
  null,
  'y sin de quién es, no anota un correo de persona: hace falta p_user_id o una sesión'
);

select lives_ok(
  $s$
    select public.record_email_delivery(
      'pledge.confirmed', '30000000-0000-4000-8000-000000000003', 'sent', 're_srv', null,
      '20000000-0000-4000-8000-000000000001'
    )
  $s$,
  'con p_user_id, service_role anota el correo de esa persona'
);

reset role;
set local "request.jwt.claims" = '';

-- La segunda capa de idempotencia, la que no vence. La clave de Resend dura 24
-- horas y el proceso de recordatorios corre todos los días: a las 25 horas ya no
-- frenaría nada (FR-235, SC-210). Esto sí.
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $s$
    select public.record_email_delivery(
      'pledge.confirmed', '30000000-0000-4000-8000-000000000001', 'sent', 're_otra_vez', null
    )
  $s$,
  '23505',
  null,
  'el mismo correo no se puede anotar dos veces como enviado para la misma reserva: la deduplicación permanente es un índice, no una convención (FR-235)'
);

reset role;
set local "request.jwt.claims" = '';

-- Quién sí lee: los tres roles de `can_read_donors()`. Se prueba con `auditor`
-- porque es el que la función incluye y el rango **no** incluiría: `editor` es
-- rango 2 y `auditor` rango 1, así que un `has_min_role('auditor')` acá le habría
-- abierto a `editor` las direcciones de correo de quienes donaron.
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000005", "role": "authenticated",
    "app_metadata": {"user_role": "auditor"}}';

select is(
  (select count(*)::int from public.email_deliveries),
  4,
  'auditor lee el registro de envíos: para eso existe, para que un correo que no salió sea visible en el backoffice'
);

set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000005", "role": "authenticated",
    "app_metadata": {"user_role": "editor"}}';

select is(
  (select count(*)::int from public.email_deliveries),
  0,
  'y editor no lee ninguna: administra el catálogo y no accede a una dirección de correo (ADR-027)'
);

reset role;
set local "request.jwt.claims" = '';

-- La restricción, atacada desde donde no hay policy que la tape. Un `insert` de
-- superusuario es el peor caso real: una migración futura, un script de mantenimiento.
select throws_ok(
  $s$
    insert into public.email_deliveries (kind, pledge_id, recipient, status)
    values ('staff.new_pledge', '30000000-0000-4000-8000-000000000003', 'equipo@ejemplo.invalid', 'sent')
  $s$,
  '23514',
  null,
  'ni un insert de superusuario puede ponerle destinatario al aviso al equipo: la dirección del equipo no se guarda'
);

select throws_ok(
  $s$
    insert into public.email_deliveries (kind, pledge_id, recipient, status)
    values ('pledge.reminder', '30000000-0000-4000-8000-000000000003', null, 'sent')
  $s$,
  '23514',
  null,
  'y un correo a una persona no se anota sin destinatario: un registro de envíos sin a quién no sirve para nada'
);

-- ── La habilitación, que no es confirmar el correo ──────────────────────────

select is(
  (
    select column_default
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'donor_profiles'
       and column_name = 'approval_status'
  ),
  '''pending''::text',
  'una cuenta nace pendiente: confirmar el correo no habilita la reserva (ADR-033)'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000006", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $s$
    insert into public.donor_profiles (id, approval_status)
    values ('20000000-0000-4000-8000-000000000006', 'approved')
  $s$,
  '42501',
  null,
  'una cuenta no puede nacer habilitada: el insert exige pending (ADR-033)'
);

insert into public.donor_profiles (id) values ('20000000-0000-4000-8000-000000000006');

select throws_ok(
  $s$
    update public.donor_profiles
       set approval_status = 'approved'
     where id = '20000000-0000-4000-8000-000000000006'
  $s$,
  '42501',
  null,
  'y no puede escribirse el estado: el GRANT de update no incluye approval_status'
);

select throws_ok(
  $s$ select public.review_donor_account('20000000-0000-4000-8000-000000000006', 'approved') $s$,
  '42501',
  null,
  'una cuenta del público no se habilita a sí misma: review_donor_account pide admin (ADR-033)'
);

reset role;
set local "request.jwt.claims" = '';

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000005", "role": "authenticated",
    "app_metadata": {"user_role": "owner"}}';

select lives_ok(
  $s$ select public.review_donor_account('20000000-0000-4000-8000-000000000006', 'approved') $s$,
  'owner habilita una cuenta pendiente'
);

select is(
  (select public.donor_contact('20000000-0000-4000-8000-000000000006')),
  'quien.pide.cuenta@ejemplo.invalid',
  'y puede leer el correo de contacto: coordinar una entrega lo necesita'
);

reset role;
set local "request.jwt.claims" = '';

select is(
  (select approval_status from public.donor_profiles where id = '20000000-0000-4000-8000-000000000006'),
  'approved',
  'después de la habilitación, la cuenta puede reservar'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {}}';

select is(
  (select public.donor_contact('20000000-0000-4000-8000-000000000006')),
  null::text,
  'una cuenta del público no lee el correo de otra: donor_contact no es un oráculo'
);

reset role;
set local "request.jwt.claims" = '';

-- ── El muro, por privilegio de columna (ADR-030) ────────────────────────────
-- Tres barreras, tres preguntas: la policy dice qué filas, el GRANT dice qué
-- columnas, y security_invoker dice que la vista no las sortee. Se prueban las
-- tres, y se prueba que las otras dos filas —anónima y reservada— no existan
-- para `anon`. Correr esto como superusuario no prueba nada: bypassa RLS.

select has_view('public', 'donation_wall', 'existe la vista pública del muro');

select isnt_empty(
  $q$
    select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'donation_wall'
       and coalesce(array_to_string(c.reloptions, ','), '') ~ 'security_invoker=(true|on)'
  $q$,
  'donation_wall declara security_invoker: sin eso bypasea RLS (I3)'
);

select ok(
  pg_get_viewdef('public.donation_wall'::regclass, true) !~ 'is_anonymous'
  and pg_get_viewdef('public.donation_wall'::regclass, true) !~ 'status',
  'la vista no nombra status ni is_anonymous: el filtro está en la policy (ADR-030)'
);

select has_view('public', 'donation_catalog_claims', 'existe la vista pública de quién tomó del catálogo');

select isnt_empty(
  $q$
    select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'donation_catalog_claims'
       and coalesce(array_to_string(c.reloptions, ','), '') ~ 'security_invoker=(true|on)'
  $q$,
  'donation_catalog_claims declara security_invoker: sin eso bypasea RLS (I3)'
);

select ok(
  pg_get_viewdef('public.donation_catalog_claims'::regclass, true) !~ 'is_anonymous'
  and pg_get_viewdef('public.donation_catalog_claims'::regclass, true) !~ 'status',
  'la vista del catálogo no nombra status ni is_anonymous: el filtro está en la policy (ADR-030)'
);

select is(
  (
    select coalesce(array_agg(column_name::text order by column_name), '{}')
      from information_schema.column_privileges
     where table_schema = 'public'
       and table_name = 'donation_pledges'
       and grantee = 'anon'
       and privilege_type = 'SELECT'
  ),
  array['donor_display_name', 'fulfilled_at', 'has_portrait', 'id', 'item_id', 'quantity']::text[],
  'anon lee exactamente las seis columnas públicas, ni una más'
);

select column_privs_are(
  'public', 'donation_pledges', 'id', 'anon', array['SELECT']::text[],
  'anon puede leer donation_pledges.id'
);
select column_privs_are(
  'public', 'donation_pledges', 'item_id', 'anon', array['SELECT']::text[],
  'anon puede leer donation_pledges.item_id'
);
select column_privs_are(
  'public', 'donation_pledges', 'quantity', 'anon', array['SELECT']::text[],
  'anon puede leer donation_pledges.quantity'
);
select column_privs_are(
  'public', 'donation_pledges', 'donor_display_name', 'anon', array['SELECT']::text[],
  'anon puede leer donation_pledges.donor_display_name'
);
select column_privs_are(
  'public', 'donation_pledges', 'fulfilled_at', 'anon', array['SELECT']::text[],
  'anon puede leer donation_pledges.fulfilled_at'
);
select column_privs_are(
  'public', 'donation_pledges', 'has_portrait', 'anon', array['SELECT']::text[],
  'anon puede leer donation_pledges.has_portrait'
);

set local role anon;

select throws_ok(
  $s$ select user_id from public.donation_pledges $s$,
  '42501',
  null,
  'nombrar user_id falla: anon no tiene privilegio de esa columna'
);

select throws_ok(
  $s$ select portrait_path from public.donation_pledges $s$,
  '42703',
  null,
  'nombrar portrait_path falla: el path no está en la reserva ni se otorga'
);

select throws_ok(
  $s$ select donor_note from public.donation_pledges $s$,
  '42501',
  null,
  'nombrar donor_note falla: el mensaje a la familia no es público'
);

select throws_ok(
  $s$ select cover_channel from public.donation_pledges $s$,
  '42501',
  null,
  'nombrar cover_channel falla: cómo se cubre no es público (ADR-041)'
);

select throws_ok(
  $s$ select contact_name from public.donation_pledges $s$,
  '42501',
  null,
  'nombrar contact_name falla: el nombre de retiro no es público (ADR-046)'
);

select throws_ok(
  $s$ select contact_phone from public.donation_pledges $s$,
  '42501',
  null,
  'nombrar contact_phone falla: el teléfono no es público (ADR-046)'
);

select throws_ok(
  $s$ select pickup_address from public.donation_pledges $s$,
  '42501',
  null,
  'nombrar pickup_address falla: la dirección de retiro no es pública (ADR-046)'
);

select throws_ok(
  $s$ select * from public.donation_pledges $s$,
  '42501',
  null,
  'select * sobre donation_pledges falla: publica columnas que anon no puede nombrar'
);

select results_eq(
  $q$ select donor_display_name from public.donation_wall order by donor_display_name $q$,
  $q$ values ('Vecina de la esquina'::text) $q$,
  'el muro muestra la entregada con nombre y no la anónima ni la reservada (D2, FR-225)'
);

select is_empty(
  $q$
    select donor_display_name
      from public.donation_wall
     where donor_display_name = 'Todavía no llegó'
  $q$,
  'una reserva con nombre no aparece en el muro: el muro dice quién ayudó, no quién prometió (D2)'
);

select results_eq(
  $q$ select donor_display_name from public.donation_catalog_claims order by donor_display_name $q$,
  $q$ values ('Todavía no llegó'::text), ('Vecina de la esquina'::text) $q$,
  'el catálogo nombra reservas y entregas con nombre; la anónima no existe (FR-255)'
);

select results_eq(
  $q$
    select has_portrait
      from public.donation_catalog_claims
     where donor_display_name = 'Vecina de la esquina'
  $q$,
  $q$ values (true) $q$,
  'con retrato puesto, has_portrait es verdadero en la vista (FR-246)'
);

reset role;
set local "request.jwt.claims" =
  '{"sub": "20000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {}}';
set local role authenticated;

update public.donor_profiles
   set portrait_path = null
 where id = '20000000-0000-4000-8000-000000000001';

reset role;
set local "request.jwt.claims" = '';
set local role anon;

select results_eq(
  $q$
    select has_portrait
      from public.donation_catalog_claims
     where donor_display_name = 'Vecina de la esquina'
  $q$,
  $q$ values (false) $q$,
  'al borrar el retrato, has_portrait pasa a falso en la vista'
);

reset role;
set local "request.jwt.claims" = '';

select * from finish();
rollback;
