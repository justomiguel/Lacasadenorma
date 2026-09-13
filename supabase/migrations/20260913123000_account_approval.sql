-- Habilitación de las cuentas del público (ADR-033).
--
-- Confirmar el correo demuestra que la dirección es suya. No demuestra que el
-- equipo quiera abrirle el catálogo. Esta migración agrega el estado, cierra la
-- columna para que quien se registra no se habilite sola, y deja una función
-- acotada para que `admin` y `owner` decidan.

-- ── El estado ───────────────────────────────────────────────────────────────

alter table public.donor_profiles
  add column approval_status text not null default 'pending',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users (id) on delete set null,
  add column review_note text;

alter table public.donor_profiles
  add constraint donor_profiles_approval_known
    check (approval_status in ('pending', 'approved', 'declined')),
  add constraint donor_profiles_review_note_not_blank
    check (review_note is null or length(btrim(review_note)) > 0),
  add constraint donor_profiles_review_matches_status
    check (
      (approval_status = 'pending' and reviewed_at is null and reviewed_by is null)
      or (approval_status <> 'pending' and reviewed_at is not null and reviewed_by is not null)
    );

comment on column public.donor_profiles.approval_status is
  'pending al nacer. approved habilita la reserva. declined no reserva y se puede reconsiderar (ADR-033).';

create index donor_profiles_approval_idx
  on public.donor_profiles (approval_status, created_at desc);

-- El insert de la persona tiene que nacer pendiente. Sin este with check, un
-- `insert ... approval_status = 'approved'` pasaría la policy de propiedad y la
-- cuenta quedaría habilitada sin que nadie la mire.
drop policy donor_profiles_insert on public.donor_profiles;

create policy donor_profiles_insert on public.donor_profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and approval_status = 'pending'
  );

-- ── Privilegio de columna: la persona no escribe el estado ──────────────────
--
-- Un UPDATE con `using (id = auth.uid())` dejaría cambiar `approval_status` a
-- `approved`. La policy pregunta de quién es la fila, no qué columnas toca.
-- El GRANT por columna es la barrera que la policy no puede ser.

revoke update on public.donor_profiles from authenticated;
grant update (display_name, locale, default_anonymous) on public.donor_profiles
  to authenticated;

-- ── La única vía de cambio ──────────────────────────────────────────────────

create or replace function public.review_donor_account(
  p_user_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_actor is null or not private.has_min_role('admin') then
    raise exception 'Sólo admin u owner pueden habilitar o rechazar una cuenta.'
      using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'declined') then
    raise exception 'La decisión tiene que ser habilitar o rechazar.'
      using errcode = '23514';
  end if;

  update public.donor_profiles
     set approval_status = p_decision,
         reviewed_at = now(),
         reviewed_by = v_actor,
         review_note = v_note
   where id = p_user_id
     and (
       approval_status = 'pending'
       or (approval_status = 'declined' and p_decision = 'approved')
     );

  if not found then
    raise exception 'No hay una cuenta en estado de poder recibir esa decisión.'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.review_donor_account(uuid, text, text) from public;
grant execute on function public.review_donor_account(uuid, text, text) to authenticated;

comment on function public.review_donor_account(uuid, text, text) is
  'Habilita o rechaza una cuenta del público. Sólo admin/owner. La persona no puede invocarlo sobre sí misma con efecto: pide has_min_role (ADR-033).';

-- ── El correo de contacto, para coordinar una entrega ───────────────────────
--
-- `authenticated` no lee `auth.users`. Quien tiene `can_read_donors()` sí
-- necesita la dirección, y no hay otro lugar de donde sacarla. Devuelve nulo
-- para todo el mundo que no pueda leer donantes: no es un oráculo.

create or replace function public.donor_contact(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.can_read_donors() then u.email
    else null
  end
  from auth.users u
  where u.id = p_user_id
$$;

revoke all on function public.donor_contact(uuid) from public;
grant execute on function public.donor_contact(uuid) to authenticated;

comment on function public.donor_contact(uuid) is
  'El correo de una cuenta del público, sólo para quien puede leer donantes. Nulo para el resto.';

-- ── Idempotencia de los correos de cuenta ───────────────────────────────────
--
-- Los de reserva ya tienen índice único por (kind, pledge_id). Los de cuenta no
-- tienen pledge: el sujeto es la persona. `about_user_id` cubre también el aviso
-- al equipo de una cuenta nueva, que no tiene destinatario en la fila.

alter table public.email_deliveries
  add column about_user_id uuid references auth.users (id) on delete set null;

create unique index email_deliveries_sent_once_per_account
  on public.email_deliveries (kind, about_user_id)
  where status = 'sent' and about_user_id is not null;

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
  v_target uuid := coalesce(p_user_id, (select auth.uid()));
  v_recipient text;
  v_about uuid;
begin
  if v_actor is null then
    raise exception 'Registrar un envío necesita una sesión.'
      using errcode = '42501';
  end if;

  if v_target <> v_actor and not private.can_read_donors() then
    raise exception 'Sólo un rol interno puede registrar un envío de otra cuenta.'
      using errcode = '42501';
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
