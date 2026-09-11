-- Esquema base: enums, campañas y rubros de presupuesto.
--
-- Dos decisiones gobiernan todo el modelo (data-model.md):
--
-- 1. Todo monto es un entero en la unidad mínima (`amount_minor bigint`) con su
--    moneda al lado. Nunca `numeric` con decimales, nunca `float`.
-- 2. Nada financiero se borra: se anula con `voided_at` y `void_reason`.
--
-- RLS queda habilitada en toda tabla desde su creación, y las policies llegan en
-- una migración posterior. El orden importa: una tabla con RLS habilitada y sin
-- policies **no devuelve nada**, que es el estado seguro. Al revés, aunque sea por
-- un minuto, sería una tabla abierta.

-- ── Esquema privado ─────────────────────────────────────────────────────────
-- Postgres otorga EXECUTE a PUBLIC por defecto en toda función nueva. Las
-- funciones de autorización viven acá y se les revoca explícitamente, para que no
-- se conviertan en un endpoint público (amenaza E3).
--
-- USAGE sobre el esquema sí se otorga, y no es una contradicción: las policies y
-- las vistas con `security_invoker` se evalúan con los privilegios de quien
-- consulta, así que sin USAGE ninguna policy podría siquiera nombrar una función
-- de acá y toda lectura fallaría con "permission denied for schema private".
-- La frontera es doble y ninguna de las dos partes es esta:
--
-- 1. El EXECUTE de cada función, que se otorga una por una y sólo a los roles que
--    la necesitan. `anon` no recibe EXECUTE sobre `private.has_min_role`.
-- 2. PostgREST expone únicamente los esquemas de `db.schemas` —`public`— así que
--    nada de `private` es alcanzable desde la API.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- ── Enums ───────────────────────────────────────────────────────────────────

create type public.campaign_status as enum ('draft', 'active', 'paused', 'completed');

create type public.expense_category as enum (
  'materiales',
  'mano_de_obra',
  'servicios',
  'transporte',
  'herramientas',
  'otros'
);

create type public.milestone_status as enum ('pendiente', 'en_curso', 'completado');

-- `bank_transfer` es lo único que existe hoy. Los otros valores están reservados
-- para que agregar un medio de pago no requiera migrar el modelo (FR-008).
create type public.payment_method_kind as enum (
  'bank_transfer',
  'mercado_pago',
  'stripe',
  'paypal'
);

create type public.app_role as enum ('auditor', 'editor', 'admin', 'owner');

-- ── Utilidades ──────────────────────────────────────────────────────────────

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── campaigns ───────────────────────────────────────────────────────────────

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  -- Nulo significa "objetivo no verificado todavía", que es distinto de cero. La
  -- interfaz omite la barra de progreso en lugar de mostrar 0%.
  goal_amount_minor bigint,
  goal_currency char(3) not null default 'ARS',
  status public.campaign_status not null default 'draft',
  -- Última conciliación bancaria. Es pública: un número sin fecha no es un dato.
  reconciled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Nunca cero: sería ambiguo entre "no hay objetivo" y "el objetivo es cero".
  constraint campaigns_goal_positive
    check (goal_amount_minor is null or goal_amount_minor > 0),
  -- Los slugs son canónicos en minúsculas. Evita depender de la extensión citext
  -- y hace imposible que existan dos rutas para el mismo contenido.
  constraint campaigns_slug_lowercase check (slug = lower(slug)),
  constraint campaigns_currency_format check (goal_currency ~ '^[A-Z]{3}$')
);

create index campaigns_published_at_idx on public.campaigns (published_at);
create index campaigns_status_idx on public.campaigns (status);

create trigger campaigns_touch_updated_at
  before update on public.campaigns
  for each row execute function private.touch_updated_at();

alter table public.campaigns enable row level security;

comment on column public.campaigns.goal_amount_minor is
  'Objetivo en la unidad mínima de goal_currency. Nulo = no verificado; nunca 0.';

-- ── budget_items ────────────────────────────────────────────────────────────
-- En qué se va a usar el dinero (FR-017).

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  title text not null,
  description text,
  -- Nulo = el rubro existe pero todavía no está cotizado. Se muestra sin monto.
  estimated_amount_minor bigint,
  currency char(3) not null default 'ARS',
  -- Orden editorial, no alfabético: el techo va antes que la pintura.
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budget_items_amount_positive
    check (estimated_amount_minor is null or estimated_amount_minor > 0),
  constraint budget_items_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint budget_items_title_not_blank check (length(btrim(title)) > 0)
);

create index budget_items_campaign_idx on public.budget_items (campaign_id, sort_order);
create index budget_items_published_at_idx on public.budget_items (published_at);

create trigger budget_items_touch_updated_at
  before update on public.budget_items
  for each row execute function private.touch_updated_at();

alter table public.budget_items enable row level security;
