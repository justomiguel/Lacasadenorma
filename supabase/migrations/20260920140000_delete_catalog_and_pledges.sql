-- El owner puede borrar un ítem del catálogo aunque alguien se haya anotado,
-- y puede borrar una donación o un aviso. Las filas hijas se van con él;
-- el correo enviado queda, sin la reserva (FR-222 enmendado).

alter table public.donation_pledges
  drop constraint donation_pledges_item_id_fkey;

alter table public.donation_pledges
  add constraint donation_pledges_item_id_fkey
  foreign key (item_id) references public.donation_items (id) on delete cascade;

alter table public.donation_offers
  drop constraint donation_offers_item_id_fkey;

alter table public.donation_offers
  add constraint donation_offers_item_id_fkey
  foreign key (item_id) references public.donation_items (id) on delete cascade;

alter table public.donation_offers
  drop constraint donation_offers_pledge_id_fkey;

alter table public.donation_offers
  add constraint donation_offers_pledge_id_fkey
  foreign key (pledge_id) references public.donation_pledges (id) on delete cascade;

alter table public.email_deliveries
  drop constraint email_deliveries_pledge_id_fkey;

alter table public.email_deliveries
  add constraint email_deliveries_pledge_id_fkey
  foreign key (pledge_id) references public.donation_pledges (id) on delete set null;

-- Al borrar una reserva se devuelven las unidades. Cancelada o vencida ya las
-- había devuelto: no se toca el contador.

create function private.sync_item_quantities_on_pledge_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'reserved' then
    update public.donation_items
       set reserved_quantity = reserved_quantity - old.quantity
     where id = old.item_id;
  elsif old.status = 'fulfilled' then
    update public.donation_items
       set fulfilled_quantity = fulfilled_quantity - old.quantity
     where id = old.item_id;
  end if;

  return old;
end;
$$;

revoke all on function private.sync_item_quantities_on_pledge_delete() from public;

create trigger donation_pledges_sync_quantities_on_delete
  before delete on public.donation_pledges
  for each row
  execute function private.sync_item_quantities_on_pledge_delete();

create function public.delete_donation_pledge(p_pledge_id uuid)
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

  delete from public.donation_pledges where id = p_pledge_id;

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_donation_pledge(uuid) from public;
grant execute on function public.delete_donation_pledge(uuid) to authenticated;

comment on function public.delete_donation_pledge(uuid) is
  'Borra una reserva. Sólo admin+. Devuelve las unidades si seguían comprometidas.';

create function public.delete_donation_offer(p_offer_id uuid)
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

  delete from public.donation_offers where id = p_offer_id;

  if not found then
    raise exception 'no_encontrada' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_donation_offer(uuid) from public;
grant execute on function public.delete_donation_offer(uuid) to authenticated;

comment on function public.delete_donation_offer(uuid) is
  'Borra un aviso por teléfono. Sólo admin+.';
