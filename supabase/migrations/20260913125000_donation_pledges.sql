-- Reservas: quién se comprometió a traer qué, y las funciones que mueven los
-- contadores. Nadie tiene INSERT sobre la tabla. La única vía es
-- `claim_donation_item()`, igual que el rastro se escribe con `record_audit()`
-- (ADR-019, ADR-029).

-- ── Estado ──────────────────────────────────────────────────────────────────

create type public.pledge_status as enum (
  'reserved',
  'fulfilled',
  'cancelled',
  'expired'
);

-- ── donation_pledges ────────────────────────────────────────────────────────

create table public.donation_pledges (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.donation_items (id) on delete restrict,
  user_id uuid references auth.users (id) on delete set null,
  quantity integer not null,
  status public.pledge_status not null default 'reserved',
  is_anonymous boolean not null default true,
  donor_display_name text,
  donor_note text,
  expires_at timestamptz not null,
  reminded_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),

  constraint donation_pledges_quantity_positive check (quantity > 0),
  constraint donation_pledges_named_when_public check (
    is_anonymous
    or (donor_display_name is not null and length(btrim(donor_display_name)) > 0)
  ),
  constraint donation_pledges_cancel_has_reason check (
    (cancelled_at is null) = (cancel_reason is null)
  ),
  constraint donation_pledges_fulfilled_has_date check (
    (status = 'fulfilled') = (fulfilled_at is not null)
  )
);

comment on table public.donation_pledges is
  'El compromiso de traer un ítem. No se inserta directo: lo crea claim_donation_item().';
comment on column public.donation_pledges.user_id is
  'Nulo cuando la cuenta se borró. El trigger anonimiza nombre y marca is_anonymous (FR-240).';
comment on column public.donation_pledges.expires_at is
  'now() + 14 days, estampado en claim_donation_item(). Un solo lugar.';
comment on column public.donation_pledges.is_anonymous is
  'Default true: aparecer con nombre se elige, no se hereda (FR-225).';
comment on column public.donation_pledges.donor_note is
  'Mensaje privado a la familia. Nunca público.';

create index donation_pledges_item_idx on public.donation_pledges (item_id);
create index donation_pledges_user_idx on public.donation_pledges (user_id);
create index donation_pledges_expiry_idx
  on public.donation_pledges (status, expires_at);
create index donation_pledges_wall_idx
  on public.donation_pledges (status, is_anonymous, fulfilled_at desc);

alter table public.donation_pledges enable row level security;

-- La clave que la tabla de envíos no podía declarar antes, porque esta tabla
-- todavía no existía.
alter table public.email_deliveries
  add constraint email_deliveries_pledge_id_fkey
  foreign key (pledge_id) references public.donation_pledges (id)
  on delete restrict;

-- ── Policies ────────────────────────────────────────────────────────────────
-- Propiedad, no rango. `editor` no ve ninguna reserva: can_read_donors() es la
-- misma lección que can_read_ledger(). No hay policy de INSERT ni de DELETE.

create policy donation_pledges_select on public.donation_pledges
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.can_read_donors()
  );

create policy donation_pledges_update on public.donation_pledges
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── Privilegios ─────────────────────────────────────────────────────────────
-- SELECT de tabla para leer la propia (o todas, si can_read_donors). UPDATE por
-- columna: nombre, nota y anonimato. Sin INSERT, sin DELETE, y `anon` no recibe
-- nada acá —el muro de cinco columnas llega en la fase E.

grant select on public.donation_pledges to authenticated;
grant update (is_anonymous, donor_display_name, donor_note)
  on public.donation_pledges to authenticated;

-- ── Anonimizar al borrar la cuenta ──────────────────────────────────────────

create function private.anonymize_pledge_on_account_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null and old.user_id is not null then
    new.is_anonymous := true;
    new.donor_display_name := null;
  end if;

  return new;
end;
$$;

revoke all on function private.anonymize_pledge_on_account_delete() from public;

create trigger donation_pledges_anonymize_on_account_delete
  before update of user_id on public.donation_pledges
  for each row
  execute function private.anonymize_pledge_on_account_delete();
