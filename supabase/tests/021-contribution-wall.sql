-- El muro de aportes en plata: qué ve `anon` y qué no.
--
-- Tres barreras, tres preguntas: `contributions` sigue sin GRANT ni policy para
-- `anon`; la vista no tiene columna de monto; y el porcentaje es `null` cuando el
-- interruptor está apagado, aunque se consulte la vista directo. Se prueban las
-- tres. Correr esto como superusuario no prueba la vista: bypassa RLS, no el
-- privilegio de la tabla.

begin;
select plan(16);

insert into public.campaigns (id, slug, title, summary, goal_amount_minor, goal_currency, status, published_at)
values
  ('c0420000-0000-4000-8000-000000000001', 'obra-del-muro', 'Obra del muro',
   'Campaña publicada', 500000000, 'ARS', 'active', now()),
  ('c0420000-0000-4000-8000-000000000002', 'obra-en-borrador', 'Obra en borrador',
   'Todavía no se publica', null, 'ARS', 'draft', null);

insert into public.contributions (
  id, campaign_id, amount_minor, currency, received_at,
  is_anonymous, contributor_display_name, voided_at, void_reason
)
values
  ('f0420000-0000-4000-8000-000000000001', 'c0420000-0000-4000-8000-000000000001',
   100000, 'ARS', date '2026-08-01', false, 'Vecina que aportó', null, null),
  ('f0420000-0000-4000-8000-000000000002', 'c0420000-0000-4000-8000-000000000001',
   50000, 'ARS', date '2026-08-02', true, null, null, null),
  ('f0420000-0000-4000-8000-000000000003', 'c0420000-0000-4000-8000-000000000001',
   20000, 'ARS', date '2026-08-03', false, 'Nombre anulado', now(), 'Transferencia devuelta'),
  ('f0420000-0000-4000-8000-000000000004', 'c0420000-0000-4000-8000-000000000001',
   500, 'ARS', date '2026-08-04', false, 'Aporte chico', null, null),
  ('f0420000-0000-4000-8000-000000000005', 'c0420000-0000-4000-8000-000000000002',
   80000, 'ARS', date '2026-08-05', false, 'De la campaña en borrador', null, null);

select throws_ok(
  $s$
    insert into public.contributions (
      campaign_id, amount_minor, currency, received_at, is_anonymous, contributor_display_name
    ) values (
      'c0420000-0000-4000-8000-000000000001', 1000, 'ARS', date '2026-08-06', false, null
    )
  $s$,
  '23514',
  null,
  'no se puede publicar un aporte sin nombre: is_anonymous false exige contributor_display_name'
);

select throws_ok(
  $s$
    insert into public.contributions (
      campaign_id, amount_minor, currency, received_at, is_anonymous, contributor_display_name
    ) values (
      'c0420000-0000-4000-8000-000000000001', 1000, 'ARS', date '2026-08-06', false, '   '
    )
  $s$,
  '23514',
  null,
  'un nombre de sólo espacios no es un nombre'
);

select has_function(
  'private',
  'contribution_wall_for',
  array['uuid'],
  'existe private.contribution_wall_for, la única vía pública del muro de aportes'
);

select is(
  (
    select p.prosecdef
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private' and p.proname = 'contribution_wall_for'
  ),
  true,
  'contribution_wall_for es security definer: sin eso, anon no vería ninguna fila'
);

select ok(
  pg_get_function_result('private.contribution_wall_for(uuid)'::regprocedure)
    !~ 'amount',
  'la función no declara ninguna columna de monto'
);

select has_view('public', 'contribution_wall', 'existe la vista pública del muro de aportes');

select isnt_empty(
  $q$
    select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'contribution_wall'
       and coalesce(array_to_string(c.reloptions, ','), '') ~ 'security_invoker=(true|on)'
  $q$,
  'contribution_wall declara security_invoker: sin eso bypasea RLS (I3)'
);

select is(
  (
    select coalesce(array_agg(column_name::text order by column_name), '{}')
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'contribution_wall'
  ),
  array[
    'campaign_id',
    'currency',
    'donor_display_name',
    'id',
    'percent_of_received',
    'received_at'
  ]::text[],
  'la vista tiene exactamente esas columnas: no hay amount_minor'
);

set local role anon;

select throws_ok(
  'select * from public.contributions',
  '42501',
  'permission denied for table contributions',
  'anon no puede leer contributions: el muro no abre la tabla (I2)'
);

select throws_ok(
  'select amount_minor from public.contribution_wall',
  '42703',
  null,
  'nombrar amount_minor en contribution_wall falla: la columna no existe'
);

select lives_ok(
  $q$ select * from private.contribution_wall_for('c0420000-0000-4000-8000-000000000001') $q$,
  'anon sí puede ejecutar private.contribution_wall_for: es de lo que vive la vista'
);

select results_eq(
  $q$
    select donor_display_name, percent_of_received
      from public.contribution_wall
     where campaign_id = 'c0420000-0000-4000-8000-000000000001'
     order by donor_display_name
  $q$,
  $q$
    values ('Aporte chico'::text, null::integer),
           ('Vecina que aportó'::text, null::integer)
  $q$,
  'con el interruptor apagado el muro nombra y el porcentaje es null'
);

select is_empty(
  $q$
    select donor_display_name
      from public.contribution_wall
     where donor_display_name in ('Nombre anulado', 'De la campaña en borrador')
        or donor_display_name is null
  $q$,
  'anulado, anónimo y campaña en borrador no existen para anon'
);

reset role;

update public.campaigns
   set publish_contribution_share = true
 where id = 'c0420000-0000-4000-8000-000000000001';

set local role anon;

-- Recibido ARS = 100000 (nombrado) + 50000 (anónimo) + 500 (chico) = 150500.
-- 100000 * 100 / 150500 = 66.  500 * 100 / 150500 = 0 → null.
select results_eq(
  $q$
    select donor_display_name, percent_of_received
      from public.contribution_wall
     where campaign_id = 'c0420000-0000-4000-8000-000000000001'
     order by donor_display_name
  $q$,
  $q$
    values ('Aporte chico'::text, null::integer),
           ('Vecina que aportó'::text, 66)
  $q$,
  'con el interruptor prendido el % se calcula en la base y el 0% se omite'
);

select is_empty(
  $q$
    select 1
      from public.contribution_wall
     where percent_of_received = 0
  $q$,
  'ninguna fila publica 0%: se omite, no se finge un dato'
);

select results_eq(
  $q$
    select donor_display_name, percent_of_received
      from private.contribution_wall_for('c0420000-0000-4000-8000-000000000002')
  $q$,
  $q$ select null::text, null::integer where false $q$,
  'la función no devuelve la campaña en borrador aunque se la invoque directo'
);

reset role;

select * from finish();
rollback;
