-- Vista pública agregada de la campaña.
--
-- `security_invoker = true` **no es opcional**. Las vistas de Postgres se ejecutan
-- con los privilegios de quien las creó, así que por defecto **bypasean RLS**: una
-- vista sobre `contributions` sin esta opción expondría los aportes individuales a
-- cualquiera (amenaza I3). Con `security_invoker`, la RLS de las tablas de base se
-- evalúa con el rol de quien consulta.
--
-- Eso plantea un problema real: `anon` no puede leer `contributions`, así que la
-- vista le devolvería 0 recibido, que sería un dato falso. La solución no es
-- debilitar la RLS: es una función `security definer` que devuelve **solamente el
-- agregado**, con `search_path` fijado y sin exponer ninguna fila.
--
-- La vista agrega **por moneda** y no convierte. Si hay aportes en pesos y en
-- dólares se muestran por separado: una conversión requiere un tipo de cambio
-- explícito y fechado, que hoy no existe.

create or replace function private.campaign_totals_for(target_campaign_id uuid)
returns table (
  campaign_id uuid,
  currency char(3),
  received_minor bigint,
  spent_minor bigint,
  balance_minor bigint,
  expense_count integer,
  receipt_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with monedas as (
    select c.currency
      from public.contributions c
     where c.campaign_id = target_campaign_id
       and c.voided_at is null
    union
    select e.currency
      from public.expenses e
     where e.campaign_id = target_campaign_id
       and e.voided_at is null
       and e.published_at is not null
  )
  select
    target_campaign_id,
    m.currency,
    coalesce((
      select sum(c.amount_minor)
        from public.contributions c
       where c.campaign_id = target_campaign_id
         and c.currency = m.currency
         and c.voided_at is null
    ), 0)::bigint,
    coalesce((
      select sum(e.amount_minor)
        from public.expenses e
       where e.campaign_id = target_campaign_id
         and e.currency = m.currency
         and e.voided_at is null
         and e.published_at is not null
    ), 0)::bigint,
    (
      coalesce((
        select sum(c.amount_minor)
          from public.contributions c
         where c.campaign_id = target_campaign_id
           and c.currency = m.currency
           and c.voided_at is null
      ), 0)
      - coalesce((
        select sum(e.amount_minor)
          from public.expenses e
         where e.campaign_id = target_campaign_id
           and e.currency = m.currency
           and e.voided_at is null
           and e.published_at is not null
      ), 0)
    )::bigint,
    (
      select count(*)
        from public.expenses e
       where e.campaign_id = target_campaign_id
         and e.currency = m.currency
         and e.voided_at is null
         and e.published_at is not null
    )::integer,
    (
      select count(*)
        from public.expense_receipts r
        join public.expenses e on e.id = r.expense_id
       where e.campaign_id = target_campaign_id
         and e.currency = m.currency
         and e.voided_at is null
         and e.published_at is not null
    )::integer
  from monedas m
$$;

-- La función es `security definer`, así que se le revoca EXECUTE a PUBLIC y se
-- otorga sólo a los roles que la necesitan a través de la vista.
revoke all on function private.campaign_totals_for(uuid) from public;
grant execute on function private.campaign_totals_for(uuid) to anon, authenticated;

comment on function private.campaign_totals_for(uuid) is
  'Agregado por moneda. security definer para que anon vea totales sin poder leer aportes individuales. Nunca devuelve filas de detalle.';

create view public.campaign_totals
with (security_invoker = true) as
select
  c.id as campaign_id,
  c.goal_amount_minor,
  c.goal_currency,
  c.reconciled_at,
  t.currency,
  t.received_minor,
  t.spent_minor,
  t.balance_minor,
  t.expense_count,
  t.receipt_count
from public.campaigns c
cross join lateral private.campaign_totals_for(c.id) t
where c.published_at is not null;

grant select on public.campaign_totals to anon, authenticated;

comment on view public.campaign_totals is
  'Totales públicos por moneda. security_invoker = true: sin esa opción la vista bypasearía RLS.';
