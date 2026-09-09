-- Policies RLS. Implementan la matriz de visibilidad de data-model.md §4.
--
-- Cinco reglas se aplican sin excepción en este archivo, y cada una viene de un
-- problema concreto que `supabase db advisors` o el modelo de amenazas señalan:
--
-- 1. **Una sola policy por tabla, comando y rol.** Dos policies permisivas para la
--    misma combinación se evalúan las dos en cada fila: es el aviso
--    `multiple_permissive_policies` y un costo real en una tabla que crece.
-- 2. **La lectura pública y la interna se separan por rol.** `anon` recibe una
--    policy que comprueba `published_at` y nada más; `authenticated` recibe otra
--    que además admite a los roles internos. Postgres evalúa únicamente las
--    policies del rol que consulta, así que no se suman.
--
--    La razón no es de estilo. Una policy se evalúa con los privilegios de quien
--    consulta, no con los del dueño de la tabla: si la policy de `anon` nombrara
--    `private.has_min_role`, habría que otorgarle EXECUTE, y la amenaza E3 dice
--    exactamente lo contrario. Separando por rol, el rol anónimo no puede ni
--    invocar la función de autorización.
-- 3. **Toda llamada a `auth.*()` va envuelta en un subselect.** `(select auth.uid())`
--    se evalúa una vez por consulta; `auth.uid()` suelto, una vez por fila. Acá
--    las llamadas quedan dentro de `has_min_role`, que es `stable`, así que el
--    planificador la evalúa una sola vez por consulta.
-- 4. **Toda policy de UPDATE lleva `using` y `with check`.** Sin `with check`, un
--    update puede mover la fila a un estado que la policy no habría permitido
--    (amenaza E4).
-- 5. **Las escrituras se declaran por comando**, nunca `for all`: `for all` mezcla
--    la condición de lectura con la de escritura y esconde errores.
--
-- Sobre los roles: `private.has_min_role('auditor')` es "cualquier rol interno" y
-- habilita la lectura de lo que todavía no está publicado. Cualquier escritura
-- pide `'editor'` o más, así que `auditor` queda fuera de todas por construcción,
-- no por enumeración.
--
-- El libro —aportes, gastos, comprobantes y auditoría— es la excepción y usa
-- `private.can_read_ledger()`: ahí `editor` no entra, y el rango no puede decir
-- eso porque `editor` está por encima de `auditor` (data-model.md §4, amenaza E1).

-- ── campaigns ───────────────────────────────────────────────────────────────

create policy campaigns_select_public on public.campaigns
  for select to anon
  using (published_at is not null);

create policy campaigns_select_internal on public.campaigns
  for select to authenticated
  using (published_at is not null or private.has_min_role('auditor'));

create policy campaigns_insert on public.campaigns
  for insert to authenticated
  with check (private.has_min_role('admin'));

create policy campaigns_update on public.campaigns
  for update to authenticated
  using (private.has_min_role('admin'))
  with check (private.has_min_role('admin'));

create policy campaigns_delete on public.campaigns
  for delete to authenticated
  using (private.has_min_role('owner'));

-- ── budget_items ────────────────────────────────────────────────────────────

create policy budget_items_select_public on public.budget_items
  for select to anon
  using (published_at is not null);

create policy budget_items_select_internal on public.budget_items
  for select to authenticated
  using (published_at is not null or private.has_min_role('auditor'));

create policy budget_items_insert on public.budget_items
  for insert to authenticated
  with check (private.has_min_role('admin'));

create policy budget_items_update on public.budget_items
  for update to authenticated
  using (private.has_min_role('admin'))
  with check (private.has_min_role('admin'));

create policy budget_items_delete on public.budget_items
  for delete to authenticated
  using (private.has_min_role('admin'));

-- ── contributions ───────────────────────────────────────────────────────────
-- Sin ninguna policy para `anon`, y sin el privilegio de SELECT: un aporte
-- individual puede identificar a una persona (FR-014, amenaza I2). Lo público es
-- la vista agregada `campaign_totals`.

-- `can_read_ledger()` y no `has_min_role('auditor')`: `editor` es de rango mayor
-- que `auditor` y con la versión por rango leía todos los aportes (amenaza E1).
create policy contributions_select on public.contributions
  for select to authenticated
  using (private.can_read_ledger());

create policy contributions_insert on public.contributions
  for insert to authenticated
  with check (private.has_min_role('admin'));

-- No hay policy de DELETE: un aporte se anula con motivo, no se borra (FR-015).
create policy contributions_update on public.contributions
  for update to authenticated
  using (private.has_min_role('admin'))
  with check (private.has_min_role('admin'));

-- ── expenses ────────────────────────────────────────────────────────────────
-- Asimetría deliberada con `contributions`: un gasto es información institucional.
-- Un gasto anulado deja de ser público, porque publicarlo lo haría contar dos
-- veces en la lectura de una persona aunque no cuente en la suma.

create policy expenses_select_public on public.expenses
  for select to anon
  using (published_at is not null and voided_at is null);

-- `editor` ve exactamente lo mismo que el público: un gasto en borrador o anulado
-- es información del libro y no le corresponde (data-model.md §4, amenaza E1).
create policy expenses_select_internal on public.expenses
  for select to authenticated
  using (
    (published_at is not null and voided_at is null)
    or private.can_read_ledger()
  );

create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (private.has_min_role('admin'));

create policy expenses_update on public.expenses
  for update to authenticated
  using (private.has_min_role('admin'))
  with check (private.has_min_role('admin'));

-- ── expense_receipts ────────────────────────────────────────────────────────
-- Sin lectura para `anon` (amenaza I1). El público sabe que el comprobante existe
-- por el contador de la vista; el archivo lo obtiene `auditor`+ con URL firmada.

create policy expense_receipts_select on public.expense_receipts
  for select to authenticated
  using (private.can_read_ledger());

create policy expense_receipts_insert on public.expense_receipts
  for insert to authenticated
  with check (private.has_min_role('admin'));

create policy expense_receipts_delete on public.expense_receipts
  for delete to authenticated
  using (private.has_min_role('admin'));

-- ── milestones ──────────────────────────────────────────────────────────────
-- `editor` publica avance de obra: es contenido, no plata.

create policy milestones_select_public on public.milestones
  for select to anon
  using (published_at is not null);

create policy milestones_select_internal on public.milestones
  for select to authenticated
  using (published_at is not null or private.has_min_role('auditor'));

create policy milestones_insert on public.milestones
  for insert to authenticated
  with check (private.has_min_role('editor'));

create policy milestones_update on public.milestones
  for update to authenticated
  using (private.has_min_role('editor'))
  with check (private.has_min_role('editor'));

create policy milestones_delete on public.milestones
  for delete to authenticated
  using (private.has_min_role('admin'));

-- ── media ───────────────────────────────────────────────────────────────────
-- Las fotos viven en un bucket público: ocultar la fila no ocultaría el archivo,
-- así que la lectura es abierta y no se finge lo contrario.

create policy media_select_public on public.media
  for select to anon
  using (true);

create policy media_select_internal on public.media
  for select to authenticated
  using (true);

create policy media_insert on public.media
  for insert to authenticated
  with check (private.has_min_role('editor'));

create policy media_update on public.media
  for update to authenticated
  using (private.has_min_role('editor'))
  with check (private.has_min_role('editor'));

create policy media_delete on public.media
  for delete to authenticated
  using (private.has_min_role('admin'));

-- ── updates ─────────────────────────────────────────────────────────────────

create policy updates_select_public on public.updates
  for select to anon
  using (published_at is not null);

create policy updates_select_internal on public.updates
  for select to authenticated
  using (published_at is not null or private.has_min_role('auditor'));

create policy updates_insert on public.updates
  for insert to authenticated
  with check (private.has_min_role('editor'));

create policy updates_update on public.updates
  for update to authenticated
  using (private.has_min_role('editor'))
  with check (private.has_min_role('editor'));

create policy updates_delete on public.updates
  for delete to authenticated
  using (private.has_min_role('admin'));

-- ── update_media ────────────────────────────────────────────────────────────
-- La visibilidad la hereda de la novedad. El subselect sobre `updates` pasa por la
-- RLS de `updates` para quien consulta, así que un borrador no aparece ni acá.

create policy update_media_select_public on public.update_media
  for select to anon
  using (
    exists (
      select 1
        from public.updates u
       where u.id = update_media.update_id
         and u.published_at is not null
    )
  );

create policy update_media_select_internal on public.update_media
  for select to authenticated
  using (
    exists (
      select 1
        from public.updates u
       where u.id = update_media.update_id
         and u.published_at is not null
    )
    or private.has_min_role('auditor')
  );

create policy update_media_insert on public.update_media
  for insert to authenticated
  with check (private.has_min_role('editor'));

create policy update_media_update on public.update_media
  for update to authenticated
  using (private.has_min_role('editor'))
  with check (private.has_min_role('editor'));

create policy update_media_delete on public.update_media
  for delete to authenticated
  using (private.has_min_role('editor'));

-- ── people ──────────────────────────────────────────────────────────────────

create policy people_select_public on public.people
  for select to anon
  using (published_at is not null);

create policy people_select_internal on public.people
  for select to authenticated
  using (published_at is not null or private.has_min_role('auditor'));

create policy people_insert on public.people
  for insert to authenticated
  with check (private.has_min_role('admin'));

create policy people_update on public.people
  for update to authenticated
  using (private.has_min_role('editor'))
  with check (private.has_min_role('editor'));

create policy people_delete on public.people
  for delete to authenticated
  using (private.has_min_role('admin'));

-- ── payment_methods ─────────────────────────────────────────────────────────
-- **Sólo `owner` escribe.** Cambiar un CBU es la operación de mayor impacto del
-- sistema: quien la controle puede desviar todos los aportes (amenaza T1).

create policy payment_methods_select_public on public.payment_methods
  for select to anon
  using (published_at is not null);

create policy payment_methods_select_internal on public.payment_methods
  for select to authenticated
  using (published_at is not null or private.has_min_role('auditor'));

create policy payment_methods_insert on public.payment_methods
  for insert to authenticated
  with check (private.has_min_role('owner'));

create policy payment_methods_update on public.payment_methods
  for update to authenticated
  using (private.has_min_role('owner'))
  with check (private.has_min_role('owner'));

create policy payment_methods_delete on public.payment_methods
  for delete to authenticated
  using (private.has_min_role('owner'));

-- ── user_roles ──────────────────────────────────────────────────────────────
-- `admin` ve quién tiene qué rol; sólo `owner` los otorga. La policy de select de
-- `supabase_auth_admin` se creó junto con la tabla.

create policy user_roles_select on public.user_roles
  for select to authenticated
  using (private.has_min_role('admin'));

create policy user_roles_insert on public.user_roles
  for insert to authenticated
  with check (private.has_min_role('owner'));

create policy user_roles_update on public.user_roles
  for update to authenticated
  using (private.has_min_role('owner'))
  with check (private.has_min_role('owner'));

create policy user_roles_delete on public.user_roles
  for delete to authenticated
  using (private.has_min_role('owner'));

-- ── audit_log ───────────────────────────────────────────────────────────────
-- Append-only. **No existe policy de UPDATE ni de DELETE**, y su ausencia es la
-- garantía: sin policy, la operación se niega para todos los roles, incluido
-- `owner` (amenaza T2).

create policy audit_log_select on public.audit_log
  for select to authenticated
  using (private.can_read_ledger());

create policy audit_log_insert on public.audit_log
  for insert to authenticated
  with check (private.has_min_role('admin'));

-- ── Privilegios de tabla ────────────────────────────────────────────────────
-- RLS filtra filas, pero no otorga el privilegio de la operación. Sin estos GRANT,
-- las policies serían correctas y las consultas fallarían igual.
--
-- `contributions`, `expense_receipts`, `user_roles` y `audit_log` **no** están en
-- la lista de `anon`. Es una segunda barrera además de la ausencia de policy: si
-- alguna vez alguien agregara una policy de lectura para `anon` por error, la
-- consulta seguiría fallando por falta de privilegio.

grant select on
  public.campaigns,
  public.budget_items,
  public.expenses,
  public.milestones,
  public.media,
  public.updates,
  public.update_media,
  public.people,
  public.payment_methods
to anon, authenticated;

grant select, insert, update, delete on
  public.campaigns,
  public.budget_items,
  public.expenses,
  public.milestones,
  public.media,
  public.updates,
  public.update_media,
  public.people,
  public.payment_methods,
  public.contributions,
  public.expense_receipts,
  public.user_roles
to authenticated;

grant select, insert on public.audit_log to authenticated;
grant usage on sequence public.audit_log_id_seq to authenticated;
