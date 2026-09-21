-- Perfil provisionado, aporte atado a una persona, y llegada sin reserva.
--
-- `provision_donor_account` es la única vía para nacer `approved`. El insert
-- autenticado sigue exigiendo `pending`. `record_donor_arrival` copia el
-- chequeo de cupo de `claim_donation_item`. Nadie tiene INSERT directo sobre
-- `donation_pledges`. El trigger de cantidades corre sólo en DELETE: sumar
-- `fulfilled_quantity` y después insertar `fulfilled` no cuenta dos veces.

alter table public.donor_profiles
  add column contact_phone text;

alter table public.donor_profiles
  add constraint donor_profiles_contact_phone_not_blank
    check (contact_phone is null or length(btrim(contact_phone)) > 0);

comment on column public.donor_profiles.contact_phone is
  'Teléfono de coordinación, optativo. Lo carga el equipo al crear la cuenta.';

alter table public.contributions
  add column user_id uuid references auth.users (id) on delete set null;

create index contributions_user_idx on public.contributions (user_id);

comment on column public.contributions.user_id is
  'Persona a la que se ata el aporte. Nulo en los de antes y en Aportes sin ficha.';

create function public.provision_donor_account(
  p_user_id uuid,
  p_display_name text,
  p_phone text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_name text := nullif(btrim(p_display_name), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
begin
  if v_actor is null or not private.has_min_role('admin') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  if v_name is null then
    raise exception 'Falta el nombre.' using errcode = '23514';
  end if;

  insert into public.donor_profiles (
    id, display_name, locale, approval_status,
    reviewed_at, reviewed_by, contact_phone
  ) values (
    p_user_id, v_name, 'es', 'approved', now(), v_actor, v_phone
  );
end;
$$;

create function public.record_donor_arrival(
  p_user_id uuid,
  p_item_id uuid,
  p_quantity integer,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_name text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_id uuid;
begin
  if v_actor is null or not private.has_min_role('admin') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'cantidad_invalida' using errcode = '23514';
  end if;

  update public.donation_items
     set fulfilled_quantity = fulfilled_quantity + p_quantity
   where id = p_item_id
     and published_at is not null
     and reserved_quantity + fulfilled_quantity + p_quantity <= needed_quantity;

  if not found then
    raise exception 'sin_cupo' using errcode = 'P0001';
  end if;

  insert into public.donation_pledges (
    item_id, user_id, quantity, status,
    is_anonymous, donor_display_name, cover_channel,
    expires_at, accepted_at, fulfilled_at
  ) values (
    p_item_id, p_user_id, p_quantity, 'fulfilled',
    v_name is null, v_name, 'bring',
    now(), now(), now()
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.provision_donor_account(uuid, text, text) from public;
grant execute on function public.provision_donor_account(uuid, text, text) to authenticated;
revoke all on function public.record_donor_arrival(uuid, uuid, integer, text) from public;
grant execute on function public.record_donor_arrival(uuid, uuid, integer, text) to authenticated;

comment on function public.provision_donor_account(uuid, text, text) is
  'Crea el perfil aprobado de quien donó por fuera. Sólo admin/owner. El insert autenticado sigue exigiendo pending.';

comment on function public.record_donor_arrival(uuid, uuid, integer, text) is
  'Anota una llegada sin reserva previa. Sólo admin/owner. Sin cupo levanta sin_cupo.';
