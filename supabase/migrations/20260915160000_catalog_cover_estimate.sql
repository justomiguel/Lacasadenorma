-- El estimado sale a la ficha, y la reserva sabe si se cubre con plata.
--
-- ADR-041: la vista pública incluye estimated_unit_amount_minor + currency.
-- Cubrir con transferencia, Mercado Pago o PayPal reserva las mismas unidades
-- que traer el objeto. El estimado no entra al libro.

create type public.donation_cover_channel as enum (
  'bring',
  'transfer',
  'mercadopago',
  'paypal'
);

alter table public.donation_pledges
  add column cover_channel public.donation_cover_channel not null default 'bring';

comment on column public.donation_pledges.cover_channel is
  'Cómo se cubre el ítem. No se publica. El default es traerlo (ADR-041).';

drop view if exists public.donation_catalog;

create view public.donation_catalog
  with (security_invoker = true)
as
select
  i.id,
  i.campaign_id,
  i.budget_item_id,
  i.title,
  i.description,
  i.unit,
  i.category,
  i.needed_quantity,
  i.needed_quantity - i.reserved_quantity - i.fulfilled_quantity as remaining_quantity,
  i.fulfilled_quantity,
  i.estimated_unit_amount_minor,
  i.currency,
  i.photo_media_id,
  i.sort_order
from public.donation_items i
where i.published_at is not null;

comment on view public.donation_catalog is
  'Catálogo público: qué falta, con el estimado de la ficha. Sin borradores, security_invoker (ADR-041).';

grant select on public.donation_catalog to anon, authenticated;

drop function if exists public.claim_donation_item(uuid, integer, boolean, text, text);

create function public.claim_donation_item(
  p_item_id uuid,
  p_quantity integer default 1,
  p_is_anonymous boolean default true,
  p_display_name text default null,
  p_note text default null,
  p_cover_channel public.donation_cover_channel default 'bring'
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

  if v_approval is distinct from 'approved' then
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

  if not v_anonymous and v_name is null then
    raise exception 'nombre_requerido' using errcode = '23514';
  end if;

  if v_anonymous then
    v_name := null;
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
    now() + interval '14 days'
  )
  returning * into v_pledge;

  return v_pledge;
end;
$$;

revoke all on function public.claim_donation_item(
  uuid, integer, boolean, text, text, public.donation_cover_channel
) from public;
grant execute on function public.claim_donation_item(
  uuid, integer, boolean, text, text, public.donation_cover_channel
) to authenticated;

comment on function public.claim_donation_item(
  uuid, integer, boolean, text, text, public.donation_cover_channel
) is
  'Única vía para crear una reserva. cover_channel default bring. El user_id es el de la sesión.';
