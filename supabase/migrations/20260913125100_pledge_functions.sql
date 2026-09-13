-- Las cuatro funciones que mueven contadores, y ninguna otra puerta.
--
-- security definer, search_path vacío, autorización en la primera línea.
-- authenticated no inserta en donation_pledges: estas funciones son el único
-- camino (ADR-029).

-- ── Liberar vencidas ────────────────────────────────────────────────────────
-- Sin GRANT a nadie. La invocan claim_donation_item y pg_cron. Sin parámetro
-- libera todo; con parámetro, un ítem. Devuelve cuántas liberó.

create function public.release_expired_holds(p_item_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_released integer := 0;
begin
  -- MATERIALIZED para que el UPDATE de las reservas no se reejecute al leer
  -- el CTE desde el agregado y desde el conteo.
  with expired as materialized (
    update public.donation_pledges
       set status = 'expired'
     where status = 'reserved'
       and expires_at < now()
       and (p_item_id is null or item_id = p_item_id)
    returning item_id, quantity
  ),
  agg as materialized (
    select item_id, sum(quantity)::integer as qty
      from expired
     group by item_id
  ),
  touched as materialized (
    update public.donation_items i
       set reserved_quantity = i.reserved_quantity - a.qty
      from agg a
     where i.id = a.item_id
    returning i.id
  )
  select coalesce((select count(*)::integer from expired), 0)
    into v_released
   where (select count(*) from touched) >= 0;

  return v_released;
end;
$$;

revoke all on function public.release_expired_holds(uuid) from public;

comment on function public.release_expired_holds(uuid) is
  'Vencimiento auto-sanante. Sin GRANT: la invocan claim_donation_item y pg_cron. No depende del cron (FR-218, ADR-029).';

-- ── Reservar ────────────────────────────────────────────────────────────────

create function public.claim_donation_item(
  p_item_id uuid,
  p_quantity integer default 1,
  p_is_anonymous boolean default true,
  p_display_name text default null,
  p_note text default null
)
returns public.donation_pledges
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Subselect: la función de sesión suelta se evalúa una vez por fila (auth_rls_initplan).
  v_actor uuid := (select auth.uid());
  v_approval text;
  v_active integer;
  v_name text;
  v_anonymous boolean;
  v_pledge public.donation_pledges;
begin
  -- Tener sesión ya implica correo confirmado: enable_confirmations = true
  -- impide iniciar sesión sin confirmar. No se mira user_metadata.email_verified,
  -- que lo escribe la propia persona (research.md §4, amenaza S3).
  if v_actor is null then
    raise exception 'sin_sesion' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'cantidad_invalida' using errcode = '23514';
  end if;

  select p.approval_status into v_approval
    from public.donor_profiles p
   where p.id = v_actor;

  if v_approval is distinct from 'approved' then
    raise exception 'sin_habilitacion' using errcode = '42501';
  end if;

  -- El vencimiento auto-sanante de FR-218: libera lo vencido de ESTE ítem
  -- antes de tocarlo, en la misma transacción. Si el cron está caído, se
  -- muestra menos disponibilidad de la que hay, nunca más.
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

  if not v_anonymous and v_name is null then
    raise exception 'nombre_requerido' using errcode = '23514';
  end if;

  if v_anonymous then
    v_name := null;
  end if;

  -- El update condicional resuelve la concurrencia: toma el lock de la fila.
  -- La segunda transacción espera, reevalúa el WHERE y pierde (ADR-029).
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
    now() + interval '14 days'
  )
  returning * into v_pledge;

  return v_pledge;
end;
$$;

revoke all on function public.claim_donation_item(uuid, integer, boolean, text, text)
  from public;
grant execute on function public.claim_donation_item(uuid, integer, boolean, text, text)
  to authenticated;

comment on function public.claim_donation_item(uuid, integer, boolean, text, text) is
  'Única vía para crear una reserva. El user_id es el de la sesión: no se reserva a nombre de otro. No comprueba user_metadata.';

-- ── Cancelar ────────────────────────────────────────────────────────────────

create function public.cancel_donation_pledge(
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

  if not found or v_pledge.status is distinct from 'reserved' then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  v_staff := private.has_min_role('admin');

  if v_pledge.user_id is distinct from v_actor and not v_staff then
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
         cancel_reason = v_reason
   where id = p_pledge_id
     and status = 'reserved';

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;

  update public.donation_items
     set reserved_quantity = reserved_quantity - v_pledge.quantity
   where id = v_pledge.item_id;
end;
$$;

revoke all on function public.cancel_donation_pledge(uuid, text) from public;
grant execute on function public.cancel_donation_pledge(uuid, text) to authenticated;

comment on function public.cancel_donation_pledge(uuid, text) is
  'Cancela una reserva activa. El dueño, o admin+ con motivo. Devuelve las unidades al contador.';

-- ── Confirmar llegada ───────────────────────────────────────────────────────

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

  if not found or v_pledge.status is distinct from 'reserved' then
    raise exception 'no_encontrada' using errcode = 'P0002';
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

revoke all on function public.fulfill_donation_pledge(uuid) from public;
grant execute on function public.fulfill_donation_pledge(uuid) to authenticated;

comment on function public.fulfill_donation_pledge(uuid) is
  'Confirma la llegada. Sólo admin+. Mueve el contador de reserved a fulfilled (D2).';

-- ── Recordatorio: una sola vez ──────────────────────────────────────────────

create function public.mark_pledge_reminded(p_pledge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not private.has_min_role('admin') then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  update public.donation_pledges
     set reminded_at = now()
   where id = p_pledge_id
     and status = 'reserved'
     and reminded_at is null;
end;
$$;

revoke all on function public.mark_pledge_reminded(uuid) from public;
grant execute on function public.mark_pledge_reminded(uuid) to authenticated;

comment on function public.mark_pledge_reminded(uuid) is
  'Sella reminded_at. El correo se manda desde la aplicación; acá está la marca permanente (FR-235).';

-- ── pg_cron, si existe ──────────────────────────────────────────────────────
-- No existe en el Postgres local (ADR-013). El vencimiento se prueba llamando
-- release_expired_holds() directo. Un cron caído no miente para más: claim
-- libera lo vencido del ítem que va a tocar.

do $cron$
begin
  create extension if not exists pg_cron;

  perform cron.schedule(
    'release-expired-donation-holds',
    '12 * * * *',
    'select public.release_expired_holds()'
  );
exception
  when others then
    raise notice
      'pg_cron no se agendó en este Postgres (%). El vencimiento se prueba llamando release_expired_holds().',
      sqlerrm;
end;
$cron$;
