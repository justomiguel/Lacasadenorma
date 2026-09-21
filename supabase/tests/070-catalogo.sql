-- El catálogo de donaciones en especie: qué falta, y que no se puede pedir de más.
--
-- Fase C: la tabla, el check de no-sobreventa y la vista pública.
-- Fase D: reservas concurrentes, tope por cuenta. El plazo no suelta solo.

begin;
select plan(109);

insert into public.campaigns (id, slug, title, summary, status, published_at) values
  ('c7000000-0000-4000-8000-000000000001', 'obra-catalogo', 'Obra del catálogo', 'Resumen', 'active', now());

insert into public.donation_items (
  id, campaign_id, title, unit, needed_quantity, reserved_quantity, fulfilled_quantity, published_at
) values (
  'ab700000-0000-4000-8000-000000000001',
  'c7000000-0000-4000-8000-000000000001',
  'Chapas del techo',
  'unidad',
  10,
  3,
  2,
  now()
), (
  'ab700000-0000-4000-8000-000000000002',
  'c7000000-0000-4000-8000-000000000001',
  'Arena en borrador',
  'bolsa',
  20,
  0,
  0,
  null
), (
  'ab700000-0000-4000-8000-000000000003',
  'c7000000-0000-4000-8000-000000000001',
  'Último ejemplar',
  'unidad',
  1,
  0,
  0,
  now()
), (
  'ab700000-0000-4000-8000-000000000004',
  'c7000000-0000-4000-8000-000000000001',
  'Para el tope',
  'unidad',
  20,
  0,
  0,
  now()
), (
  'ab700000-0000-4000-8000-000000000005',
  'c7000000-0000-4000-8000-000000000001',
  'Para vencer',
  'unidad',
  5,
  0,
  0,
  now()
), (
  'ab700000-0000-4000-8000-000000000006',
  'c7000000-0000-4000-8000-000000000001',
  'Para el libro',
  'unidad',
  2,
  0,
  0,
  now()
), (
  'ab700000-0000-4000-8000-000000000008',
  'c7000000-0000-4000-8000-000000000001',
  'Para pendiente',
  'unidad',
  2,
  0,
  0,
  now()
);

insert into auth.users (id, email) values
  ('ab710000-0000-4000-8000-0000000000a1', 'reserva.a@ejemplo.invalid'),
  ('ab710000-0000-4000-8000-0000000000a2', 'reserva.b@ejemplo.invalid'),
  ('ab710000-0000-4000-8000-0000000000b1', 'reserva.pendiente@ejemplo.invalid'),
  ('ab710000-0000-4000-8000-0000000000b2', 'reserva.rechazada@ejemplo.invalid'),
  ('ab710000-0000-4000-8000-0000000000c1', 'reserva.se.va@ejemplo.invalid'),
  ('ab710000-0000-4000-8000-0000000000ff', 'reserva.admin@ejemplo.invalid');

insert into public.donor_profiles (
  id, display_name, locale, default_anonymous, approval_status, reviewed_at, reviewed_by
) values
  (
    'ab710000-0000-4000-8000-0000000000a1',
    'Quien reserva A', 'es', true, 'approved', now(),
    'ab710000-0000-4000-8000-0000000000ff'
  ),
  (
    'ab710000-0000-4000-8000-0000000000a2',
    'Quien reserva B', 'es', true, 'approved', now(),
    'ab710000-0000-4000-8000-0000000000ff'
  ),
  (
    'ab710000-0000-4000-8000-0000000000c1',
    'Quien se va', 'es', false, 'approved', now(),
    'ab710000-0000-4000-8000-0000000000ff'
  ),
  (
    'ab710000-0000-4000-8000-0000000000b1',
    null, 'es', true, 'pending', null, null
  ),
  (
    'ab710000-0000-4000-8000-0000000000b2',
    null, 'es', true, 'declined', now(),
    'ab710000-0000-4000-8000-0000000000ff'
  );

insert into public.contributions (
  campaign_id, amount_minor, currency, received_at
) values (
  'c7000000-0000-4000-8000-000000000001', 100000, 'ARS', date '2026-08-01'
);

create function pg_temp.traer(
  p_item uuid,
  p_quantity integer default 1,
  p_is_anonymous boolean default true,
  p_display_name text default null,
  p_note text default null
) returns public.donation_pledges
language sql
as $$
  select *
    from public.claim_donation_item(
      p_item_id := p_item,
      p_quantity := p_quantity,
      p_is_anonymous := p_is_anonymous,
      p_display_name := p_display_name,
      p_note := p_note,
      p_contact_name := 'Ana',
      p_pickup_address := 'Riacho He Hé, Formosa'
    );
$$;

-- ── Estructura ──────────────────────────────────────────────────────────────

select has_table('public', 'donation_items', 'existe donation_items');
select has_view('public', 'donation_catalog', 'existe la vista pública del catálogo');
select has_type('public', 'donation_unit', 'existe el enum donation_unit');
select has_type('public', 'donation_item_category', 'existe el enum de categoría del catálogo');
select has_column('public', 'donation_items', 'category', 'cada ítem tiene categoría');
select col_not_null('public', 'donation_items', 'category', 'la categoría no puede faltar');
select has_column('public', 'donation_catalog', 'category', 'la vista pública incluye la categoría');
select ok(
  'metro_cubico'::public.donation_unit = 'metro_cubico',
  'metro_cubico es una unidad del catálogo'
);

select col_is_pk(
  'public', 'donation_items', 'id',
  'donation_items tiene clave primaria'
);

select has_index(
  'public', 'donation_items', 'donation_items_campaign_idx',
  array['campaign_id', 'sort_order']::name[],
  'donation_items(campaign_id, sort_order): el orden editorial de una campaña'
);

select has_index(
  'public', 'donation_items', 'donation_items_published_at_idx',
  array['published_at']::name[],
  'donation_items(published_at): lo filtra la policy de lectura pública'
);

-- ── El check de no-sobreventa (FR-211) ──────────────────────────────────────
-- Se ataca con un update de superusuario a propósito: si el check sólo viviera
-- en la función de reservar, un UPDATE directo (o un bug en la función) dejaría
-- comprometidas más unidades de las que hacen falta. El check es la garantía
-- que no depende de quién escriba.

select throws_ok(
  $q$
    update public.donation_items
       set reserved_quantity = 9
     where id = 'ab700000-0000-4000-8000-000000000001'
  $q$,
  '23514',
  null,
  'un superusuario no puede dejar reservado + entregado por encima de lo necesario'
);

select throws_ok(
  $q$
    update public.donation_items
       set fulfilled_quantity = 8
     where id = 'ab700000-0000-4000-8000-000000000001'
  $q$,
  '23514',
  null,
  'un superusuario no puede dejar entregado + reservado por encima de lo necesario'
);

select throws_ok(
  $q$
    update public.donation_items
       set needed_quantity = 4
     where id = 'ab700000-0000-4000-8000-000000000001'
  $q$,
  '23514',
  null,
  'bajar needed_quantity por debajo de lo comprometido viola el mismo check (US4 escenario 5)'
);

select throws_ok(
  $q$
    update public.donation_items
       set needed_quantity = 0
     where id = 'ab700000-0000-4000-8000-000000000001'
  $q$,
  '23514',
  null,
  'needed_quantity tiene que ser positiva'
);

select throws_ok(
  $q$
    insert into public.donation_items (
      campaign_id, title, unit, needed_quantity, estimated_unit_amount_minor
    ) values (
      'c7000000-0000-4000-8000-000000000001', 'Sin moneda', 'unidad', 1, 1000
    )
  $q$,
  '23514',
  null,
  'un valor estimado sin moneda no es un monto'
);

select lives_ok(
  $q$
    update public.donation_items
       set reserved_quantity = 5
     where id = 'ab700000-0000-4000-8000-000000000001'
  $q$,
  'reservar hasta el tope (5 + 2 = 7 ≤ 10) es legal'
);

update public.donation_items
   set reserved_quantity = 3
 where id = 'ab700000-0000-4000-8000-000000000001';

-- ── La vista pública (D3, FR-210, FR-215) ───────────────────────────────────

select results_eq(
  $q$
    select remaining_quantity
      from public.donation_catalog
     where id = 'ab700000-0000-4000-8000-000000000001'
  $q$,
  $q$ values (5) $q$,
  'remaining_quantity se calcula en la base: 10 − 3 reservadas − 2 entregadas'
);

select is_empty(
  $q$
    select 1
      from public.donation_catalog
     where remaining_quantity < 0
  $q$,
  'remaining_quantity nunca es negativo'
);

select isnt_empty(
  $q$
    select a.attname::text
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'donation_catalog'
       and a.attname = 'estimated_unit_amount_minor'
       and not a.attisdropped
  $q$,
  'la vista pública expone el valor estimado de la ficha (ADR-041)'
);

select is_empty(
  $q$
    select 1
      from public.donation_catalog
     where id = 'ab700000-0000-4000-8000-000000000002'
  $q$,
  'un ítem no publicado no está en la vista (FR-215)'
);

select isnt_empty(
  $q$
    select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'donation_catalog'
       and coalesce(array_to_string(c.reloptions, ','), '') ~ 'security_invoker=(true|on)'
  $q$,
  'donation_catalog declara security_invoker: sin eso bypasea RLS (I3)'
);

-- ── Reserva: estructura ─────────────────────────────────────────────────────

select has_table('public', 'donation_pledges', 'existe donation_pledges');
select has_type('public', 'pledge_status', 'existe el enum pledge_status');

select has_index(
  'public', 'donation_pledges', 'donation_pledges_item_idx',
  array['item_id']::name[],
  'donation_pledges(item_id)'
);

select has_index(
  'public', 'donation_pledges', 'donation_pledges_user_idx',
  array['user_id']::name[],
  'donation_pledges(user_id)'
);

select has_index(
  'public', 'donation_pledges', 'donation_pledges_expiry_idx',
  array['status', 'expires_at']::name[],
  'donation_pledges(status, expires_at): la usa release_expired_holds()'
);

select has_function(
  'public', 'claim_donation_item',
  array['uuid', 'integer', 'boolean', 'text', 'text', 'donation_cover_channel', 'text', 'text', 'text']::name[],
  'existe claim_donation_item()'
);

select has_column('public', 'donation_pledges', 'contact_name', 'la reserva guarda el nombre de contacto');
select has_column('public', 'donation_pledges', 'contact_phone', 'la reserva guarda el teléfono');
select has_column('public', 'donation_pledges', 'pickup_address', 'la reserva guarda la dirección de retiro');
select has_column('public', 'donation_pledges', 'accepted_at', 'la reserva guarda cuándo se aceptó');

select has_function(
  'public', 'cancel_donation_pledge',
  array['uuid', 'text']::name[],
  'existe cancel_donation_pledge()'
);

select has_function(
  'public', 'accept_donation_pledge',
  array['uuid', 'text', 'text']::name[],
  'existe accept_donation_pledge()'
);

select has_function(
  'public', 'fulfill_donation_pledge',
  array['uuid']::name[],
  'existe fulfill_donation_pledge()'
);

select has_function(
  'public', 'revert_donation_pledge',
  array['uuid', 'text']::name[],
  'existe revert_donation_pledge()'
);

select has_function(
  'public', 'release_expired_holds',
  array['uuid']::name[],
  'existe release_expired_holds()'
);

select ok(
  not has_table_privilege('authenticated', 'public.donation_pledges', 'INSERT'),
  'authenticated no tiene INSERT: las reservas las crea la función (ADR-029)'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.release_expired_holds(uuid)',
    'execute'
  ),
  'release_expired_holds no tiene GRANT: la invocan las otras funciones y pg_cron'
);

-- ── Insert directo ──────────────────────────────────────────────────────────

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$
    insert into public.donation_pledges (item_id, user_id, quantity, expires_at)
    values (
      'ab700000-0000-4000-8000-000000000003',
      'ab710000-0000-4000-8000-0000000000a1',
      1,
      now() + interval '14 days'
    )
  $q$,
  '42501',
  null,
  'un insert directo en donation_pledges falla por falta de privilegio'
);

-- ── Cuenta pendiente reserva; rechazada no (ADR-046) ─────────────────────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000b1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select pg_temp.traer('ab700000-0000-4000-8000-000000000008') $q$,
  'una cuenta pendiente sí reserva (ADR-046)'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000b2", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$ select pg_temp.traer('ab700000-0000-4000-8000-000000000008') $q$,
  '42501',
  'sin_habilitacion',
  'una cuenta rechazada no reserva'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select is(
  (
    select contact_name
      from public.claim_donation_item('ab700000-0000-4000-8000-000000000004')
  ),
  null,
  'con sesión, sin nombre ni dirección, reserva igual (ADR-051)'
);

-- ── Dos reservas secuenciales por la última unidad ──────────────────────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select pg_temp.traer('ab700000-0000-4000-8000-000000000003') $q$,
  'la primera sesión se lleva el último ejemplar'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a2", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$ select pg_temp.traer('ab700000-0000-4000-8000-000000000003') $q$,
  '23514',
  'sin_disponibilidad',
  'la segunda sesión por el último ejemplar ve sin_disponibilidad'
);

-- ── Tope de reservas activas ────────────────────────────────────────────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a2", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$
    select pg_temp.traer('ab700000-0000-4000-8000-000000000004', 1)
      from generate_series(1, 5)
  $q$,
  'cinco reservas activas es el tope, y se alcanzan'
);

select throws_ok(
  $q$ select pg_temp.traer('ab700000-0000-4000-8000-000000000004', 1) $q$,
  'P0001',
  'demasiadas_reservas',
  'la sexta reserva activa por cuenta se rechaza (FR-219)'
);

-- ── El plazo no suelta solo ─────────────────────────────────────────────────

reset role;

insert into public.donation_pledges (
  id, item_id, user_id, quantity, status, expires_at
) values (
  'ab720000-0000-4000-8000-000000000001',
  'ab700000-0000-4000-8000-000000000005',
  'ab710000-0000-4000-8000-0000000000a1',
  2,
  'reserved',
  now() - interval '1 hour'
);

update public.donation_items
   set reserved_quantity = 2
 where id = 'ab700000-0000-4000-8000-000000000005';

select is(
  public.release_expired_holds('ab700000-0000-4000-8000-000000000005'),
  0,
  'release_expired_holds ya no libera'
);

select is(
  (
    select p.status
      from public.donation_pledges p
     where p.id = 'ab720000-0000-4000-8000-000000000001'
  ),
  'reserved',
  'pasó el plazo y sigue reserved'
);

select results_eq(
  $q$
    select reserved_quantity
      from public.donation_items
     where id = 'ab700000-0000-4000-8000-000000000005'
  $q$,
  $q$ values (2) $q$,
  'el plazo no devuelve unidades'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select pg_temp.traer('ab700000-0000-4000-8000-000000000005', 1) $q$,
  'claim_donation_item no depende de liberar lo vencido'
);

reset role;

select is(
  (
    select p.status
      from public.donation_pledges p
     where p.id = 'ab720000-0000-4000-8000-000000000001'
  ),
  'reserved',
  'claim no marca vencida una reserva cuyo plazo ya pasó'
);

-- ── Contador = suma de activas, tras reservar, cancelar, vencer y entregar ──

reset role;

select is(
  (
    select i.reserved_quantity = coalesce((
      select sum(p.quantity) from public.donation_pledges p
       where p.item_id = i.id and p.status in ('reserved', 'accepted')
    ), 0)
    and i.fulfilled_quantity = coalesce((
      select sum(p.quantity) from public.donation_pledges p
       where p.item_id = i.id and p.status = 'fulfilled'
    ), 0)
    from public.donation_items i
    where i.id = 'ab700000-0000-4000-8000-000000000005'
  ),
  true,
  'después de vencer y volver a reservar, el contador coincide con la suma'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$
    select public.cancel_donation_pledge(
      (select id from public.donation_pledges
        where item_id = 'ab700000-0000-4000-8000-000000000005'
          and status = 'reserved'
        limit 1)
    )
  $q$,
  'quien reservó puede cancelar la propia'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select pg_temp.traer('ab700000-0000-4000-8000-000000000006', 1) $q$,
  'se reserva una unidad para confirmar llegada'
);

reset role;

create temporary table total_antes as
  select received_minor
    from public.campaign_totals
   where campaign_id = 'c7000000-0000-4000-8000-000000000001'
     and currency = 'ARS';

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000ff", "role": "authenticated", "app_metadata": {"user_role": "admin"}}';

select lives_ok(
  $q$
    select public.accept_donation_pledge(
      (select id from public.donation_pledges
        where item_id = 'ab700000-0000-4000-8000-000000000006'
          and status = 'reserved'
        limit 1)
    )
  $q$,
  'admin confirma que van a donar'
);

select is(
  (select reserved_quantity
     from public.donation_items
    where id = 'ab700000-0000-4000-8000-000000000006'),
  1,
  'aceptar no mueve el contador'
);

select throws_ok(
  $q$
    select public.fulfill_donation_pledge(
      (select id from public.donation_pledges
        where item_id = 'ab700000-0000-4000-8000-000000000005'
          and status = 'reserved'
        limit 1)
    )
  $q$,
  'P0002',
  'no_encontrada',
  'de reserved no se marca llegada'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$
    select public.cancel_donation_pledge(
      (select id from public.donation_pledges
        where item_id = 'ab700000-0000-4000-8000-000000000006'
          and status = 'accepted'
        limit 1)
    )
  $q$,
  '42501',
  'sin_permiso',
  'quien donó no suelta una aceptada'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000ff", "role": "authenticated", "app_metadata": {"user_role": "admin"}}';

select lives_ok(
  $q$
    select public.fulfill_donation_pledge(
      (select id from public.donation_pledges
        where item_id = 'ab700000-0000-4000-8000-000000000006'
          and status = 'accepted'
        limit 1)
    )
  $q$,
  'admin confirma la llegada'
);

reset role;

select results_eq(
  $q$
    select received_minor
      from public.campaign_totals
     where campaign_id = 'c7000000-0000-4000-8000-000000000001'
       and currency = 'ARS'
  $q$,
  $q$ select received_minor from total_antes $q$,
  'registrar una donación en especie no mueve ningún total de dinero (SC-209, ADR-031)'
);

select is(
  (
    select i.reserved_quantity = coalesce((
      select sum(p.quantity) from public.donation_pledges p
       where p.item_id = i.id and p.status in ('reserved', 'accepted')
    ), 0)
    and i.fulfilled_quantity = coalesce((
      select sum(p.quantity) from public.donation_pledges p
       where p.item_id = i.id and p.status = 'fulfilled'
    ), 0)
    from public.donation_items i
    where i.id = 'ab700000-0000-4000-8000-000000000006'
  ),
  true,
  'después de entregar, el contador coincide con la suma de reservas activas y cumplidas'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$
    select public.cancel_donation_pledge(
      (select id from public.donation_pledges
        where item_id = 'ab700000-0000-4000-8000-000000000006'
          and status = 'fulfilled'
        limit 1),
      'Me arrepentí.'
    )
  $q$,
  '42501',
  'sin_permiso',
  'quien donó no suelta una ya confirmada'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000ff", "role": "authenticated", "app_metadata": {"user_role": "admin"}}';

select lives_ok(
  $q$
    select public.cancel_donation_pledge(
      (select id from public.donation_pledges
        where item_id = 'ab700000-0000-4000-8000-000000000006'
          and status = 'fulfilled'
        limit 1),
      'Se arrepintieron.'
    )
  $q$,
  'admin suelta un sí: donan'
);

reset role;

select is(
  (
    select i.fulfilled_quantity
      from public.donation_items i
     where i.id = 'ab700000-0000-4000-8000-000000000006'
  ),
  0,
  'al soltar lo donado, las unidades vuelven a faltar'
);

select results_eq(
  $q$
    select received_minor
      from public.campaign_totals
     where campaign_id = 'c7000000-0000-4000-8000-000000000001'
       and currency = 'ARS'
  $q$,
  $q$ select received_minor from total_antes $q$,
  'soltar una donación en especie no mueve ningún total de dinero'
);

select is(
  (
    select p.fulfilled_at
      from public.donation_pledges p
     where p.item_id = 'ab700000-0000-4000-8000-000000000006'
       and p.status = 'cancelled'
     limit 1
  ),
  null,
  'al soltar un Donado se limpia fulfilled_at (el muro recorta por esa fecha)'
);

-- ── Revertir un Donado desde Cerradas ───────────────────────────────────────

insert into public.donation_items (
  id, campaign_id, title, unit, needed_quantity,
  reserved_quantity, fulfilled_quantity, published_at
) values (
  'ab700000-0000-4000-8000-00000000000e',
  'c7000000-0000-4000-8000-000000000001',
  'Para revertir',
  'unidad',
  1,
  0,
  1,
  now()
);

insert into public.donation_pledges (
  id, item_id, user_id, quantity, status, expires_at, fulfilled_at
) values (
  'ab720000-0000-4000-8000-0000000000ee',
  'ab700000-0000-4000-8000-00000000000e',
  'ab710000-0000-4000-8000-0000000000a1',
  1,
  'fulfilled',
  now() + interval '14 days',
  now()
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$ select public.revert_donation_pledge('ab720000-0000-4000-8000-0000000000ee') $q$,
  '42501',
  'sin_permiso',
  'quien donó no revierte una ya confirmada'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000ff", "role": "authenticated", "app_metadata": {"user_role": "admin"}}';

select lives_ok(
  $q$ select public.revert_donation_pledge('ab720000-0000-4000-8000-0000000000ee') $q$,
  'admin revierte un Donado sin motivo'
);

reset role;

select is(
  (
    select i.fulfilled_quantity
      from public.donation_items i
     where i.id = 'ab700000-0000-4000-8000-00000000000e'
  ),
  0,
  'al revertir, las unidades vuelven al catálogo'
);

select is(
  (
    select p.cancel_reason
      from public.donation_pledges p
     where p.id = 'ab720000-0000-4000-8000-0000000000ee'
  ),
  'Revertida desde Cerradas',
  'sin motivo se guarda el texto fijo'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000ff", "role": "authenticated", "app_metadata": {"user_role": "admin"}}';

select throws_ok(
  $q$ select public.revert_donation_pledge('ab720000-0000-4000-8000-0000000000ee') $q$,
  'P0002',
  'no_encontrada',
  'revertir una que ya no está Donado no toca nada'
);

reset role;

-- ── Borrar la cuenta anonimiza la reserva (FR-240) ──────────────────────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000c1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select pg_temp.traer(
    'ab700000-0000-4000-8000-000000000004',
    1,
    false,
    'Quien se va',
    null
  ) $q$,
  'una cuenta habilitada reserva con nombre'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000c1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select public.delete_own_account() $q$,
  'la cuenta se borra desde /cuenta'
);

reset role;

select results_eq(
  $q$
    select is_anonymous, donor_display_name, user_id is null, contact_name, pickup_address
      from public.donation_pledges
     where item_id = 'ab700000-0000-4000-8000-000000000004'
       and status = 'reserved'
       and user_id is null
  $q$,
  $q$ values (true, null::text, true, null::text, null::text) $q$,
  'al borrar la cuenta, la reserva queda anónima, sin nombre, sin dirección y sin user_id (FR-240)'
);

-- ── Dos sesiones concurrentes por la última unidad (SC-202) ─────────────────

create extension if not exists dblink;

create temporary table concurrent_out (
  paso text primary key,
  detalle text
) on commit drop;

do $concurrencia$
declare
  v_conn text := format(
    'hostaddr=127.0.0.1 port=%s dbname=%s user=%s password=norma_local',
    current_setting('port'),
    current_database(),
    current_user
  );
  v_item uuid := 'ab730000-0000-4000-8000-000000000001';
  v_camp uuid := 'c7300000-0000-4000-8000-000000000001';
  v_a uuid := 'ab730000-0000-4000-8000-0000000000a1';
  v_b uuid := 'ab730000-0000-4000-8000-0000000000a2';
  v_admin uuid := 'ab730000-0000-4000-8000-0000000000ff';
  v_err text;
  v_count integer;
  v_remaining integer;
begin
  perform dblink_connect('setup', v_conn);
  perform dblink_exec('setup', format($s$
    insert into auth.users (id, email) values
      (%L, 'concurrente.a@ejemplo.invalid'),
      (%L, 'concurrente.b@ejemplo.invalid'),
      (%L, 'concurrente.admin@ejemplo.invalid');
    insert into public.campaigns (id, slug, title, summary, status, published_at)
      values (%L, 'obra-concurrencia', 'Obra concurrencia', 'Resumen', 'active', now());
    insert into public.donation_items (
      id, campaign_id, title, unit, needed_quantity, published_at
    ) values (%L, %L, 'Último concurrente', 'unidad', 1, now());
    insert into public.donor_profiles (
      id, approval_status, reviewed_at, reviewed_by, default_anonymous
    ) values
      (%L, 'approved', now(), %L, true),
      (%L, 'approved', now(), %L, true);
  $s$, v_a, v_b, v_admin, v_camp, v_item, v_camp, v_a, v_admin, v_b, v_admin));

  perform dblink_connect('sess_a', v_conn);
  perform dblink_connect('sess_b', v_conn);

  perform dblink_exec('sess_a', 'begin');
  perform dblink_exec('sess_b', 'begin');
  perform dblink_exec('sess_a', 'set role authenticated');
  perform dblink_exec('sess_b', 'set role authenticated');
  perform dblink_exec('sess_a', format(
    $s$ set request.jwt.claims = %L $s$,
    format(
      '{"sub": "%s", "role": "authenticated", "app_metadata": {}}',
      v_a
    )
  ));
  perform dblink_exec('sess_b', format(
    $s$ set request.jwt.claims = %L $s$,
    format(
      '{"sub": "%s", "role": "authenticated", "app_metadata": {}}',
      v_b
    )
  ));

  -- dblink_exec no admite un SELECT: "statement returning results not allowed".
  -- dblink() sí, y deja la transacción de A abierta con el lock de la fila.
  perform 1
    from dblink(
      'sess_a',
      format(
        'select 1 from public.claim_donation_item(%L, 1, true, null, null, ''bring'', %L, null, %L)',
        v_item, 'Ana', 'Riacho He Hé, Formosa'
      )
    ) as t(ok integer);

  perform dblink_send_query(
    'sess_b',
    format(
      'select 1 from public.claim_donation_item(%L, 1, true, null, null, ''bring'', %L, null, %L)',
      v_item, 'Ana', 'Riacho He Hé, Formosa'
    )
  );

  perform pg_sleep(0.2);
  perform dblink_exec('sess_a', 'commit');

  begin
    perform 1 from dblink_get_result('sess_b') as t(ok integer);
    insert into concurrent_out values ('b', 'gano');
  exception
    when others then
      insert into concurrent_out values (
        'b',
        case
          when sqlerrm like '%sin_disponibilidad%' then 'sin_disponibilidad'
          else sqlerrm
        end
      );
  end;

  -- Después de un error, dblink_get_result hay que llamarlo otra vez hasta
  -- vaciar el ciclo. Si no, el próximo comando en esa conexión falla con
  -- "another command is already in progress" y el bloque entero se revierte.
  begin
    perform 1 from dblink_get_result('sess_b') as t(ok integer);
  exception
    when others then
      null;
  end;

  begin
    perform dblink_exec('sess_b', 'rollback');
  exception
    when others then
      null;
  end;

  select count(*) into v_count
    from public.donation_pledges
   where item_id = v_item and status = 'reserved';

  select remaining_quantity into v_remaining
    from public.donation_catalog
   where id = v_item;

  insert into concurrent_out values (
    'conteo',
    format('reservas=%s remaining=%s', v_count, v_remaining)
  );

  perform dblink_exec('setup', format($s$
    delete from public.donation_pledges where item_id = %L;
    delete from public.donation_items where id = %L;
    delete from public.donor_profiles where id in (%L, %L);
    delete from public.campaigns where id = %L;
    delete from auth.users where id in (%L, %L, %L);
  $s$, v_item, v_item, v_a, v_b, v_camp, v_a, v_b, v_admin));

  perform dblink_disconnect('sess_a');
  perform dblink_disconnect('sess_b');
  perform dblink_disconnect('setup');
exception
  when others then
    insert into concurrent_out values ('error', sqlerrm)
    on conflict (paso) do update set detalle = excluded.detalle;
    begin
      perform dblink_exec('setup', format($s$
        delete from public.donation_pledges where item_id = %L;
        delete from public.donation_items where id = %L;
        delete from public.donor_profiles where id in (%L, %L);
        delete from public.campaigns where id = %L;
        delete from auth.users where id in (%L, %L, %L);
      $s$, v_item, v_item, v_a, v_b, v_camp, v_a, v_b, v_admin));
    exception
      when others then null;
    end;
    begin perform dblink_disconnect('sess_a'); exception when others then null; end;
    begin perform dblink_disconnect('sess_b'); exception when others then null; end;
    begin perform dblink_disconnect('setup'); exception when others then null; end;
end;
$concurrencia$;

select is(
  (select detalle from concurrent_out where paso = 'b'),
  'sin_disponibilidad',
  'la segunda sesión concurrente espera el lock y pierde con sin_disponibilidad (SC-202)'
);

select is(
  (select detalle from concurrent_out where paso = 'conteo'),
  'reservas=1 remaining=0',
  'después de la carrera queda una reserva y remaining = 0'
);

select is_empty(
  $q$ select detalle from concurrent_out where paso = 'error' $q$,
  'la prueba de concurrencia no se cayó por dblink ni por el entorno'
);

-- ── Cubrir con plata (ADR-041) ──────────────────────────────────────────────

insert into public.donation_items (
  id, campaign_id, title, unit, needed_quantity, published_at,
  estimated_unit_amount_minor, currency
) values (
  'ab700000-0000-4000-8000-000000000007',
  'c7000000-0000-4000-8000-000000000001',
  'Para cubrir con plata',
  'unidad',
  3,
  now(),
  15000000,
  'ARS'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select is(
  (
    select cover_channel::text
      from public.claim_donation_item(
        'ab700000-0000-4000-8000-000000000007',
        1,
        true,
        null,
        null,
        'bring',
        'Ana',
        null,
        'Riacho He Hé, Formosa'
      )
  ),
  'bring',
  'sin canal, la reserva es traer el objeto'
);

select is(
  (
    select cover_channel::text
      from public.claim_donation_item(
        'ab700000-0000-4000-8000-000000000007',
        1,
        true,
        null,
        null,
        'mercadopago'
      )
  ),
  'mercadopago',
  'cubrir con Mercado Pago queda anotado en la reserva'
);

-- ── Borrar ítem y donación aunque alguien se haya anotado ───────────────────

reset role;

insert into public.donation_items (
  id, campaign_id, title, unit, needed_quantity, reserved_quantity, published_at
) values (
  'ab700000-0000-4000-8000-00000000000a',
  'c7000000-0000-4000-8000-000000000001',
  'Para borrar con reserva',
  'unidad',
  4,
  1,
  now()
);

insert into public.donation_pledges (
  id, item_id, user_id, quantity, status, expires_at
) values (
  'ab720000-0000-4000-8000-0000000000aa',
  'ab700000-0000-4000-8000-00000000000a',
  'ab710000-0000-4000-8000-0000000000a1',
  1,
  'reserved',
  now() + interval '14 days'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$ select public.delete_donation_pledge('ab720000-0000-4000-8000-0000000000aa') $q$,
  '42501',
  null,
  'quien dona no puede borrar una reserva por la función'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000ff", "role": "authenticated", "app_metadata": {"user_role": "admin"}}';

select lives_ok(
  $q$ select public.delete_donation_pledge('ab720000-0000-4000-8000-0000000000aa') $q$,
  'admin puede borrar una reserva'
);

reset role;

select is(
  (select reserved_quantity from public.donation_items
    where id = 'ab700000-0000-4000-8000-00000000000a'),
  0,
  'al borrar la reserva, las unidades vuelven al contador'
);

insert into public.donation_pledges (
  id, item_id, user_id, quantity, status, expires_at
) values (
  'ab720000-0000-4000-8000-0000000000ab',
  'ab700000-0000-4000-8000-00000000000a',
  'ab710000-0000-4000-8000-0000000000a1',
  1,
  'reserved',
  now() + interval '14 days'
);

update public.donation_items
   set reserved_quantity = 1
 where id = 'ab700000-0000-4000-8000-00000000000a';

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000ff", "role": "authenticated", "app_metadata": {"user_role": "admin"}}';

select lives_ok(
  $q$ delete from public.donation_items where id = 'ab700000-0000-4000-8000-00000000000a' $q$,
  'admin puede borrar un ítem que tiene reservas'
);

reset role;

select is(
  (select count(*)::integer from public.donation_pledges
    where item_id = 'ab700000-0000-4000-8000-00000000000a'),
  0,
  'borrar el ítem se lleva las reservas'
);

-- ── Editar una reserved (update_donation_pledge) ────────────────────────────
-- a1 ya tiene 5 reserved de los casos de arriba: se inserta la fila, no se
-- llama a claim_donation_item (el tope vive en esa función).

insert into public.donation_items (
  id, campaign_id, title, unit, needed_quantity, reserved_quantity, published_at
) values (
  'ab700000-0000-4000-8000-0000000000ed',
  'c7000000-0000-4000-8000-000000000001',
  'Para editar reserva',
  'unidad',
  4,
  1,
  now()
), (
  'ab700000-0000-4000-8000-0000000000ef',
  'c7000000-0000-4000-8000-000000000001',
  'Para editar aviso',
  'unidad',
  2,
  1,
  now()
), (
  'ab700000-0000-4000-8000-0000000000ac',
  'c7000000-0000-4000-8000-000000000001',
  'Para editar aceptada',
  'unidad',
  1,
  1,
  now()
);

insert into public.donation_pledges (
  id, item_id, user_id, quantity, status, expires_at, contact_name, contact_phone
) values (
  'ab720000-0000-4000-8000-0000000000ed',
  'ab700000-0000-4000-8000-0000000000ed',
  'ab710000-0000-4000-8000-0000000000a1',
  1,
  'reserved',
  now() + interval '14 days',
  'Ana',
  null
), (
  'ab720000-0000-4000-8000-0000000000ef',
  'ab700000-0000-4000-8000-0000000000ef',
  null,
  1,
  'reserved',
  now() + interval '14 days',
  'Marta',
  '1155550000'
), (
  'ab720000-0000-4000-8000-0000000000ac',
  'ab700000-0000-4000-8000-0000000000ac',
  'ab710000-0000-4000-8000-0000000000a1',
  1,
  'reserved',
  now() + interval '14 days',
  null,
  null
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select public.update_donation_pledge(
    'ab720000-0000-4000-8000-0000000000ed',
    2
  ) $q$,
  'dueño edita la reserva de 1 a 2'
);

reset role;

select is(
  (select quantity from public.donation_pledges
    where id = 'ab720000-0000-4000-8000-0000000000ed'),
  2,
  'al subir, quantity queda en 2'
);

select is(
  (select reserved_quantity from public.donation_items
    where id = 'ab700000-0000-4000-8000-0000000000ed'),
  2,
  'al subir, reserved_quantity queda en 2'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select public.update_donation_pledge(
    'ab720000-0000-4000-8000-0000000000ed',
    1
  ) $q$,
  'dueño baja la reserva a 1'
);

reset role;

select is(
  (select reserved_quantity from public.donation_items
    where id = 'ab700000-0000-4000-8000-0000000000ed'),
  1,
  'al bajar, reserved_quantity queda en 1'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$ select public.update_donation_pledge(
    'ab720000-0000-4000-8000-0000000000ed',
    0
  ) $q$,
  '23514',
  'cantidad_invalida',
  'dueño no puede pedir 0'
);

select throws_ok(
  $q$ select public.update_donation_pledge(
    'ab720000-0000-4000-8000-0000000000ed',
    5
  ) $q$,
  '23514',
  'sin_disponibilidad',
  'dueño no puede pedir más que needed'
);

reset role;

select is(
  (select quantity from public.donation_pledges
    where id = 'ab720000-0000-4000-8000-0000000000ed'),
  1,
  'sin_disponibilidad no cambia quantity'
);

select is(
  (select reserved_quantity from public.donation_items
    where id = 'ab700000-0000-4000-8000-0000000000ed'),
  1,
  'sin_disponibilidad no cambia reserved_quantity'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select public.update_donation_pledge(
    'ab720000-0000-4000-8000-0000000000ed',
    1,
    null,
    null,
    '11 9999-0000'
  ) $q$,
  'dueño manda teléfono'
);

reset role;

select is(
  (select contact_phone from public.donation_pledges
    where id = 'ab720000-0000-4000-8000-0000000000ed'),
  null,
  'dueño no reescribe el teléfono'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select public.update_donation_pledge(
    'ab720000-0000-4000-8000-0000000000ed',
    1,
    'Traigo el sábado'
  ) $q$,
  'dueño cambia solo la nota'
);

reset role;

select is(
  (select donor_note from public.donation_pledges
    where id = 'ab720000-0000-4000-8000-0000000000ed'),
  'Traigo el sábado',
  'la nota nueva queda guardada'
);

select is(
  (select reserved_quantity from public.donation_items
    where id = 'ab700000-0000-4000-8000-0000000000ed'),
  1,
  'misma cantidad no mueve reserved_quantity'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000ff", "role": "authenticated", "app_metadata": {"user_role": "admin"}}';

select lives_ok(
  $q$ select public.update_donation_pledge(
    'ab720000-0000-4000-8000-0000000000ef',
    1,
    null,
    'Marta López',
    '11 5555-1111'
  ) $q$,
  'admin corrige nombre y teléfono de un aviso'
);

reset role;

select is(
  (select contact_name from public.donation_pledges
    where id = 'ab720000-0000-4000-8000-0000000000ef'),
  'Marta López',
  'admin actualiza el nombre de un aviso'
);

select is(
  (select contact_phone from public.donation_pledges
    where id = 'ab720000-0000-4000-8000-0000000000ef'),
  '11 5555-1111',
  'admin actualiza el teléfono de un aviso'
);

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000ff", "role": "authenticated", "app_metadata": {"user_role": "admin"}}';

select throws_ok(
  $q$ select public.update_donation_pledge(
    'ab720000-0000-4000-8000-0000000000ef',
    1,
    null,
    '',
    '11 5555-1111'
  ) $q$,
  '23514',
  'datos_de_retiro',
  'admin no puede vaciar el nombre de un aviso'
);

select lives_ok(
  $q$ select public.accept_donation_pledge(
    'ab720000-0000-4000-8000-0000000000ac'
  ) $q$,
  'admin acepta para el caso de edición'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$ select public.update_donation_pledge(
    'ab720000-0000-4000-8000-0000000000ac',
    1
  ) $q$,
  'P0002',
  'no_encontrada',
  'dueño no edita una accepted'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a2", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$ select public.update_donation_pledge(
    'ab720000-0000-4000-8000-0000000000ed',
    1
  ) $q$,
  '42501',
  'sin_permiso',
  'otro donante no edita la ajena'
);

reset role;

-- ── Dos sesiones piden la última unidad extra ───────────────────────────────

create temporary table update_concurrent_out (
  paso text primary key,
  detalle text
) on commit drop;

do $editar_concurrencia$
declare
  v_conn text := format(
    'hostaddr=127.0.0.1 port=%s dbname=%s user=%s password=norma_local',
    current_setting('port'),
    current_database(),
    current_user
  );
  v_item uuid := 'ab740000-0000-4000-8000-000000000001';
  v_camp uuid := 'c7400000-0000-4000-8000-000000000001';
  v_a uuid := 'ab740000-0000-4000-8000-0000000000a1';
  v_b uuid := 'ab740000-0000-4000-8000-0000000000a2';
  v_admin uuid := 'ab740000-0000-4000-8000-0000000000ff';
  v_pledge_a uuid := 'ab750000-0000-4000-8000-0000000000a1';
  v_pledge_b uuid := 'ab750000-0000-4000-8000-0000000000a2';
  v_count integer;
  v_remaining integer;
begin
  perform dblink_connect('upd_setup', v_conn);
  perform dblink_exec('upd_setup', format($s$
    insert into auth.users (id, email) values
      (%L, 'editar.a@ejemplo.invalid'),
      (%L, 'editar.b@ejemplo.invalid'),
      (%L, 'editar.admin@ejemplo.invalid');
    insert into public.campaigns (id, slug, title, summary, status, published_at)
      values (%L, 'obra-editar-concurrencia', 'Obra editar', 'Resumen', 'active', now());
    insert into public.donation_items (
      id, campaign_id, title, unit, needed_quantity, reserved_quantity, published_at
    ) values (%L, %L, 'Última extra', 'unidad', 3, 2, now());
    insert into public.donor_profiles (
      id, approval_status, reviewed_at, reviewed_by, default_anonymous
    ) values
      (%L, 'approved', now(), %L, true),
      (%L, 'approved', now(), %L, true);
    insert into public.donation_pledges (
      id, item_id, user_id, quantity, status, expires_at
    ) values
      (%L, %L, %L, 1, 'reserved', now() + interval '14 days'),
      (%L, %L, %L, 1, 'reserved', now() + interval '14 days');
  $s$, v_a, v_b, v_admin, v_camp, v_item, v_camp, v_a, v_admin, v_b, v_admin,
     v_pledge_a, v_item, v_a, v_pledge_b, v_item, v_b));

  perform dblink_connect('upd_a', v_conn);
  perform dblink_connect('upd_b', v_conn);

  perform dblink_exec('upd_a', 'begin');
  perform dblink_exec('upd_b', 'begin');
  perform dblink_exec('upd_a', 'set role authenticated');
  perform dblink_exec('upd_b', 'set role authenticated');
  perform dblink_exec('upd_a', format(
    $s$ set request.jwt.claims = %L $s$,
    format(
      '{"sub": "%s", "role": "authenticated", "app_metadata": {}}',
      v_a
    )
  ));
  perform dblink_exec('upd_b', format(
    $s$ set request.jwt.claims = %L $s$,
    format(
      '{"sub": "%s", "role": "authenticated", "app_metadata": {}}',
      v_b
    )
  ));

  perform 1
    from dblink(
      'upd_a',
      format(
        'select 1 from (select public.update_donation_pledge(%L, 2)) s',
        v_pledge_a
      )
    ) as t(ok integer);

  perform dblink_send_query(
    'upd_b',
    format(
      'select 1 from (select public.update_donation_pledge(%L, 2)) s',
      v_pledge_b
    )
  );

  perform pg_sleep(0.2);
  perform dblink_exec('upd_a', 'commit');

  begin
    perform 1 from dblink_get_result('upd_b') as t(ok integer);
    insert into update_concurrent_out values ('b', 'gano');
  exception
    when others then
      insert into update_concurrent_out values (
        'b',
        case
          when sqlerrm like '%sin_disponibilidad%' then 'sin_disponibilidad'
          else sqlerrm
        end
      );
  end;

  begin
    perform 1 from dblink_get_result('upd_b') as t(ok integer);
  exception
    when others then
      null;
  end;

  begin
    perform dblink_exec('upd_b', 'rollback');
  exception
    when others then
      null;
  end;

  select count(*) into v_count
    from public.donation_pledges
   where item_id = v_item and status = 'reserved';

  select remaining_quantity into v_remaining
    from public.donation_catalog
   where id = v_item;

  insert into update_concurrent_out values (
    'conteo',
    format('reservas=%s remaining=%s', v_count, v_remaining)
  );

  perform dblink_exec('upd_setup', format($s$
    delete from public.donation_pledges where item_id = %L;
    delete from public.donation_items where id = %L;
    delete from public.donor_profiles where id in (%L, %L);
    delete from public.campaigns where id = %L;
    delete from auth.users where id in (%L, %L, %L);
  $s$, v_item, v_item, v_a, v_b, v_camp, v_a, v_b, v_admin));

  perform dblink_disconnect('upd_a');
  perform dblink_disconnect('upd_b');
  perform dblink_disconnect('upd_setup');
exception
  when others then
    insert into update_concurrent_out values ('error', sqlerrm)
    on conflict (paso) do update set detalle = excluded.detalle;
    begin
      perform dblink_exec('upd_setup', format($s$
        delete from public.donation_pledges where item_id = %L;
        delete from public.donation_items where id = %L;
        delete from public.donor_profiles where id in (%L, %L);
        delete from public.campaigns where id = %L;
        delete from auth.users where id in (%L, %L, %L);
      $s$, v_item, v_item, v_a, v_b, v_camp, v_a, v_b, v_admin));
    exception
      when others then null;
    end;
    begin perform dblink_disconnect('upd_a'); exception when others then null; end;
    begin perform dblink_disconnect('upd_b'); exception when others then null; end;
    begin perform dblink_disconnect('upd_setup'); exception when others then null; end;
end;
$editar_concurrencia$;

select is(
  (select detalle from update_concurrent_out where paso = 'b'),
  'sin_disponibilidad',
  'la segunda sesión al pedir la última extra pierde con sin_disponibilidad'
);

select is(
  (select detalle from update_concurrent_out where paso = 'conteo'),
  'reservas=2 remaining=0',
  'después de la carrera quedan dos reservas y remaining = 0'
);

select is_empty(
  $q$ select detalle from update_concurrent_out where paso = 'error' $q$,
  'la prueba de edición concurrente no se cayó por dblink ni por el entorno'
);

select * from finish();
rollback;
