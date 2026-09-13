-- El muro: cinco columnas, las filas que se pueden publicar, y una vista que
-- no sortea ninguna de las dos barreras (ADR-030).
--
-- Tres capas, tres preguntas, y por eso están las tres:
--   · la policy dice qué filas (entregada, no anónima);
--   · el GRANT de columna dice qué columnas;
--   · security_invoker dice que la vista no las sortee.
--
-- `to anon` solo. Mezclar con authenticated exigiría otorgar EXECUTE de
-- funciones internas a anon (E3) y check-rls lo marcaría como apertura. Las
-- páginas públicas consultan con el cliente anónimo, a propósito.

create policy donation_pledges_select_wall on public.donation_pledges
  for select
  to anon
  using (status = 'fulfilled' and is_anonymous = false);

comment on policy donation_pledges_select_wall on public.donation_pledges is
  'El muro: sólo lo entregado y no anónimo. Anon, no authenticated (E3, D2).';

-- Sin GRANT de tabla: un select * escrito de apuro falla. Las cinco columnas
-- son las mismas de la vista. Agregar un campo al muro son dos lugares: esta
-- lista y el GRANT (ADR-030).

grant select (id, item_id, quantity, donor_display_name, fulfilled_at)
  on public.donation_pledges to anon;

-- La policy nombra `is_anonymous`. Tiene que liderar un índice (010, T050).
-- El de `(status, is_anonymous, fulfilled_at)` ya existía y lidera `status`;
-- éste lidera `is_anonymous` y cubre el recorte del muro.
create index donation_pledges_wall_anonymous_idx
  on public.donation_pledges (is_anonymous, fulfilled_at desc)
  where status = 'fulfilled';

create view public.donation_wall
  with (security_invoker = true)
as
select p.id, p.item_id, p.quantity, p.donor_display_name, p.fulfilled_at
  from public.donation_pledges p;

comment on view public.donation_wall is
  'Quién ayudó. Cinco columnas, las mismas del GRANT. El filtro de filas está en la policy (ADR-030).';

grant select on public.donation_wall to anon, authenticated;
