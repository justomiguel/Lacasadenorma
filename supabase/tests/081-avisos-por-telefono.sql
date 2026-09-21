-- Avisos por teléfono: reservan a nombre de esa persona (ADR-051).
--
-- La función es la única vía. anon puede ejecutarla. Un aviso mueve
-- reserved_quantity. Un mismo teléfono no deja dos reservas del mismo ítem.
-- El sí del admin acepta y nombra; la llegada es un segundo paso. El no suelta.

begin;
select plan(28);

insert into auth.users (id, email) values
  ('ab810000-0000-4000-8000-0000000000ff', 'avisos.admin@ejemplo.invalid');

insert into public.campaigns (id, slug, title, summary, status, published_at) values
  ('c8100000-0000-4000-8000-000000000001', 'obra-avisos', 'Obra de avisos', 'Resumen', 'active', now());

insert into public.donation_items (
  id, campaign_id, title, unit, needed_quantity, reserved_quantity, fulfilled_quantity, published_at
) values (
  'ab810000-0000-4000-8000-000000000001',
  'c8100000-0000-4000-8000-000000000001',
  'Chapas para avisar',
  'unidad',
  4,
  0,
  0,
  now()
), (
  'ab810000-0000-4000-8000-000000000002',
  'c8100000-0000-4000-8000-000000000001',
  'Arena en borrador',
  'bolsa',
  8,
  0,
  0,
  null
), (
  'ab810000-0000-4000-8000-000000000003',
  'c8100000-0000-4000-8000-000000000001',
  'Ya cubierto',
  'unidad',
  1,
  1,
  0,
  now()
), (
  'ab810000-0000-4000-8000-000000000004',
  'c8100000-0000-4000-8000-000000000001',
  'Para soltar',
  'unidad',
  1,
  0,
  0,
  now()
);

select has_table('public', 'donation_offers', 'existe donation_offers');

select has_function(
  'public', 'offer_donation_item',
  array['uuid', 'text', 'text']::name[],
  'existe offer_donation_item()'
);

select ok(
  not has_table_privilege('anon', 'public.donation_offers', 'SELECT'),
  'anon no tiene SELECT: el aviso no es público'
);

select ok(
  not has_table_privilege('authenticated', 'public.donation_offers', 'INSERT'),
  'authenticated no tiene INSERT: los avisos los crea la función'
);

select function_privs_are(
  'public', 'offer_donation_item', array['uuid', 'text', 'text']::name[],
  'anon', array['EXECUTE']::text[],
  'anon puede ejecutar offer_donation_item: es el camino sin cuenta'
);

set local role anon;

select lives_ok(
  $q$
    select public.offer_donation_item(
      'ab810000-0000-4000-8000-000000000001',
      'Ana',
      '11 1234-5678'
    )
  $q$,
  'anon deja un aviso por teléfono'
);

reset role;

select is(
  (select reserved_quantity
     from public.donation_items
    where id = 'ab810000-0000-4000-8000-000000000001'),
  1,
  'un aviso mueve reserved_quantity'
);

select is(
  (select count(*)::integer from public.donation_offers),
  1,
  'quedó una sola fila'
);

select is(
  (select count(*)::integer
     from public.donation_pledges
    where item_id = 'ab810000-0000-4000-8000-000000000001'
      and status = 'reserved'
      and is_anonymous = true
      and donor_display_name is null
      and user_id is null
      and contact_name = 'Ana'),
  1,
  'la reserva queda anotada a quien avisó, anónima, sin cuenta'
);

set local role anon;

select lives_ok(
  $q$
    select public.offer_donation_item(
      'ab810000-0000-4000-8000-000000000001',
      'Ana María',
      '11 1234-5678'
    )
  $q$,
  'el mismo teléfono en el mismo ítem no falla: actualiza el nombre'
);

reset role;

select is(
  (select count(*)::integer from public.donation_offers),
  1,
  'un mismo teléfono no deja dos avisos del mismo ítem'
);

select is(
  (select reserved_quantity
     from public.donation_items
    where id = 'ab810000-0000-4000-8000-000000000001'),
  1,
  'el segundo aviso no vuelve a reservar'
);

select is(
  (select contact_name from public.donation_offers),
  'Ana María',
  'el segundo aviso actualiza el nombre'
);

select is(
  (select contact_name
     from public.donation_pledges
    where item_id = 'ab810000-0000-4000-8000-000000000001'
      and status = 'reserved'),
  'Ana María',
  'el nombre de contacto de la reserva se actualiza'
);

select is(
  (select donor_display_name
     from public.donation_pledges
    where item_id = 'ab810000-0000-4000-8000-000000000001'
      and status = 'reserved'),
  null,
  'el segundo aviso no publica el nombre'
);

set local role anon;

select throws_ok(
  $q$
    select public.offer_donation_item(
      'ab810000-0000-4000-8000-000000000002',
      'Ana',
      '11 1234-5678'
    )
  $q$,
  'P0001',
  'sin_disponibilidad',
  'un ítem sin publicar no admite aviso'
);

select throws_ok(
  $q$
    select public.offer_donation_item(
      'ab810000-0000-4000-8000-000000000003',
      'Ana',
      '11 9999-0000'
    )
  $q$,
  'P0001',
  'sin_disponibilidad',
  'un ítem sin unidades no admite aviso'
);

select throws_ok(
  $q$
    select public.offer_donation_item(
      'ab810000-0000-4000-8000-000000000001',
      '   ',
      '11 1234-5678'
    )
  $q$,
  'P0001',
  'datos_de_retiro',
  'sin nombre no hay aviso'
);

select throws_ok(
  $q$
    select public.offer_donation_item(
      'ab810000-0000-4000-8000-000000000001',
      'Ana',
      '123'
    )
  $q$,
  'P0001',
  'telefono_invalido',
  'un teléfono sin dígitos de más no alcanza'
);

select lives_ok(
  $q$
    select public.offer_donation_item(
      'ab810000-0000-4000-8000-000000000004',
      'Luis',
      '11 0000-1111'
    )
  $q$,
  'otro ítem admite otro aviso'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "10000000-0000-4000-8000-000000000003", "role": "authenticated", "app_metadata": {}}';

select is(
  (select count(*)::integer from public.donation_offers),
  0,
  'una cuenta del público no lee los avisos: can_read_donors() no la incluye'
);

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "ab810000-0000-4000-8000-0000000000ff", "role": "authenticated", "app_metadata": {"user_role": "admin"}}';

select lives_ok(
  $q$
    select public.accept_donation_pledge(
      (select pledge_id from public.donation_offers
        where item_id = 'ab810000-0000-4000-8000-000000000001'),
      'Ana María',
      'La dejan el sábado.'
    )
  $q$,
  'el admin confirma que van a donar y carga el nombre si aceptaron'
);

select is(
  (select count(*)::integer
     from public.donation_wall
    where item_id = 'ab810000-0000-4000-8000-000000000001'),
  0,
  'el sí no publica en el muro'
);

select lives_ok(
  $q$
    select public.fulfill_donation_pledge(
      (select pledge_id from public.donation_offers
        where item_id = 'ab810000-0000-4000-8000-000000000001')
    )
  $q$,
  'el admin confirma la llegada'
);

select lives_ok(
  $q$
    select public.cancel_donation_pledge(
      (select pledge_id from public.donation_offers
        where item_id = 'ab810000-0000-4000-8000-000000000004'),
      'El equipo no confirmó el contacto.'
    )
  $q$,
  'el admin suelta la reserva'
);

reset role;

select is(
  (select donor_display_name
     from public.donation_wall
    where item_id = 'ab810000-0000-4000-8000-000000000001'),
  'Ana María',
  'la llegada aparece en el muro con el nombre'
);

select ok(
  (select fulfilled_at is not null
     from public.donation_wall
    where item_id = 'ab810000-0000-4000-8000-000000000001'),
  'el sí lleva la fecha'
);

select is(
  (select reserved_quantity
     from public.donation_items
    where id = 'ab810000-0000-4000-8000-000000000004'),
  0,
  'el no devuelve las unidades'
);

select * from finish();
rollback;
