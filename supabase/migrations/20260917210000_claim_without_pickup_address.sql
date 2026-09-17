-- Traer un bien con cuenta ya no exige domicilio (ADR-051).
--
-- La ficha pide nombre y un canal. pickup_address queda nulo si no llegó;
-- la columna sigue existiendo por si alguna reserva vieja lo tiene.

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
     and status = 'reserved';

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

  if v_channel = 'bring' then
    if v_contact_name is null then
      raise exception 'datos_de_retiro' using errcode = '23514';
    end if;
  else
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

revoke all on function public.claim_donation_item(
  uuid, integer, boolean, text, text, public.donation_cover_channel, text, text, text
) from public;
grant execute on function public.claim_donation_item(
  uuid, integer, boolean, text, text, public.donation_cover_channel, text, text, text
) to authenticated;

comment on function public.claim_donation_item(
  uuid, integer, boolean, text, text, public.donation_cover_channel, text, text, text
) is
  'Única vía para crear una reserva con cuenta. pending y approved reservan; declined no. Traer pide nombre; la dirección es optativa (ADR-051).';

comment on column public.donation_pledges.pickup_address is
  'Dónde ir a buscar el bien, si se llegó a cargar. Nunca público. La ficha ya no lo pide (ADR-051).';
