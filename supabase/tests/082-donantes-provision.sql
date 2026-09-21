-- Provisión de una cuenta de quien donó por fuera, y llegada sin reserva.
--
-- `provision_donor_account` es la única vía para nacer `approved`. El insert
-- autenticado sigue exigiendo `pending`. `record_donor_arrival` copia el
-- chequeo de cupo de `claim_donation_item` y deja la reserva `fulfilled`.
-- Las cuentas, la campaña y el ítem se insertan acá y se revierten al terminar.

begin;
select plan(20);

insert into auth.users (id, email) values
  ('82000000-0000-4000-8000-000000000001', 'provision.editor@ejemplo.invalid'),
  ('82000000-0000-4000-8000-000000000002', 'provision.dona@ejemplo.invalid'),
  ('82000000-0000-4000-8000-000000000003', 'provision.admin@ejemplo.invalid'),
  ('82000000-0000-4000-8000-000000000004', 'provision.owner@ejemplo.invalid'),
  ('82000000-0000-4000-8000-000000000005', 'provision.afuera@ejemplo.invalid'),
  ('82000000-0000-4000-8000-000000000006', 'provision.pide@ejemplo.invalid');

insert into public.user_roles (user_id, role) values
  ('82000000-0000-4000-8000-000000000001', 'editor'),
  ('82000000-0000-4000-8000-000000000003', 'admin'),
  ('82000000-0000-4000-8000-000000000004', 'owner');

insert into public.campaigns (id, slug, title, summary, status, published_at) values
  ('c8200000-0000-4000-8000-000000000001', 'obra-provision', 'Obra de provisión', 'Resumen', 'active', now());

insert into public.donation_items (
  id, campaign_id, title, unit, needed_quantity, reserved_quantity, fulfilled_quantity, published_at
) values (
  'ab820000-0000-4000-8000-000000000001',
  'c8200000-0000-4000-8000-000000000001',
  'Chapas que ya llegaron',
  'unidad',
  1,
  0,
  0,
  now()
);

-- ── Estructura ──────────────────────────────────────────────────────────────

select has_column(
  'public', 'donor_profiles', 'contact_phone',
  'el perfil guarda un teléfono de coordinación, optativo'
);

select has_column(
  'public', 'contributions', 'user_id',
  'el aporte se puede atar a una persona'
);

select has_index(
  'public', 'contributions', 'contributions_user_idx',
  array['user_id']::name[],
  'contributions(user_id): lo recorre atar un aporte a una ficha'
);

select has_function(
  'public', 'provision_donor_account',
  array['uuid', 'text', 'text']::name[],
  'existe provision_donor_account()'
);

select has_function(
  'public', 'record_donor_arrival',
  array['uuid', 'uuid', 'integer', 'text']::name[],
  'existe record_donor_arrival()'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.provision_donor_account(uuid, text, text)',
    'execute'
  ),
  'authenticated puede ejecutar provision_donor_account: el cuerpo pide admin'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.record_donor_arrival(uuid, uuid, integer, text)',
    'execute'
  ),
  'authenticated puede ejecutar record_donor_arrival: el cuerpo pide admin'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.provision_donor_account(uuid, text, text)',
    'execute'
  ),
  'anon no puede ejecutar provision_donor_account'
);

-- ── Quién no puede provisionar ──────────────────────────────────────────────

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "82000000-0000-4000-8000-000000000001", "role": "authenticated",
    "app_metadata": {"user_role": "editor"}}';

select throws_ok(
  $q$
    select public.provision_donor_account(
      '82000000-0000-4000-8000-000000000005',
      'Vecina de afuera',
      '11 1234-5678'
    )
  $q$,
  '42501',
  'sin_permiso',
  'editor no provisiona una cuenta: pide admin'
);

reset role;
set local "request.jwt.claims" = '';

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "82000000-0000-4000-8000-000000000002", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$
    select public.provision_donor_account(
      '82000000-0000-4000-8000-000000000005',
      'Vecina de afuera',
      '11 1234-5678'
    )
  $q$,
  '42501',
  'sin_permiso',
  'una cuenta del público no se provisiona a sí misma ni a otra'
);

reset role;
set local "request.jwt.claims" = '';

-- ── Admin provisiona: nace approved con reviewed_by ─────────────────────────

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "82000000-0000-4000-8000-000000000003", "role": "authenticated",
    "app_metadata": {"user_role": "admin"}}';

select lives_ok(
  $q$
    select public.provision_donor_account(
      '82000000-0000-4000-8000-000000000005',
      'Vecina de afuera',
      '11 1234-5678'
    )
  $q$,
  'admin provisiona una cuenta aprobada'
);

reset role;
set local "request.jwt.claims" = '';

select results_eq(
  $q$
    select approval_status, reviewed_by, contact_phone
      from public.donor_profiles
     where id = '82000000-0000-4000-8000-000000000005'
  $q$,
  $q$
    values (
      'approved'::text,
      '82000000-0000-4000-8000-000000000003'::uuid,
      '11 1234-5678'::text
    )
  $q$,
  'la cuenta nace approved, con quién la revisó y el teléfono de coordinación'
);

-- El insert autenticado sigue exigiendo pending. Esta función es la única vía.

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "82000000-0000-4000-8000-000000000006", "role": "authenticated", "app_metadata": {}}';

select throws_ok(
  $q$
    insert into public.donor_profiles (id, approval_status)
    values ('82000000-0000-4000-8000-000000000006', 'approved')
  $q$,
  '42501',
  null,
  'un insert autenticado con approval_status = approved sigue negado'
);

reset role;
set local "request.jwt.claims" = '';

-- ── Llegada: sin cupo falla; con cupo deja fulfilled ────────────────────────

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "82000000-0000-4000-8000-000000000003", "role": "authenticated",
    "app_metadata": {"user_role": "admin"}}';

select throws_ok(
  $q$
    select public.record_donor_arrival(
      '82000000-0000-4000-8000-000000000005',
      'ab820000-0000-4000-8000-000000000001',
      2,
      'Vecina de afuera'
    )
  $q$,
  'P0001',
  'sin_cupo',
  'record_donor_arrival sin cupo levanta sin_cupo'
);

reset role;
set local "request.jwt.claims" = '';

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "82000000-0000-4000-8000-000000000004", "role": "authenticated",
    "app_metadata": {"user_role": "owner"}}';

select lives_ok(
  $q$
    select public.record_donor_arrival(
      '82000000-0000-4000-8000-000000000005',
      'ab820000-0000-4000-8000-000000000001',
      1,
      'Vecina de afuera'
    )
  $q$,
  'owner anota la llegada cuando hay cupo'
);

reset role;
set local "request.jwt.claims" = '';

select is(
  (
    select status
      from public.donation_pledges
     where item_id = 'ab820000-0000-4000-8000-000000000001'
       and user_id = '82000000-0000-4000-8000-000000000005'
  ),
  'fulfilled'::public.pledge_status,
  'la llegada queda fulfilled: no hay reserva previa que confirmar'
);

select is(
  (
    select fulfilled_quantity
      from public.donation_items
     where id = 'ab820000-0000-4000-8000-000000000001'
  ),
  1,
  'fulfilled_quantity suma la cantidad llegada, una sola vez'
);

-- ── Aporte atado; anon no lee contributions ─────────────────────────────────

select lives_ok(
  $q$
    insert into public.contributions (
      campaign_id, amount_minor, currency, received_at, user_id
    ) values (
      'c8200000-0000-4000-8000-000000000001',
      100000,
      'ARS',
      date '2026-08-01',
      '82000000-0000-4000-8000-000000000005'
    )
  $q$,
  'un aporte se inserta atado a la persona'
);

select is(
  (
    select user_id
      from public.contributions
     where campaign_id = 'c8200000-0000-4000-8000-000000000001'
  ),
  '82000000-0000-4000-8000-000000000005'::uuid,
  'el user_id del aporte queda persistido'
);

set local role anon;

select throws_ok(
  'select * from public.contributions',
  '42501',
  'permission denied for table contributions',
  'anon no puede leer contributions'
);

reset role;

select * from finish();
rollback;
