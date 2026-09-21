-- Revertir un Donado: las unidades vuelven al catálogo, la reserva queda
-- cancelada. cancel_donation_pledge sobre fulfilled también limpia
-- fulfilled_at: el CHECK y el muro lo exigen.

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
         fulfilled_at = null
   where id = p_pledge_id
     and status = v_pledge.status;

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  if v_pledge.status = 'reserved' then
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
  'Cancela reserved (dueño o admin+) o fulfilled (sólo admin+). Limpia fulfilled_at. Devuelve las unidades.';

create function public.revert_donation_pledge(
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
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_actor is null or not private.has_min_role('admin') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  select * into v_pledge
    from public.donation_pledges
   where id = p_pledge_id;

  if not found or v_pledge.status is distinct from 'fulfilled' then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  if v_reason is null then
    v_reason := 'Revertida desde Cerradas';
  end if;

  update public.donation_pledges
     set status = 'cancelled',
         cancelled_at = now(),
         cancel_reason = v_reason,
         fulfilled_at = null
   where id = p_pledge_id
     and status = 'fulfilled';

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  update public.donation_items
     set fulfilled_quantity = fulfilled_quantity - v_pledge.quantity
   where id = v_pledge.item_id;
end;
$$;

revoke all on function public.revert_donation_pledge(uuid, text) from public;
grant execute on function public.revert_donation_pledge(uuid, text) to authenticated;

comment on function public.revert_donation_pledge(uuid, text) is
  'Deshace un Donado. Sólo admin+. Motivo optativo. Devuelve las unidades y saca del muro.';
