-- Contenido operativo: fotografías, novedades, personas y cuentas de aporte.
--
-- Lo que está acá y no en `content/` es lo que se edita desde un teléfono
-- (ADR-007). Una foto del techo nuevo no puede requerir un despliegue.

-- ── media ───────────────────────────────────────────────────────────────────

create table public.media (
  id uuid primary key default gen_random_uuid(),
  -- Ruta en el bucket público `fotos`.
  storage_path text not null unique,
  -- Obligatorio a nivel de esquema (FR-024). El formulario puede cambiar; la
  -- base, no. Una foto sin alt no se puede publicar.
  alt_text text not null,
  caption text,
  credit text,
  -- Necesarios para no generar CLS: `next/image` los exige y los Core Web Vitals
  -- son requisito funcional (principio VII).
  width integer not null,
  height integer not null,
  taken_on date,
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint media_alt_not_blank check (length(btrim(alt_text)) > 0),
  -- Un alt que es el nombre del archivo no describe nada (principio VI).
  constraint media_alt_is_not_filename
    check (alt_text !~* '\.(jpe?g|png|webp|avif|gif|heic)$'),
  constraint media_dimensions_positive check (width > 0 and height > 0)
);

create index media_storage_path_idx on public.media (storage_path);

create trigger media_touch_updated_at
  before update on public.media
  for each row execute function private.touch_updated_at();

alter table public.media enable row level security;

-- ── updates ─────────────────────────────────────────────────────────────────

create table public.updates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  -- Para compartir la novedad sola, con su propia vista previa (FR-027).
  slug text not null unique,
  title text not null,
  -- Markdown restringido. **Sin HTML crudo**: sería un XSS de administración
  -- (amenaza T4).
  body text not null,
  published_at timestamptz,
  author_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint updates_slug_lowercase check (slug = lower(slug)),
  constraint updates_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint updates_title_not_blank check (length(btrim(title)) > 0),
  constraint updates_body_not_blank check (length(btrim(body)) > 0)
);

create index updates_slug_idx on public.updates (slug);
create index updates_published_at_idx on public.updates (published_at desc);
create index updates_campaign_idx on public.updates (campaign_id, published_at desc);

create trigger updates_touch_updated_at
  before update on public.updates
  for each row execute function private.touch_updated_at();

alter table public.updates enable row level security;

-- ── update_media ────────────────────────────────────────────────────────────

create table public.update_media (
  update_id uuid not null references public.updates (id) on delete cascade,
  media_id uuid not null references public.media (id) on delete cascade,
  sort_order integer not null default 0,

  primary key (update_id, media_id)
);

create index update_media_update_idx on public.update_media (update_id, sort_order);
create index update_media_media_idx on public.update_media (media_id);

alter table public.update_media enable row level security;

-- ── people ──────────────────────────────────────────────────────────────────
-- La prosa pública se lee de `content/` en esta versión; estas columnas existen
-- para el día en que la familia quiera editarla desde el backoffice sin pasar por
-- un despliegue. La frontera exacta está en data-model.md §8.

create table public.people (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  full_name text not null,
  role_label text,
  bio text,
  -- Nulas mientras la familia no publique las fechas. Si son nulas, el JSON-LD
  -- omite birthDate/deathDate en lugar de estimarlas.
  born_on date,
  died_on date,
  portrait_media_id uuid references public.media (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint people_slug_lowercase check (slug = lower(slug)),
  constraint people_name_not_blank check (length(btrim(full_name)) > 0),
  constraint people_dates_ordered check (born_on is null or died_on is null or born_on <= died_on)
);

create index people_slug_idx on public.people (slug);
create index people_published_at_idx on public.people (published_at);

create trigger people_touch_updated_at
  before update on public.people
  for each row execute function private.touch_updated_at();

alter table public.people enable row level security;

-- ── payment_methods ─────────────────────────────────────────────────────────
-- La superficie más protegida del sistema. Si alguien altera un CBU, el dinero va
-- a otra parte: es el peor caso del modelo de amenazas (T1). Sólo `owner` escribe.

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  kind public.payment_method_kind not null default 'bank_transfer',
  country_code char(2) not null,
  currency char(3) not null,
  label text not null,
  -- Lista ordenada de { label, value, copyable, hint }. Cada país necesita campos
  -- distintos, y jsonb evita quince columnas nullables. La forma se valida con Zod
  -- en el servidor antes de publicar.
  fields jsonb not null default '[]'::jsonb,
  instructions text,
  sort_order integer not null default 0,
  -- **Nulo = no se muestra.** Es la defensa de FR-007 a nivel de datos.
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payment_methods_country_format check (country_code ~ '^[A-Z]{2}$'),
  constraint payment_methods_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint payment_methods_label_not_blank check (length(btrim(label)) > 0),
  constraint payment_methods_fields_is_array check (jsonb_typeof(fields) = 'array'),
  -- Un método publicado sin campos no sirve para transferir, y mostrarlo sería
  -- peor que omitirlo.
  constraint payment_methods_published_has_fields
    check (published_at is null or jsonb_array_length(fields) > 0),
  -- Ningún valor puede ser un marcador de relleno. Es la última línea de defensa
  -- de la regla de honestidad del contenido, y vive en la base porque el
  -- formulario puede cambiar.
  constraint payment_methods_no_placeholder
    check (fields::text !~* '"(PENDIENTE|TODO|XXX+|placeholder|completar)"')
);

create index payment_methods_campaign_idx on public.payment_methods (campaign_id, sort_order);
create index payment_methods_published_at_idx on public.payment_methods (published_at);
create index payment_methods_country_idx on public.payment_methods (country_code);

create trigger payment_methods_touch_updated_at
  before update on public.payment_methods
  for each row execute function private.touch_updated_at();

alter table public.payment_methods enable row level security;

-- La referencia se agrega ahora que la tabla existe: un aporte sabe por dónde
-- entró, y el método no se puede borrar mientras haya aportes que lo referencien.
alter table public.contributions
  add constraint contributions_payment_method_fkey
  foreign key (payment_method_id) references public.payment_methods (id) on delete restrict;
