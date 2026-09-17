-- Aparecer y nota se cargan en el sí del teléfono, no al avisar (ADR-051, FR-262).
-- El camino del mail no pasa por acá: se elige en /cuenta.

create or replace function public.offer_donation_item(
  p_item_id uuid,
  p_contact_name text,
  p_contact_phone text
)
returns table (
  id uuid,
  item_id uuid,
  item_title text,
  contact_name text,
  contact_phone text,
  created_at timestamptz,
  pledge_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(btrim(p_contact_name), '');
  v_phone text := nullif(btrim(p_contact_phone), '');
  v_title text;
  v_offer public.donation_offers%rowtype;
  v_pledge_id uuid;
  v_pledge_status public.pledge_status;
begin
  if v_name is null then
    raise exception 'datos_de_retiro' using errcode = 'P0001';
  end if;

  if v_phone is null or length(regexp_replace(v_phone, '\D', '', 'g')) < 6 then
    raise exception 'telefono_invalido' using errcode = 'P0001';
  end if;

  perform public.release_expired_holds(p_item_id);

  select i.title into v_title
    from public.donation_items i
   where i.id = p_item_id
     and i.published_at is not null;

  if v_title is null then
    raise exception 'sin_disponibilidad' using errcode = 'P0001';
  end if;

  insert into public.donation_offers as o (item_id, contact_name, contact_phone)
  values (p_item_id, v_name, v_phone)
  on conflict on constraint donation_offers_one_phone_per_item do update
    set contact_name = excluded.contact_name
  returning o.* into v_offer;

  if v_offer.pledge_id is not null then
    select p.status into v_pledge_status
      from public.donation_pledges p
     where p.id = v_offer.pledge_id;

    if v_pledge_status = 'reserved' then
      update public.donation_pledges as p
         set contact_name = v_name,
             contact_phone = v_phone
       where p.id = v_offer.pledge_id
         and p.status = 'reserved';

      return query
        select v_offer.id,
               v_offer.item_id,
               v_title,
               v_name,
               v_offer.contact_phone,
               v_offer.created_at,
               v_offer.pledge_id;
      return;
    end if;
  end if;

  update public.donation_items as i
     set reserved_quantity = i.reserved_quantity + 1
   where i.id = p_item_id
     and i.published_at is not null
     and i.reserved_quantity + i.fulfilled_quantity + 1 <= i.needed_quantity;

  if not found then
    if v_offer.pledge_id is null then
      delete from public.donation_offers as o where o.id = v_offer.id;
    end if;

    raise exception 'sin_disponibilidad' using errcode = 'P0001';
  end if;

  insert into public.donation_pledges as p (
    item_id,
    user_id,
    quantity,
    status,
    is_anonymous,
    donor_display_name,
    cover_channel,
    contact_name,
    contact_phone,
    pickup_address,
    expires_at
  )
  values (
    p_item_id,
    null,
    1,
    'reserved',
    true,
    null,
    'bring',
    v_name,
    v_phone,
    null,
    now() + interval '14 days'
  )
  returning p.id into v_pledge_id;

  update public.donation_offers as o
     set pledge_id = v_pledge_id,
         contact_name = v_name
   where o.id = v_offer.id
  returning o.* into v_offer;

  return query
    select v_offer.id,
           v_offer.item_id,
           v_title,
           v_offer.contact_name,
           v_offer.contact_phone,
           v_offer.created_at,
           v_offer.pledge_id;
end;
$$;

comment on function public.offer_donation_item(uuid, text, text) is
  'Única vía para un aviso por teléfono. Reserva anónima a esa persona. El nombre público se carga en el sí, si aceptaron (FR-262). anon puede llamar (ADR-051).';

drop function if exists public.fulfill_donation_pledge(uuid);

create function public.fulfill_donation_pledge(
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
     set status = 'fulfilled',
         fulfilled_at = now()
   where id = p_pledge_id
     and status = 'reserved';

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  update public.donation_items
     set reserved_quantity = reserved_quantity - v_pledge.quantity,
         fulfilled_quantity = fulfilled_quantity + v_pledge.quantity
   where id = v_pledge.item_id;
end;
$$;

revoke all on function public.fulfill_donation_pledge(uuid, text, text) from public;
grant execute on function public.fulfill_donation_pledge(uuid, text, text)
  to authenticated;

comment on function public.fulfill_donation_pledge(uuid, text, text) is
  'Confirma la llegada. Sólo admin+. Nombre y nota optativos: el sí del teléfono, si aceptaron (FR-262).';
