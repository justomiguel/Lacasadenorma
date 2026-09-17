-- Avisos por teléfono: reservan a nombre de esa persona hasta que el owner
-- confirma o suelta (ADR-051, FR-259).
--
-- anon no inserta en las tablas: la función es la única vía, como
-- claim_donation_item para las reservas con cuenta.

-- Dirección de retiro: si hay dirección, hay nombre. El camino del teléfono
-- deja nombre y número sin dirección.

alter table public.donation_pledges
  drop constraint donation_pledges_pickup_complete;

alter table public.donation_pledges
  add constraint donation_pledges_pickup_complete check (
    pickup_address is null
    or (
      contact_name is not null
      and length(btrim(contact_name)) > 0
    )
  );

create table public.donation_offers (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.donation_items (id) on delete restrict,
  pledge_id uuid references public.donation_pledges (id) on delete restrict,
  contact_name text not null,
  contact_phone text not null,
  created_at timestamptz not null default now(),
  constraint donation_offers_contact_name_not_blank check (
    length(btrim(contact_name)) > 0
  ),
  constraint donation_offers_contact_phone_not_blank check (
    length(btrim(contact_phone)) > 0
  ),
  constraint donation_offers_one_phone_per_item unique (item_id, contact_phone)
);

comment on table public.donation_offers is
  'Aviso por teléfono: quiere donar y no abre cuenta. Reserva a su nombre (ADR-051).';
comment on column public.donation_offers.contact_name is
  'Nombre para llamar. Nunca público.';
comment on column public.donation_offers.contact_phone is
  'Teléfono para llamar. Nunca público.';
comment on column public.donation_offers.pledge_id is
  'La reserva que sostiene el ítem. Nulo sólo en filas de prueba.';

create index donation_offers_item_idx
  on public.donation_offers (item_id, created_at desc);

alter table public.donation_offers enable row level security;

create policy donation_offers_select on public.donation_offers
  for select
  to authenticated
  using (private.can_read_donors());

grant select on public.donation_offers to authenticated;

create function public.offer_donation_item(
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
         set donor_display_name = v_name,
             contact_name = v_name,
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
    false,
    v_name,
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

revoke all on function public.offer_donation_item(uuid, text, text) from public;
grant execute on function public.offer_donation_item(uuid, text, text)
  to anon, authenticated;

comment on function public.offer_donation_item(uuid, text, text) is
  'Única vía para un aviso por teléfono. Reserva a nombre de esa persona. anon puede llamar (ADR-051).';

comment on table public.donation_pledges is
  'El compromiso de traer un ítem. Lo crean claim_donation_item() y offer_donation_item().';
