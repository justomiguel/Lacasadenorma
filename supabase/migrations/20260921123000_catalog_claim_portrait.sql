-- Sexta columna pública: si esa reserva tiene retrato (FR-246 enmendado).
-- El path no se otorga. Lo mantiene un disparador (ADR-030).

alter table public.donation_pledges
  add column has_portrait boolean not null default false;

comment on column public.donation_pledges.has_portrait is
  'Si el perfil de esta reserva tiene retrato. Lo mantiene un disparador. Público vía grant y donation_catalog_claims.';

grant select (has_portrait) on public.donation_pledges to anon;

create or replace function private.sync_pledge_has_portrait_from_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.donation_pledges as p
     set has_portrait = (new.portrait_path is not null)
   where p.user_id = new.id
     and p.is_anonymous = false;
  return new;
end;
$$;

revoke all on function private.sync_pledge_has_portrait_from_profile() from public;

create trigger donor_profiles_sync_pledge_has_portrait
  after insert or update of portrait_path on public.donor_profiles
  for each row
  execute function private.sync_pledge_has_portrait_from_profile();

create or replace function private.sync_pledge_has_portrait_from_pledge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
begin
  if new.is_anonymous or new.user_id is null then
    new.has_portrait := false;
    return new;
  end if;

  select d.portrait_path into v_path
    from public.donor_profiles as d
   where d.id = new.user_id;

  new.has_portrait := v_path is not null;
  return new;
end;
$$;

revoke all on function private.sync_pledge_has_portrait_from_pledge() from public;

create trigger donation_pledges_sync_has_portrait
  before insert or update of user_id, is_anonymous on public.donation_pledges
  for each row
  execute function private.sync_pledge_has_portrait_from_pledge();

update public.donation_pledges as p
   set has_portrait = exists (
     select 1
       from public.donor_profiles as d
      where d.id = p.user_id
        and d.portrait_path is not null
   )
 where p.is_anonymous = false
   and p.user_id is not null;

create or replace view public.donation_catalog_claims
  with (security_invoker = true)
as
select p.id,
       p.item_id,
       p.quantity,
       p.donor_display_name,
       p.fulfilled_at,
       p.has_portrait
  from public.donation_pledges p;

comment on view public.donation_catalog_claims is
  'Quién tomó un ítem y eligió aparecer. Seis columnas, las del GRANT. Lo anónimo lo filtra la policy (FR-255).';
