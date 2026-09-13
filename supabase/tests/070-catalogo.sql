-- El catálogo de donaciones en especie: qué falta, y que no se puede pedir de más.
--
-- Fase C: la tabla, el check de no-sobreventa y la vista pública. Las reservas
-- concurrentes, el tope por cuenta y el vencimiento sin cron llegan en la fase D,
-- en este mismo archivo, cuando existan `donation_pledges` y las funciones.

begin;
select plan(17);

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
);

-- ── Estructura ──────────────────────────────────────────────────────────────

select has_table('public', 'donation_items', 'existe donation_items');
select has_view('public', 'donation_catalog', 'existe la vista pública del catálogo');
select has_type('public', 'donation_unit', 'existe el enum donation_unit');

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

select is_empty(
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
  'la vista pública no tiene el valor estimado (D3)'
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

select * from finish();
rollback;
