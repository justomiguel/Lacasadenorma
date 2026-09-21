-- El admin puede soltar un «Sí: donan». El plazo de 14 días ya no suelta solo.

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
  'Cancela reserved (dueño o admin+) o fulfilled (sólo admin+). Limpia fulfilled_at (CHECK). Devuelve las unidades.';

create or replace function public.release_expired_holds(p_item_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- El plazo avisa al equipo. No cambia estado ni contadores.
  return 0;
end;
$$;

revoke all on function public.release_expired_holds(uuid) from public;

comment on function public.release_expired_holds(uuid) is
  'Ya no suelta. Quedó para no romper a quien todavía la invoca. El admin cancela a mano.';

do $cron$
begin
  perform cron.unschedule('release-expired-donation-holds');
exception
  when others then
    raise notice
      'pg_cron no desagendó release-expired-donation-holds (%).',
      sqlerrm;
end;
$cron$;
