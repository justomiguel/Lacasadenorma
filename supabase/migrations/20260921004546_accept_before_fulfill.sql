-- Aceptar antes de entregar: el sí no marca llegada ni mueve el contador.

alter table public.donation_pledges
  add constraint donation_pledges_accepted_has_date check (
    status <> 'accepted' or accepted_at is not null
  );

alter table public.donation_pledges
  add constraint donation_pledges_reserved_has_no_accept_date check (
    status <> 'reserved' or accepted_at is null
  );

create function public.accept_donation_pledge(
  p_pledge_id uuid,
  p_display_name text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_pledge public.donation_pledges%rowtype;
  v_name text := nullif(btrim(p_display_name), '');
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_actor is null or not private.has_min_role('admin') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  select * into v_pledge
    from public.donation_pledges
   where id = p_pledge_id;

  if not found or v_pledge.status is distinct from 'reserved' then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  if v_name is not null then
    update public.donation_pledges
       set is_anonymous = false,
           donor_display_name = v_name,
           donor_note = case
             when p_note is null then donor_note
             else v_note
           end
     where id = p_pledge_id
       and status = 'reserved';
  elsif p_note is not null then
    update public.donation_pledges
       set donor_note = v_note
     where id = p_pledge_id
       and status = 'reserved';
  end if;

  update public.donation_pledges
     set status = 'accepted',
         accepted_at = now()
   where id = p_pledge_id
     and status = 'reserved';

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.accept_donation_pledge(uuid, text, text) from public;
grant execute on function public.accept_donation_pledge(uuid, text, text)
  to authenticated;

comment on function public.accept_donation_pledge(uuid, text, text) is
  'Confirma que van a donar. No mueve cantidades. Sólo admin+. Nombre y nota del teléfono.';

drop function if exists public.fulfill_donation_pledge(uuid, text, text);

create function public.fulfill_donation_pledge(p_pledge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_pledge public.donation_pledges%rowtype;
begin
  if v_actor is null or not private.has_min_role('admin') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  select * into v_pledge
    from public.donation_pledges
   where id = p_pledge_id;

  if not found or v_pledge.status is distinct from 'accepted' then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  update public.donation_pledges
     set status = 'fulfilled',
         fulfilled_at = now()
   where id = p_pledge_id
     and status = 'accepted';

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  update public.donation_items
     set reserved_quantity = reserved_quantity - v_pledge.quantity,
         fulfilled_quantity = fulfilled_quantity + v_pledge.quantity
   where id = v_pledge.item_id;
end;
$$;

revoke all on function public.fulfill_donation_pledge(uuid) from public;
grant execute on function public.fulfill_donation_pledge(uuid) to authenticated;

comment on function public.fulfill_donation_pledge(uuid) is
  'Confirma la llegada. Sólo desde accepted. Sólo admin+. No toca plata.';

create or replace function public.cancel_donation_pledge(
  p_pledge_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_pledge public.donation_pledges%rowtype;
  v_reason text;
  v_staff boolean;
begin
  if v_actor is null then
    raise exception 'sin_sesion' using errcode = '42501';
  end if;

  select * into v_pledge
    from public.donation_pledges
   where id = p_pledge_id;

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  v_staff := private.has_min_role('admin');

  if v_pledge.status = 'fulfilled' then
    if not v_staff then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
  elsif v_pledge.status = 'accepted' then
    if not v_staff then
      raise exception 'sin_permiso' using errcode = '42501';
    end if;
  elsif v_pledge.status is distinct from 'reserved' then
    raise exception 'no_encontrada' using errcode = 'P0002';
  elsif v_pledge.user_id is distinct from v_actor and not v_staff then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');

  if v_staff and v_pledge.user_id is distinct from v_actor then
    if v_reason is null then
      raise exception 'motivo_requerido' using errcode = '23514';
    end if;
  else
    v_reason := coalesce(v_reason, 'Cancelada por quien reservó.');
  end if;

  update public.donation_pledges
     set status = 'cancelled',
         cancelled_at = now(),
         cancel_reason = v_reason,
         fulfilled_at = null,
         accepted_at = null
   where id = p_pledge_id
     and status = v_pledge.status;

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  if v_pledge.status in ('reserved', 'accepted') then
    update public.donation_items
       set reserved_quantity = reserved_quantity - v_pledge.quantity
     where id = v_pledge.item_id;
  else
    update public.donation_items
       set fulfilled_quantity = fulfilled_quantity - v_pledge.quantity
     where id = v_pledge.item_id;
  end if;
end;
$$;

comment on function public.cancel_donation_pledge(uuid, text) is
  'Cancela reserved (dueño o admin+), accepted o fulfilled (sólo admin+). Devuelve las unidades.';

create or replace function private.sync_item_quantities_on_pledge_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('reserved', 'accepted') then
    update public.donation_items
       set reserved_quantity = reserved_quantity - old.quantity
     where id = old.item_id;
  elsif old.status = 'fulfilled' then
    update public.donation_items
       set fulfilled_quantity = fulfilled_quantity - old.quantity
     where id = old.item_id;
  end if;

  return old;
end;
$$;

create or replace function public.claim_donation_item(
  p_item_id uuid,
  p_quantity integer default 1,
  p_is_anonymous boolean default true,
  p_display_name text default null,
  p_note text default null,
  p_cover_channel public.donation_cover_channel default 'bring',
  p_contact_name text default null,
  p_contact_phone text default null,
  p_pickup_address text default null
)
returns public.donation_pledges
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_approval text;
  v_active integer;
  v_name text;
  v_anonymous boolean;
  v_channel public.donation_cover_channel;
  v_contact_name text;
  v_contact_phone text;
  v_pickup text;
  v_pledge public.donation_pledges;
begin
  if v_actor is null then
    raise exception 'sin_sesion' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'cantidad_invalida' using errcode = '23514';
  end if;

  select p.approval_status into v_approval
    from public.donor_profiles p
   where p.id = v_actor;

  if v_approval is null or v_approval = 'declined' then
    raise exception 'sin_habilitacion' using errcode = '42501';
  end if;

  perform public.release_expired_holds(p_item_id);

  select count(*) into v_active
    from public.donation_pledges
   where user_id = v_actor
     and status in ('reserved', 'accepted');

  if v_active >= 5 then
    raise exception 'demasiadas_reservas' using errcode = 'P0001';
  end if;

  v_anonymous := coalesce(p_is_anonymous, true);
  v_name := nullif(btrim(coalesce(p_display_name, '')), '');
  v_channel := coalesce(p_cover_channel, 'bring');
  v_contact_name := nullif(btrim(coalesce(p_contact_name, '')), '');
  v_contact_phone := nullif(btrim(coalesce(p_contact_phone, '')), '');
  v_pickup := nullif(btrim(coalesce(p_pickup_address, '')), '');

  if not v_anonymous and v_name is null then
    raise exception 'nombre_requerido' using errcode = '23514';
  end if;

  if v_anonymous then
    v_name := null;
  end if;

  if v_channel <> 'bring' then
    v_contact_name := null;
    v_contact_phone := null;
    v_pickup := null;
  end if;

  update public.donation_items
     set reserved_quantity = reserved_quantity + p_quantity
   where id = p_item_id
     and published_at is not null
     and reserved_quantity + fulfilled_quantity + p_quantity <= needed_quantity;

  if not found then
    raise exception 'sin_disponibilidad' using errcode = '23514';
  end if;

  insert into public.donation_pledges (
    item_id,
    user_id,
    quantity,
    status,
    is_anonymous,
    donor_display_name,
    donor_note,
    cover_channel,
    contact_name,
    contact_phone,
    pickup_address,
    expires_at
  )
  values (
    p_item_id,
    v_actor,
    p_quantity,
    'reserved',
    v_anonymous,
    v_name,
    nullif(btrim(coalesce(p_note, '')), ''),
    v_channel,
    v_contact_name,
    v_contact_phone,
    v_pickup,
    now() + interval '14 days'
  )
  returning * into v_pledge;

  return v_pledge;
end;
$$;
