-- Editar una reserved: dueño cambia cantidad y nota; admin+ también
-- contacto si user_id es nulo. expires_at no se toca. Delta 0 no
-- actualiza el ítem.

create function public.update_donation_pledge(
  p_pledge_id uuid,
  p_quantity integer,
  p_note text default null,
  p_contact_name text default null,
  p_contact_phone text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_pledge public.donation_pledges%rowtype;
  v_staff boolean;
  v_delta integer;
  v_note text;
  v_contact_name text;
  v_contact_phone text;
begin
  if v_actor is null then
    raise exception 'sin_sesion' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'cantidad_invalida' using errcode = '23514';
  end if;

  select * into v_pledge
    from public.donation_pledges
   where id = p_pledge_id;

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  if v_pledge.status is distinct from 'reserved' then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  v_staff := private.has_min_role('admin');

  if v_pledge.user_id is distinct from v_actor and not v_staff then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  v_delta := p_quantity - v_pledge.quantity;

  if v_delta <> 0 then
    update public.donation_items
       set reserved_quantity = reserved_quantity + v_delta
     where id = v_pledge.item_id
       and reserved_quantity + fulfilled_quantity + v_delta <= needed_quantity;

    if not found then
      raise exception 'sin_disponibilidad' using errcode = '23514';
    end if;
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');

  update public.donation_pledges
     set quantity = p_quantity,
         donor_note = v_note
   where id = p_pledge_id
     and status = 'reserved';

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  if v_staff and v_pledge.user_id is null then
    v_contact_name := nullif(btrim(coalesce(p_contact_name, '')), '');
    v_contact_phone := nullif(btrim(coalesce(p_contact_phone, '')), '');

    if v_contact_name is null or v_contact_phone is null then
      raise exception 'datos_de_retiro' using errcode = '23514';
    end if;

    update public.donation_pledges
       set contact_name = v_contact_name,
           contact_phone = v_contact_phone
     where id = p_pledge_id;
  end if;
end;
$$;

revoke all on function public.update_donation_pledge(uuid, integer, text, text, text) from public;
grant execute on function public.update_donation_pledge(uuid, integer, text, text, text) to authenticated;

comment on function public.update_donation_pledge(uuid, integer, text, text, text) is
  'Edita una reserved: dueño cambia cantidad y nota; admin+ también contacto si user_id es nulo.';
