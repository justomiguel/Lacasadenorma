-- El libro: aportes, gastos, comprobantes e hitos.
--
-- La asimetría central del modelo: **los gastos son públicos y los aportes no.**
-- Un gasto es información institucional; un aporte individual puede identificar a
-- una persona (FR-014). Lo público de los aportes es siempre el agregado.

-- ── contributions ───────────────────────────────────────────────────────────
-- Ninguna fila de esta tabla es legible por `anon`. Ni una.

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete restrict,
  amount_minor bigint not null,
  currency char(3) not null,
  received_at date not null,
  payment_method_id uuid,
  -- Referencia interna de conciliación con el banco. **Nunca pública.**
  source_note text,
  is_anonymous boolean not null default true,
  -- Sólo con consentimiento explícito. No se usa en esta versión.
  contributor_display_name text,
  voided_at timestamptz,
  void_reason text,
  recorded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint contributions_amount_positive check (amount_minor > 0),
  constraint contributions_currency_format check (currency ~ '^[A-Z]{3}$'),
  -- Una anulación sin motivo no es una anulación, es un borrado disfrazado.
  constraint contributions_void_has_reason
    check ((voided_at is null) = (void_reason is null))
);

create index contributions_campaign_idx on public.contributions (campaign_id, received_at desc);
create index contributions_voided_at_idx on public.contributions (voided_at);
create index contributions_payment_method_idx on public.contributions (payment_method_id);

create trigger contributions_touch_updated_at
  before update on public.contributions
  for each row execute function private.touch_updated_at();

alter table public.contributions enable row level security;

comment on table public.contributions is
  'Aportes recibidos. Sin lectura para anon: lo público es la vista agregada campaign_totals.';

-- ── expenses ────────────────────────────────────────────────────────────────

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete restrict,
  budget_item_id uuid references public.budget_items (id) on delete set null,
  amount_minor bigint not null,
  currency char(3) not null,
  spent_at date not null,
  -- Lo que se compró o se pagó, en lenguaje llano.
  concept text not null,
  category public.expense_category not null,
  supplier text,
  voided_at timestamptz,
  void_reason text,
  published_at timestamptz,
  recorded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint expenses_amount_positive check (amount_minor > 0),
  constraint expenses_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint expenses_concept_not_blank check (length(btrim(concept)) > 0),
  constraint expenses_void_has_reason check ((voided_at is null) = (void_reason is null))
);

create index expenses_campaign_idx on public.expenses (campaign_id, spent_at desc);
create index expenses_published_at_idx on public.expenses (published_at);
create index expenses_voided_at_idx on public.expenses (voided_at);
create index expenses_budget_item_idx on public.expenses (budget_item_id);

create trigger expenses_touch_updated_at
  before update on public.expenses
  for each row execute function private.touch_updated_at();

alter table public.expenses enable row level security;

-- ── expense_receipts ────────────────────────────────────────────────────────
-- El público puede saber **que existe** un comprobante; nunca obtener el archivo
-- (FR-013). Por eso la UI pública lee un contador derivado, no estas filas.

create table public.expense_receipts (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  -- Ruta en el bucket privado `comprobantes`.
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),

  constraint expense_receipts_size_positive check (size_bytes > 0),
  -- SVG no está en la lista a propósito: un SVG es un documento ejecutable
  -- (amenaza T6). El tipo real se valida además por contenido en el servidor.
  constraint expense_receipts_mime_allowed
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'))
);

create index expense_receipts_expense_idx on public.expense_receipts (expense_id);

alter table public.expense_receipts enable row level security;

-- ── milestones ──────────────────────────────────────────────────────────────

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  title text not null,
  description text,
  status public.milestone_status not null default 'pendiente',
  -- Nulo mientras el hito no ocurrió. No se estima una fecha.
  happened_on date,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint milestones_title_not_blank check (length(btrim(title)) > 0),
  -- Un hito completado sin fecha es un dato incompleto que se publicaría como
  -- avance. Se exige la fecha al marcarlo completado.
  constraint milestones_completed_has_date
    check (status <> 'completado' or happened_on is not null)
);

create index milestones_campaign_idx on public.milestones (campaign_id, sort_order);
create index milestones_published_at_idx on public.milestones (published_at);

create trigger milestones_touch_updated_at
  before update on public.milestones
  for each row execute function private.touch_updated_at();

alter table public.milestones enable row level security;
