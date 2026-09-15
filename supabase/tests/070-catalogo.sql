-- El catálogo de donaciones en especie: qué falta, y que no se puede pedir de más.
--
-- Fase C: la tabla, el check de no-sobreventa y la vista pública.
-- Fase D: reservas concurrentes, tope por cuenta, vencimiento sin cron (FR-218).

begin;
select plan(56);

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
);

insert into auth.users (id, email) values
  ('ab710000-0000-4000-8000-0000000000a1', 'reserva.a@ejemplo.invalid'),
  ('ab710000-0000-4000-8000-0000000000a2', 'reserva.b@ejemplo.invalid'),
  ('ab710000-0000-4000-8000-0000000000b1', 'reserva.pendiente@ejemplo.invalid'),
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
  );

insert into public.contributions (
  campaign_id, amount_minor, currency, received_at
) values (
  'c7000000-0000-4000-8000-000000000001', 100000, 'ARS', date '2026-08-01'
);

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
  array['uuid', 'integer', 'boolean', 'text', 'text', 'donation_cover_channel']::name[],
  'existe claim_donation_item()'
);

select has_function(
  'public', 'cancel_donation_pledge',
  array['uuid', 'text']::name[],
  'existe cancel_donation_pledge()'
);

select has_function(
  'public', 'fulfill_donation_pledge',
  array['uuid']::name[],
  'existe fulfill_donation_pledge()'
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

-- ── Cuenta pendiente no reserva (ADR-033) ───────────────────────────────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000b1", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$ select public.claim_donation_item('ab700000-0000-4000-8000-000000000003') $q$,
  '42501',
  'sin_habilitacion',
  'una cuenta pendiente no reserva: confirmar el correo no habilita'
);

-- ── Dos reservas secuenciales por la última unidad ──────────────────────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select public.claim_donation_item('ab700000-0000-4000-8000-000000000003') $q$,
  'la primera sesión se lleva el último ejemplar'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a2", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$ select public.claim_donation_item('ab700000-0000-4000-8000-000000000003') $q$,
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
    select public.claim_donation_item('ab700000-0000-4000-8000-000000000004', 1)
      from generate_series(1, 5)
  $q$,
  'cinco reservas activas es el tope, y se alcanzan'
);

select throws_ok(
  $q$ select public.claim_donation_item('ab700000-0000-4000-8000-000000000004', 1) $q$,
  'P0001',
  'demasiadas_reservas',
  'la sexta reserva activa por cuenta se rechaza (FR-219)'
);

-- ── Vencimiento sin cron (FR-218) ───────────────────────────────────────────

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
  1,
  'release_expired_holds libera la reserva vencida de ese ítem'
);

select results_eq(
  $q$
    select reserved_quantity
      from public.donation_items
     where id = 'ab700000-0000-4000-8000-000000000005'
  $q$,
  $q$ values (0) $q$,
  'al vencer, las unidades vuelven al contador'
);

insert into public.donation_pledges (
  id, item_id, user_id, quantity, status, expires_at
) values (
  'ab720000-0000-4000-8000-000000000002',
  'ab700000-0000-4000-8000-000000000005',
  'ab710000-0000-4000-8000-0000000000a1',
  1,
  'reserved',
  now() - interval '1 hour'
);

update public.donation_items
   set reserved_quantity = 1
 where id = 'ab700000-0000-4000-8000-000000000005';

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000a1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select public.claim_donation_item('ab700000-0000-4000-8000-000000000005', 1) $q$,
  'claim_donation_item libera lo vencido del ítem que va a tocar y se lo lleva'
);

-- ── Contador = suma de activas, tras reservar, cancelar, vencer y entregar ──

reset role;

select is(
  (
    select i.reserved_quantity = coalesce((
      select sum(p.quantity) from public.donation_pledges p
       where p.item_id = i.id and p.status = 'reserved'
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
  $q$ select public.claim_donation_item('ab700000-0000-4000-8000-000000000006', 1) $q$,
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
    select public.fulfill_donation_pledge(
      (select id from public.donation_pledges
        where item_id = 'ab700000-0000-4000-8000-000000000006'
          and status = 'reserved'
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
       where p.item_id = i.id and p.status = 'reserved'
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

-- ── Borrar la cuenta anonimiza la reserva (FR-240) ──────────────────────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab710000-0000-4000-8000-0000000000c1", "role": "authenticated", "app_metadata": {}}';

select lives_ok(
  $q$ select public.claim_donation_item(
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
    select is_anonymous, donor_display_name, user_id is null
      from public.donation_pledges
     where item_id = 'ab700000-0000-4000-8000-000000000004'
       and status = 'reserved'
       and user_id is null
  $q$,
  $q$ values (true, null::text, true) $q$,
  'al borrar la cuenta, la reserva queda anónima, sin nombre y sin user_id (FR-240)'
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
      format('select 1 from public.claim_donation_item(%L)', v_item)
    ) as t(ok integer);

  perform dblink_send_query(
    'sess_b',
    format('select 1 from public.claim_donation_item(%L)', v_item)
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
      from public.claim_donation_item('ab700000-0000-4000-8000-000000000007', 1)
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

select * from finish();
rollback;
