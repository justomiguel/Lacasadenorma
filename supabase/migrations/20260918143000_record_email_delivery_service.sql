-- `record_email_delivery()` sólo tenía EXECUTE para `authenticated`. Una oferta
-- por teléfono no tiene sesión: el cliente de servidor llama con el rol `anon`,
-- PostgREST responde 401 y el aviso al equipo no se anota. El catch de FR-233
-- traga el fallo para no deshacer la reserva, y en los logs no quedaba el 401
-- (ADR-053).
--
-- El servidor puede anotar con la clave secreta (`service_role`): no abre el
-- registro al público, porque `anon` sigue sin EXECUTE. Sin sesión, un correo
-- de persona pide `p_user_id`; uno `staff.*` no, que es el caso del teléfono.

create or replace function public.record_email_delivery(
  p_kind text,
  p_pledge_id uuid,
  p_status text,
  p_provider_id text default null,
  p_error text default null,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target uuid;
  v_recipient text;
  v_about uuid;
begin
  if v_actor is null then
    if p_kind not like 'staff.%' and p_user_id is null then
      raise exception 'Registrar un envío necesita una sesión o de quién es.'
        using errcode = '42501';
    end if;

    v_target := p_user_id;
  else
    v_target := coalesce(p_user_id, v_actor);

    if v_target is distinct from v_actor and not private.can_read_donors() then
      raise exception 'Sólo un rol interno puede registrar un envío de otra cuenta.'
        using errcode = '42501';
    end if;
  end if;

  if p_kind like 'staff.%' then
    v_recipient := null;
  else
    select u.email into v_recipient
      from auth.users u
     where u.id = v_target;

    if v_recipient is null then
      raise exception 'No hay a quién atribuirle ese envío.'
        using errcode = '42501';
    end if;
  end if;

  if p_kind like 'account.%' or p_kind = 'staff.new_account' then
    v_about := v_target;
  else
    v_about := null;
  end if;

  insert into public.email_deliveries (
    kind, pledge_id, about_user_id, recipient, status, provider_id, error
  )
  values (
    p_kind,
    p_pledge_id,
    v_about,
    v_recipient,
    p_status,
    p_provider_id,
    nullif(btrim(left(coalesce(p_error, ''), 500)), '')
  );
end;
$$;

revoke all on function public.record_email_delivery(text, uuid, text, text, text, uuid)
  from public;

grant execute on function public.record_email_delivery(text, uuid, text, text, text, uuid)
  to authenticated;

grant execute on function public.record_email_delivery(text, uuid, text, text, text, uuid)
  to service_role;

comment on function public.record_email_delivery(text, uuid, text, text, text, uuid) is
  'La única vía de escritura de email_deliveries. La dirección sale de auth.users, nunca del argumento. service_role anota cuando no hay sesión (ADR-028, oferta por teléfono).';
