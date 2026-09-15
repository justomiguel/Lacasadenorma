-- Muro público de aportes en plata: el nombre, y el porcentaje sólo si se prende.
--
-- `anon` sigue sin SELECT sobre `contributions` (FR-014, ADR-016, amenaza I2). Lo
-- que se publica es otra cosa: una función `security definer` que devuelve el
-- nombre consentido, la fecha, la moneda y —si la campaña lo prende— el
-- porcentaje truncado sobre lo ya recibido en esa moneda. Nunca `amount_minor`.
-- El interruptor apagado no es una decisión de presentación: la función devuelve
-- `null` en esa columna.

alter table public.campaigns
  add column publish_contribution_share boolean not null default false;

comment on column public.campaigns.publish_contribution_share is
  'Si el muro de aportes muestra el % sobre lo ya recibido. Default false: sólo el nombre. Los montos no se publican nunca (ADR-042).';

alter table public.contributions
  add constraint contributions_named_or_anonymous
  check (
    is_anonymous
    or (
      contributor_display_name is not null
      and length(btrim(contributor_display_name)) > 0
    )
  );

comment on column public.contributions.contributor_display_name is
  'Nombre público, sólo con consentimiento explícito. Vacío si is_anonymous (ADR-042).';

comment on column public.contributions.is_anonymous is
  'Default true. Aparecer en el muro exige false y un contributor_display_name.';

create index contributions_wall_idx
  on public.contributions (campaign_id, received_at desc)
  where voided_at is null and is_anonymous = false;

create or replace function private.contribution_wall_for(p_campaign_id uuid)
returns table (
  id uuid,
  campaign_id uuid,
  donor_display_name text,
  received_at date,
  currency char(3),
  percent_of_received integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    co.id,
    co.campaign_id,
    co.contributor_display_name,
    co.received_at,
    co.currency,
    case
      when not ca.publish_contribution_share then null
      when t.received_minor is null or t.received_minor <= 0 then null
      when (co.amount_minor * 100) / t.received_minor < 1 then null
      when (co.amount_minor * 100) / t.received_minor > 100 then 100
      else ((co.amount_minor * 100) / t.received_minor)::integer
    end
  from public.contributions co
  join public.campaigns ca on ca.id = co.campaign_id
  left join lateral (
    select sum(c.amount_minor)::bigint as received_minor
      from public.contributions c
     where c.campaign_id = co.campaign_id
       and c.currency = co.currency
       and c.voided_at is null
  ) t on true
  where co.campaign_id = p_campaign_id
    and ca.published_at is not null
    and co.voided_at is null
    and co.is_anonymous = false
    and co.contributor_display_name is not null
  order by co.received_at desc, co.id desc;
$$;

revoke all on function private.contribution_wall_for(uuid) from public;
grant execute on function private.contribution_wall_for(uuid) to anon, authenticated;

comment on function private.contribution_wall_for(uuid) is
  'Muro de aportes: nombre consentido y % opcional. security definer para que anon no lea contributions. Nunca devuelve amount_minor. El % es null si el interruptor está apagado, si no hay recibido o si el truncado es 0 (ADR-042).';

create view public.contribution_wall
with (security_invoker = true) as
select
  w.id,
  w.campaign_id,
  w.donor_display_name,
  w.received_at,
  w.currency,
  w.percent_of_received
from public.campaigns c
cross join lateral private.contribution_wall_for(c.id) w
where c.published_at is not null;

grant select on public.contribution_wall to anon, authenticated;

comment on view public.contribution_wall is
  'Nombres de aportes en plata con consentimiento. percent_of_received es null si la campaña no publica el %. Nunca incluye montos. security_invoker = true (ADR-042).';
