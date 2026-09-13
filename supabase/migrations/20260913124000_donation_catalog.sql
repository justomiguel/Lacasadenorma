-- Catálogo de donaciones en especie (FR-210 a FR-215).
--
-- Qué le falta a la casa, en qué unidad y cuánto. Las reservas —quién se
-- comprometió a traer qué— llegan en la migración siguiente. Los dos contadores
-- derivados nacen acá en cero y los mueve sólo esa migración: el `check` de
-- no-sobreventa es la garantía que no depende de las funciones (ADR-029).

-- ── Unidad ──────────────────────────────────────────────────────────────────

create type public.donation_unit as enum (
  'unidad',
  'metro',
  'metro_cuadrado',
  'bolsa',
  'litro',
  'juego'
);

-- ── donation_items ──────────────────────────────────────────────────────────

create table public.donation_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  budget_item_id uuid references public.budget_items (id) on delete set null,
  title text not null,
  description text,
  unit public.donation_unit not null,
  needed_quantity integer not null,
  reserved_quantity integer not null default 0,
  fulfilled_quantity integer not null default 0,
  -- Valor de referencia interno. No se publica (D3): no está en la vista.
  estimated_unit_amount_minor bigint,
  currency char(3),
  photo_media_id uuid references public.media (id) on delete set null,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint donation_items_title_not_blank check (length(btrim(title)) > 0),
  constraint donation_items_needed_positive check (needed_quantity > 0),
  constraint donation_items_not_oversubscribed check (
    reserved_quantity >= 0
    and fulfilled_quantity >= 0
    and reserved_quantity + fulfilled_quantity <= needed_quantity
  ),
  constraint donation_items_value_with_currency check (
    (estimated_unit_amount_minor is null) = (currency is null)
  ),
  constraint donation_items_value_positive check (
    estimated_unit_amount_minor is null or estimated_unit_amount_minor > 0
  ),
  constraint donation_items_currency_format check (
    currency is null or currency ~ '^[A-Z]{3}$'
  )
);

comment on column public.donation_items.reserved_quantity is
  'Derivada. La mueven sólo las funciones de reserva; el GRANT de columna las deja afuera.';
comment on column public.donation_items.fulfilled_quantity is
  'Derivada. Ídem reserved_quantity.';
comment on column public.donation_items.estimated_unit_amount_minor is
  'Valor de referencia interno. Nulo = no hay cifra; nunca cero. No se publica (D3).';
comment on column public.donation_items.published_at is
  'Nulo = no se ofrece. La vista pública no lo incluye: filtra acá (FR-215).';

create index donation_items_campaign_idx
  on public.donation_items (campaign_id, sort_order);
create index donation_items_published_at_idx
  on public.donation_items (published_at);
create index donation_items_budget_item_idx
  on public.donation_items (budget_item_id)
  where budget_item_id is not null;
create index donation_items_photo_idx
  on public.donation_items (photo_media_id)
  where photo_media_id is not null;

create trigger donation_items_touch_updated_at
  before update on public.donation_items
  for each row execute function private.touch_updated_at();

alter table public.donation_items enable row level security;

-- ── Vista pública ───────────────────────────────────────────────────────────
-- `remaining_quantity` se calcula acá (FR-210). El valor estimado no entra: es
-- la aplicación de D3 en el único lugar donde no depende de que nadie se acuerde.
-- `where published_at is not null` es FR-215 en la vista, además de la policy
-- sobre la tabla: un editor con sesión no ve borradores por este camino.

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
  i.needed_quantity,
  i.needed_quantity - i.reserved_quantity - i.fulfilled_quantity as remaining_quantity,
  i.fulfilled_quantity,
  i.photo_media_id,
  i.sort_order
from public.donation_items i
where i.published_at is not null;

comment on view public.donation_catalog is
  'Catálogo público: qué falta. Sin valor estimado, sin borradores, security_invoker.';

-- ── Policies ────────────────────────────────────────────────────────────────
-- Misma forma que `milestones`: el público lee lo publicado, `auditor`+ lee
-- todo, `editor`+ crea y edita, `admin`+ borra. Los contadores no se tocan por
-- UPDATE de columna; el GRANT de abajo los deja afuera.

create policy donation_items_select_public on public.donation_items
  for select to anon
  using (published_at is not null);

create policy donation_items_select_internal on public.donation_items
  for select to authenticated
  using (published_at is not null or private.has_min_role('auditor'));

create policy donation_items_insert on public.donation_items
  for insert to authenticated
  with check (private.has_min_role('editor'));

create policy donation_items_update on public.donation_items
  for update to authenticated
  using (private.has_min_role('editor'))
  with check (private.has_min_role('editor'));

create policy donation_items_delete on public.donation_items
  for delete to authenticated
  using (private.has_min_role('admin'));

-- ── Privilegios ─────────────────────────────────────────────────────────────
-- SELECT de tabla para leer. INSERT y UPDATE por columna, para que nadie —ni
-- `owner`— escriba `reserved_quantity` ni `fulfilled_quantity` con un update
-- directo. DELETE de tabla: lo filtra la policy.

grant select on public.donation_items, public.donation_catalog
  to anon, authenticated;

grant insert (
  campaign_id,
  budget_item_id,
  title,
  description,
  unit,
  needed_quantity,
  estimated_unit_amount_minor,
  currency,
  photo_media_id,
  sort_order,
  published_at
) on public.donation_items to authenticated;

grant update (
  campaign_id,
  budget_item_id,
  title,
  description,
  unit,
  needed_quantity,
  estimated_unit_amount_minor,
  currency,
  photo_media_id,
  sort_order,
  published_at
) on public.donation_items to authenticated;

grant delete on public.donation_items to authenticated;
