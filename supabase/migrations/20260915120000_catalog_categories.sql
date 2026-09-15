-- Categorías del catálogo y metro cúbico (FR-253).
--
-- El catálogo deja de ser una lista plana: cada ítem pertenece a una categoría
-- cerrada, en el orden de la obra. `metro_cubico` entra como unidad para arena
-- y ripio. No se usa el valor nuevo en esta migración: Postgres no deja
-- referenciar un enum recién agregado en la misma transacción.

alter type public.donation_unit add value if not exists 'metro_cubico';

create type public.donation_item_category as enum (
  'materiales',
  'aberturas',
  'instalaciones',
  'electrodomesticos',
  'muebles',
  'ajuar'
);

alter table public.donation_items
  add column category public.donation_item_category not null default 'materiales';

comment on column public.donation_items.category is
  'Categoría cerrada del catálogo público (FR-253). El default cubre filas ya cargadas.';

drop view if exists public.donation_catalog;

create view public.donation_catalog
  with (security_invoker = true)
as
select
  i.id,
  i.campaign_id,
  i.budget_item_id,
  i.title,
  i.description,
  i.unit,
  i.category,
  i.needed_quantity,
  i.needed_quantity - i.reserved_quantity - i.fulfilled_quantity as remaining_quantity,
  i.fulfilled_quantity,
  i.photo_media_id,
  i.sort_order
from public.donation_items i
where i.published_at is not null;

comment on view public.donation_catalog is
  'Catálogo público: qué falta, agrupable por categoría. Sin valor estimado, sin borradores, security_invoker.';

grant select on public.donation_catalog to anon, authenticated;

grant insert (category) on public.donation_items to authenticated;
grant update (category) on public.donation_items to authenticated;
