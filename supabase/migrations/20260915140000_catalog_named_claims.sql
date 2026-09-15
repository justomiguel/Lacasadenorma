-- El catálogo nombra quién se anotó, sin mezclarlo con el muro (FR-255, D2).
--
-- La policy de `anon` pasa a admitir reservas y entregas **con nombre**. El
-- muro no debe listar una promesa: su vista recorta a `fulfilled_at is not
-- null`, que `anon` sí puede nombrar. Lo anónimo sigue fuera: `is_anonymous`
-- no se otorga, y la policy lo exige en falso.
--
-- Las cinco columnas del GRANT no cambian. Agregar un campo al catálogo o al
-- muro sigue siendo dos lugares: la vista y el GRANT (ADR-030).

drop policy if exists donation_pledges_select_wall on public.donation_pledges;

create policy donation_pledges_select_wall on public.donation_pledges
  for select
  to anon
  using (
    is_anonymous = false
    and status in ('reserved', 'fulfilled')
  );

comment on policy donation_pledges_select_wall on public.donation_pledges is
  'Catálogo y muro: reservas y entregas con nombre. El muro recorta a lo entregado en la vista (D2, FR-255).';

create or replace view public.donation_wall
  with (security_invoker = true)
as
select p.id, p.item_id, p.quantity, p.donor_display_name, p.fulfilled_at
  from public.donation_pledges p
 where p.fulfilled_at is not null;

comment on view public.donation_wall is
  'Quién ayudó. Cinco columnas, las mismas del GRANT. El recorte a lo entregado es fulfilled_at, que anon puede nombrar; lo anónimo lo filtra la policy (ADR-030, D2).';

create view public.donation_catalog_claims
  with (security_invoker = true)
as
select p.id, p.item_id, p.quantity, p.donor_display_name, p.fulfilled_at
  from public.donation_pledges p;

comment on view public.donation_catalog_claims is
  'Quién tomó un ítem y eligió aparecer. Cinco columnas, las mismas del GRANT. Reserva o entrega: fulfilled_at nulo o no. Lo anónimo lo filtra la policy (FR-255).';

grant select on public.donation_catalog_claims to anon, authenticated;

create index donation_pledges_named_claims_idx
  on public.donation_pledges (item_id)
  where is_anonymous = false and status in ('reserved', 'fulfilled');
