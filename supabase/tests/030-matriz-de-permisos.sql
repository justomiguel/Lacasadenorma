-- T081 — La matriz completa de permisos: rol × tabla × operación.
--
-- Es la prueba que sostiene las amenazas E1 y E2. Todo lo demás del modelo de
-- seguridad se apoya en que esta tabla sea exactamente la de data-model.md §4:
-- `editor` publica contenido y no toca plata, `auditor` lee todo y no escribe
-- nada, sólo `owner` administra las cuentas de aporte.
--
-- ── Cómo se ejecuta ─────────────────────────────────────────────────────────
--
-- En lugar de escribir 260 aserciones a mano, se **ejecuta de verdad** cada una
-- de las 4 operaciones sobre cada una de las 13 tablas con cada uno de los 5
-- roles, y recién después se compara el resultado completo contra la matriz
-- esperada. La diferencia con una lista de `throws_ok` no es de estilo: acá una
-- tabla nueva o una policy nueva aparecen solas en el resultado observado y la
-- comparación falla, en lugar de quedar sin cubrir en silencio.
--
-- `pg_temp.intentar()` cambia de rol, fija el JWT, ejecuta la sentencia dentro de
-- una subtransacción y **la revierte siempre**, gane o pierda. Por eso una celda
-- no puede contaminar a la siguiente, y por eso el fixture sigue intacto cuando
-- terminan las 260 ejecuciones.
--
-- ── Los tres veredictos de una negación, que no son lo mismo ────────────────
--
--   'sin privilegio'  la consulta **falla** con 42501 porque el rol no tiene el
--                     GRANT. Es la barrera exterior, anterior a RLS.
--   'denegado (RLS)'  la operación es posible pero la policy no deja pasar
--                     ninguna fila. Un UPDATE o un DELETE así **no lanzan
--                     excepción**: afectan cero filas y devuelven éxito. Es
--                     exactamente la amenaza E5, y por eso acá se cuentan filas
--                     afectadas en lugar de esperar un error. Un INSERT sí lanza
--                     excepción, con el mensaje "new row violates row-level
--                     security policy", que se distingue del anterior por texto.
--   'nada'            la lectura no falla y devuelve cero filas.
--
-- Distinguirlos importa: el día que alguien agregue un `grant select ... to anon`
-- sobre `contributions`, el veredicto pasa de 'sin privilegio' a 'nada' y esta
-- prueba lo dice, aunque en las dos situaciones el visitante siga sin ver un
-- aporte. Es la diferencia entre dos barreras y una sola.
--
-- ── Sobre las filas de prueba ───────────────────────────────────────────────
--
-- Se insertan dentro de la transacción y **se revierten al terminar**. No son un
-- fixture ni datos de ejemplo, y no violan la regla del proyecto de no introducir
-- datos de muestra: no existen fuera de esta prueba y nadie las puede ver.
--
-- Cada tabla recibe exactamente dos filas: una "pública" (publicada, o sin
-- `published_at` cuando la tabla no tiene esa columna) y una "reservada"
-- (borrador). Con eso, la cantidad de filas visibles es el veredicto de lectura:
-- 0 = nada, 1 = sólo lo publicado, 2 = todo. Una aserción comprueba que la
-- convención se cumple antes de interpretar ningún resultado.

begin;
select plan(30);

-- ── Filas de prueba ─────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'quien.administra@ejemplo.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'quien.audita@ejemplo.invalid');

insert into public.campaigns (id, slug, title, summary, status, published_at) values
  ('c0000000-0000-4000-8000-000000000001', 'obra-publicada', 'Obra publicada', 'Resumen', 'active', now()),
  ('c0000000-0000-4000-8000-000000000002', 'obra-en-borrador', 'Obra en borrador', 'Resumen', 'draft', null);

insert into public.budget_items (id, campaign_id, title, published_at) values
  ('b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Rubro publicado', now()),
  ('b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Rubro en borrador', null);

-- Los aportes no tienen `published_at`: ninguno es público, y esa es la amenaza I2.
insert into public.contributions (id, campaign_id, amount_minor, currency, received_at) values
  ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 100000, 'ARS', date '2026-08-01'),
  ('f0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',  50000, 'ARS', date '2026-08-02');

insert into public.expenses (id, campaign_id, amount_minor, currency, spent_at, concept, category, published_at) values
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 30000, 'ARS', date '2026-08-05', 'Chapas', 'materiales', now()),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',  9000, 'ARS', date '2026-08-07', 'Arena', 'materiales', null);

insert into public.expense_receipts (id, expense_id, storage_path, file_name, mime_type, size_bytes) values
  ('90000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'comprobantes/chapas.pdf', 'chapas.pdf', 'application/pdf', 120000),
  ('90000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'comprobantes/arena.pdf', 'arena.pdf', 'application/pdf', 90000);

insert into public.milestones (id, campaign_id, title, status, happened_on, published_at) values
  ('70000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Techo colocado', 'completado', date '2026-08-09', now()),
  ('70000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Hito en borrador', 'pendiente', null, null);

-- `media` no tiene `published_at` y su lectura es abierta: el bucket de fotos es
-- público y esconder la fila no escondería el archivo. Las dos filas son públicas.
insert into public.media (id, storage_path, alt_text, width, height) values
  ('d0000000-0000-4000-8000-000000000001', 'fotos/techo.jpg', 'Cabriadas apoyadas sobre los muros', 1600, 1200),
  ('d0000000-0000-4000-8000-000000000002', 'fotos/frente.jpg', 'Frente de la casa con el revoque a la vista', 1600, 1200);

insert into public.updates (id, campaign_id, slug, title, body, published_at) values
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'llego-el-techo', 'Llegó el techo', 'Se colocaron las cabriadas.', now()),
  ('a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'novedad-en-borrador', 'Novedad en borrador', 'Todavía no.', null);

-- Una foto por novedad: la visibilidad de la relación la hereda de la novedad.
insert into public.update_media (update_id, media_id) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002');

insert into public.people (id, slug, full_name, published_at) values
  ('80000000-0000-4000-8000-000000000001', 'norma', 'Norma', now()),
  ('80000000-0000-4000-8000-000000000002', 'persona-en-borrador', 'Persona en borrador', null);

-- Sin `payment_method_id` en los aportes a propósito: la referencia es ON DELETE
-- RESTRICT y haría fallar el borrado de `owner` por integridad referencial, que no
-- es lo que esta prueba mide.
insert into public.payment_methods (id, campaign_id, country_code, currency, label, fields, published_at) values
  ('60000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'AR', 'ARS', 'Transferencia publicada',
   '[{"label": "CBU", "value": "0170099220000067797", "copyable": true}]'::jsonb, now()),
  ('60000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'US', 'USD', 'Cuenta en borrador',
   '[{"label": "Routing", "value": "021000021", "copyable": true}]'::jsonb, null);

insert into public.user_roles (id, user_id, role) values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'admin'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'auditor');

insert into public.audit_log (action, entity_table, entity_id) values
  ('prueba.publica', 'expenses', 'e0000000-0000-4000-8000-000000000001'),
  ('prueba.reservada', 'expenses', 'e0000000-0000-4000-8000-000000000002');

-- ── El ejecutor ─────────────────────────────────────────────────────────────
-- Cambia de rol, fija el JWT igual que lo hace PostgREST por transacción, corre la
-- sentencia y revierte. El `raise` con el código ZZ001 es el mecanismo de la
-- reversión: obliga a la subtransacción a deshacerse incluso cuando la operación
-- salió bien, y de paso transporta la cantidad de filas afectadas.

create function pg_temp.intentar(
  db_role text,
  claims jsonb,
  operacion text,
  sentencia text
)
returns text
language plpgsql
as $fn$
declare
  filas integer;
  veredicto text;
begin
  execute format('set local role %I', db_role);
  perform set_config('request.jwt.claims', coalesce(claims::text, ''), true);

  begin
    execute sentencia;
    get diagnostics filas = row_count;
    raise exception using errcode = 'ZZ001', message = filas::text;
  exception
    when sqlstate 'ZZ001' then
      filas := sqlerrm::integer;
      if operacion = 'lectura' then
        veredicto := case filas
                       when 0 then 'nada'
                       when 1 then 'sólo lo publicado'
                       when 2 then 'todo'
                       else 'inesperado: ' || filas
                     end;
      else
        veredicto := case when filas > 0 then 'permitido' else 'denegado (RLS)' end;
      end if;

    when insufficient_privilege then
      -- 42501 son dos cosas distintas: falta de GRANT y violación de policy en un
      -- INSERT. Se separan por el texto, que es lo único que las distingue.
      veredicto := case
                     when sqlerrm like 'new row violates row-level security policy%'
                       then 'denegado (RLS)'
                     else 'sin privilegio'
                   end;

    when others then
      -- Cualquier otro error es un problema de la prueba, no del esquema: una
      -- restricción violada, una clave duplicada, una tabla mal nombrada. Se
      -- reporta con su código en lugar de disfrazarse de negación.
      veredicto := 'error ' || sqlstate || ': ' || sqlerrm;
  end;

  reset role;
  perform set_config('request.jwt.claims', '', true);
  return veredicto;
end;
$fn$;

-- ── Los cinco roles ─────────────────────────────────────────────────────────
-- `anon` no lleva JWT. Los cuatro roles internos son el mismo rol de base de datos
-- —`authenticated`— y se distinguen sólo por el claim `app_metadata.user_role`,
-- que es exactamente cómo funciona en producción: el rol de Postgres lo fija
-- PostgREST según el token, y el rol de aplicación lo pone el hook de auth.

create temporary table rol (
  nombre text primary key,
  db_role text not null,
  claims jsonb
) on commit drop;

insert into rol (nombre, db_role, claims) values
  ('anon', 'anon', null),
  ('auditor', 'authenticated', '{"sub": "10000000-0000-4000-8000-000000000002", "app_metadata": {"user_role": "auditor"}}'),
  ('editor',  'authenticated', '{"sub": "10000000-0000-4000-8000-000000000001", "app_metadata": {"user_role": "editor"}}'),
  ('admin',   'authenticated', '{"sub": "10000000-0000-4000-8000-000000000001", "app_metadata": {"user_role": "admin"}}'),
  ('owner',   'authenticated', '{"sub": "10000000-0000-4000-8000-000000000001", "app_metadata": {"user_role": "owner"}}');

-- ── Las 52 operaciones ──────────────────────────────────────────────────────
-- Una lectura, una inserción, una modificación y un borrado por tabla.
--
-- La lectura se escribe como `select 1 from ...` y no como `select count(*)`: hay
-- que contar las filas que RLS deja pasar, y un `count(*)` devuelve siempre
-- exactamente una fila aunque la tabla esté completamente filtrada.
--
-- La modificación apunta siempre a la fila **pública**, para que ninguna negación
-- se explique por falta de visibilidad cuando lo que se quiere medir es la policy
-- de escritura. El borrado apunta a la fila **reservada**, que es la que no tiene
-- dependencias y puede desaparecer sin violar una clave foránea.

create temporary table caso (
  tabla text not null,
  operacion text not null,
  sentencia text not null,
  primary key (tabla, operacion)
) on commit drop;

insert into caso (tabla, operacion, sentencia) values
  ('campaigns', 'lectura', $s$select 1 from public.campaigns$s$),
  ('campaigns', 'inserción', $s$insert into public.campaigns (slug, title, summary) values ('obra-nueva', 'Obra nueva', 'Resumen')$s$),
  ('campaigns', 'modificación', $s$update public.campaigns set summary = 'Resumen cambiado' where id = 'c0000000-0000-4000-8000-000000000001'$s$),
  ('campaigns', 'borrado', $s$delete from public.campaigns where id = 'c0000000-0000-4000-8000-000000000002'$s$),

  ('budget_items', 'lectura', $s$select 1 from public.budget_items$s$),
  ('budget_items', 'inserción', $s$insert into public.budget_items (campaign_id, title) values ('c0000000-0000-4000-8000-000000000001', 'Rubro nuevo')$s$),
  ('budget_items', 'modificación', $s$update public.budget_items set description = 'Descripción cambiada' where id = 'b0000000-0000-4000-8000-000000000001'$s$),
  ('budget_items', 'borrado', $s$delete from public.budget_items where id = 'b0000000-0000-4000-8000-000000000002'$s$),

  ('contributions', 'lectura', $s$select 1 from public.contributions$s$),
  ('contributions', 'inserción', $s$insert into public.contributions (campaign_id, amount_minor, currency, received_at) values ('c0000000-0000-4000-8000-000000000001', 1000, 'ARS', date '2026-08-10')$s$),
  ('contributions', 'modificación', $s$update public.contributions set source_note = 'Conciliado' where id = 'f0000000-0000-4000-8000-000000000001'$s$),
  ('contributions', 'borrado', $s$delete from public.contributions where id = 'f0000000-0000-4000-8000-000000000002'$s$),

  ('expenses', 'lectura', $s$select 1 from public.expenses$s$),
  ('expenses', 'inserción', $s$insert into public.expenses (campaign_id, amount_minor, currency, spent_at, concept, category) values ('c0000000-0000-4000-8000-000000000001', 1000, 'ARS', date '2026-08-10', 'Clavos', 'materiales')$s$),
  ('expenses', 'modificación', $s$update public.expenses set supplier = 'Corralón del pueblo' where id = 'e0000000-0000-4000-8000-000000000001'$s$),
  ('expenses', 'borrado', $s$delete from public.expenses where id = 'e0000000-0000-4000-8000-000000000002'$s$),

  ('expense_receipts', 'lectura', $s$select 1 from public.expense_receipts$s$),
  ('expense_receipts', 'inserción', $s$insert into public.expense_receipts (expense_id, storage_path, file_name, mime_type, size_bytes) values ('e0000000-0000-4000-8000-000000000001', 'comprobantes/nuevo.pdf', 'nuevo.pdf', 'application/pdf', 1000)$s$),
  ('expense_receipts', 'modificación', $s$update public.expense_receipts set file_name = 'renombrado.pdf' where id = '90000000-0000-4000-8000-000000000001'$s$),
  ('expense_receipts', 'borrado', $s$delete from public.expense_receipts where id = '90000000-0000-4000-8000-000000000002'$s$),

  ('milestones', 'lectura', $s$select 1 from public.milestones$s$),
  ('milestones', 'inserción', $s$insert into public.milestones (campaign_id, title) values ('c0000000-0000-4000-8000-000000000001', 'Hito nuevo')$s$),
  ('milestones', 'modificación', $s$update public.milestones set description = 'Descripción cambiada' where id = '70000000-0000-4000-8000-000000000001'$s$),
  ('milestones', 'borrado', $s$delete from public.milestones where id = '70000000-0000-4000-8000-000000000002'$s$),

  ('media', 'lectura', $s$select 1 from public.media$s$),
  ('media', 'inserción', $s$insert into public.media (storage_path, alt_text, width, height) values ('fotos/nueva.jpg', 'Pared revocada a medio terminar', 800, 600)$s$),
  ('media', 'modificación', $s$update public.media set caption = 'Epígrafe cambiado' where id = 'd0000000-0000-4000-8000-000000000001'$s$),
  ('media', 'borrado', $s$delete from public.media where id = 'd0000000-0000-4000-8000-000000000002'$s$),

  ('updates', 'lectura', $s$select 1 from public.updates$s$),
  ('updates', 'inserción', $s$insert into public.updates (campaign_id, slug, title, body) values ('c0000000-0000-4000-8000-000000000001', 'novedad-nueva', 'Novedad nueva', 'Cuerpo')$s$),
  ('updates', 'modificación', $s$update public.updates set title = 'Título cambiado' where id = 'a0000000-0000-4000-8000-000000000001'$s$),
  ('updates', 'borrado', $s$delete from public.updates where id = 'a0000000-0000-4000-8000-000000000002'$s$),

  ('update_media', 'lectura', $s$select 1 from public.update_media$s$),
  ('update_media', 'inserción', $s$insert into public.update_media (update_id, media_id) values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002')$s$),
  ('update_media', 'modificación', $s$update public.update_media set sort_order = 5 where update_id = 'a0000000-0000-4000-8000-000000000001'$s$),
  ('update_media', 'borrado', $s$delete from public.update_media where update_id = 'a0000000-0000-4000-8000-000000000002'$s$),

  ('people', 'lectura', $s$select 1 from public.people$s$),
  ('people', 'inserción', $s$insert into public.people (slug, full_name) values ('persona-nueva', 'Persona nueva')$s$),
  ('people', 'modificación', $s$update public.people set role_label = 'Vecina' where id = '80000000-0000-4000-8000-000000000001'$s$),
  ('people', 'borrado', $s$delete from public.people where id = '80000000-0000-4000-8000-000000000002'$s$),

  ('payment_methods', 'lectura', $s$select 1 from public.payment_methods$s$),
  ('payment_methods', 'inserción', $s$insert into public.payment_methods (campaign_id, country_code, currency, label) values ('c0000000-0000-4000-8000-000000000001', 'CL', 'CLP', 'Cuenta nueva')$s$),
  ('payment_methods', 'modificación', $s$update public.payment_methods set instructions = 'Instrucciones cambiadas' where id = '60000000-0000-4000-8000-000000000001'$s$),
  ('payment_methods', 'borrado', $s$delete from public.payment_methods where id = '60000000-0000-4000-8000-000000000002'$s$),

  ('user_roles', 'lectura', $s$select 1 from public.user_roles$s$),
  ('user_roles', 'inserción', $s$insert into public.user_roles (user_id, role) values ('10000000-0000-4000-8000-000000000001', 'owner')$s$),
  ('user_roles', 'modificación', $s$update public.user_roles set granted_at = now() where id = '50000000-0000-4000-8000-000000000001'$s$),
  ('user_roles', 'borrado', $s$delete from public.user_roles where id = '50000000-0000-4000-8000-000000000002'$s$),

  ('audit_log', 'lectura', $s$select 1 from public.audit_log$s$),
  ('audit_log', 'inserción', $s$insert into public.audit_log (action, entity_table) values ('prueba.nueva', 'expenses')$s$),
  ('audit_log', 'modificación', $s$update public.audit_log set action = 'prueba.alterada' where action = 'prueba.publica'$s$),
  ('audit_log', 'borrado', $s$delete from public.audit_log where action = 'prueba.reservada'$s$);

-- ── La matriz esperada ──────────────────────────────────────────────────────
-- Se lee igual que la tabla de data-model.md §4, con una fila por rol y tabla.
--
-- Dónde el esquema dice algo que la tabla del documento no alcanza a expresar, hay
-- un comentario. Son cuatro lugares y los cuatro están explicados abajo; ninguno
-- es una concesión de esta prueba, sino la lectura literal de las policies, que es
-- lo único que se ejecuta en producción.

create temporary table esperado (
  rol text not null,
  tabla text not null,
  lectura text not null,
  insercion text not null,
  modificacion text not null,
  borrado text not null,
  primary key (rol, tabla)
) on commit drop;

-- `anon` no tiene ningún GRANT de escritura en ninguna tabla, así que ni siquiera
-- llega a la evaluación de una policy: falla antes, por privilegio. Y no tiene
-- GRANT de lectura sobre las cuatro tablas reservadas, que es la segunda barrera
-- detrás de la ausencia de policy (amenazas I1 e I2).
insert into esperado values
  ('anon', 'campaigns',        'sólo lo publicado', 'sin privilegio', 'sin privilegio', 'sin privilegio'),
  ('anon', 'budget_items',     'sólo lo publicado', 'sin privilegio', 'sin privilegio', 'sin privilegio'),
  ('anon', 'contributions',    'sin privilegio',    'sin privilegio', 'sin privilegio', 'sin privilegio'),
  ('anon', 'expenses',         'sólo lo publicado', 'sin privilegio', 'sin privilegio', 'sin privilegio'),
  ('anon', 'expense_receipts', 'sin privilegio',    'sin privilegio', 'sin privilegio', 'sin privilegio'),
  ('anon', 'milestones',       'sólo lo publicado', 'sin privilegio', 'sin privilegio', 'sin privilegio'),
  -- Las dos fotos son públicas: el bucket es público y la fila no finge lo contrario.
  ('anon', 'media',            'todo',              'sin privilegio', 'sin privilegio', 'sin privilegio'),
  ('anon', 'updates',          'sólo lo publicado', 'sin privilegio', 'sin privilegio', 'sin privilegio'),
  ('anon', 'update_media',     'sólo lo publicado', 'sin privilegio', 'sin privilegio', 'sin privilegio'),
  ('anon', 'people',           'sólo lo publicado', 'sin privilegio', 'sin privilegio', 'sin privilegio'),
  ('anon', 'payment_methods',  'sólo lo publicado', 'sin privilegio', 'sin privilegio', 'sin privilegio'),
  ('anon', 'user_roles',       'sin privilegio',    'sin privilegio', 'sin privilegio', 'sin privilegio'),
  ('anon', 'audit_log',        'sin privilegio',    'sin privilegio', 'sin privilegio', 'sin privilegio');

-- `auditor` es el rol que permite que alguien externo a la familia verifique sin
-- poder alterar nada: lee todo, incluidos aportes y comprobantes, y **no escribe
-- una sola fila en ninguna tabla** (amenaza E2). Que sea rango 1 hace que quede
-- fuera de toda policy de escritura por construcción y no por enumeración.
--
-- La excepción de `user_roles` es deliberada: quién administra el sitio no es
-- información de auditoría contable, y su lectura pide `admin`.
insert into esperado values
  ('auditor', 'campaigns',        'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('auditor', 'budget_items',     'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('auditor', 'contributions',    'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('auditor', 'expenses',         'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('auditor', 'expense_receipts', 'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('auditor', 'milestones',       'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('auditor', 'media',            'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('auditor', 'updates',          'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('auditor', 'update_media',     'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('auditor', 'people',           'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('auditor', 'payment_methods',  'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('auditor', 'user_roles',       'nada', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  -- `audit_log` no le otorga UPDATE ni DELETE a nadie, así que ahí la negación es
  -- por privilegio y no por policy. Es la garantía de T2 y tiene su propio archivo.
  ('auditor', 'audit_log',        'todo', 'denegado (RLS)', 'sin privilegio', 'sin privilegio');

-- `editor` es el privilegio mínimo hecho rol: publica contenido y **no ve plata**.
--
-- Las dos filas que valen la pena mirar dos veces:
--   · `contributions` y `expense_receipts` dan 'nada' y no 'sin privilegio'. El
--     GRANT existe —lo necesita `admin`, que es el mismo rol de base de datos— y lo
--     que filtra es `private.can_read_ledger()`. Que `editor` sea de rango mayor
--     que `auditor` es justamente el motivo por el que el libro no se decide por
--     rango: con `has_min_role('auditor')` esta celda diría 'todo' (amenaza E1).
--   · `expenses` da 'sólo lo publicado': `editor` ve exactamente lo mismo que el
--     público, ni un gasto en borrador ni uno anulado. En data-model.md §4 esa
--     celda dice "—", que se lee como "nada más allá de lo que ya es público".
insert into esperado values
  ('editor', 'campaigns',        'todo',              'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('editor', 'budget_items',     'todo',              'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('editor', 'contributions',    'nada',              'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('editor', 'expenses',         'sólo lo publicado', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('editor', 'expense_receipts', 'nada',              'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('editor', 'milestones',       'todo',              'permitido',      'permitido',      'denegado (RLS)'),
  ('editor', 'media',            'todo',              'permitido',      'permitido',      'denegado (RLS)'),
  -- Borrar una novedad publicada rompe un enlace ya compartido (FR-027), igual que
  -- borrar una foto: las dos son operaciones de administración. Ver la aserción de
  -- divergencia al final del archivo.
  ('editor', 'updates',          'todo',              'permitido',      'permitido',      'denegado (RLS)'),
  ('editor', 'update_media',     'todo',              'permitido',      'permitido',      'permitido'),
  ('editor', 'people',           'todo',              'denegado (RLS)', 'permitido',      'denegado (RLS)'),
  ('editor', 'payment_methods',  'todo',              'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('editor', 'user_roles',       'nada',              'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('editor', 'audit_log',        'nada',              'denegado (RLS)', 'sin privilegio', 'sin privilegio');

-- `admin` registra aportes y gastos, y no toca dos cosas: las cuentas de aporte
-- (amenaza T1) y los roles de las personas. Tampoco borra una campaña entera.
insert into esperado values
  ('admin', 'campaigns',        'todo', 'permitido',      'permitido',      'denegado (RLS)'),
  ('admin', 'budget_items',     'todo', 'permitido',      'permitido',      'permitido'),
  -- Nada financiero se borra: se anula con motivo (FR-015). No hay policy de
  -- DELETE en `contributions` ni en `expenses`, y esa ausencia es la regla.
  ('admin', 'contributions',    'todo', 'permitido',      'permitido',      'denegado (RLS)'),
  ('admin', 'expenses',         'todo', 'permitido',      'permitido',      'denegado (RLS)'),
  -- Un comprobante no se corrige, se carga otro: no hay policy de UPDATE.
  ('admin', 'expense_receipts', 'todo', 'permitido',      'denegado (RLS)', 'permitido'),
  ('admin', 'milestones',       'todo', 'permitido',      'permitido',      'permitido'),
  ('admin', 'media',            'todo', 'permitido',      'permitido',      'permitido'),
  ('admin', 'updates',          'todo', 'permitido',      'permitido',      'permitido'),
  ('admin', 'update_media',     'todo', 'permitido',      'permitido',      'permitido'),
  ('admin', 'people',           'todo', 'permitido',      'permitido',      'permitido'),
  ('admin', 'payment_methods',  'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('admin', 'user_roles',       'todo', 'denegado (RLS)', 'denegado (RLS)', 'denegado (RLS)'),
  ('admin', 'audit_log',        'todo', 'permitido',      'sin privilegio', 'sin privilegio');

-- `owner` es el único que escribe cuentas de aporte y el único que otorga roles.
-- Aun así hay tres cosas que tampoco puede hacer, y las tres son a propósito:
-- borrar un aporte, borrar un gasto y tocar el registro de auditoría.
insert into esperado values
  ('owner', 'campaigns',        'todo', 'permitido', 'permitido',      'permitido'),
  ('owner', 'budget_items',     'todo', 'permitido', 'permitido',      'permitido'),
  ('owner', 'contributions',    'todo', 'permitido', 'permitido',      'denegado (RLS)'),
  ('owner', 'expenses',         'todo', 'permitido', 'permitido',      'denegado (RLS)'),
  ('owner', 'expense_receipts', 'todo', 'permitido', 'denegado (RLS)', 'permitido'),
  ('owner', 'milestones',       'todo', 'permitido', 'permitido',      'permitido'),
  ('owner', 'media',            'todo', 'permitido', 'permitido',      'permitido'),
  ('owner', 'updates',          'todo', 'permitido', 'permitido',      'permitido'),
  ('owner', 'update_media',     'todo', 'permitido', 'permitido',      'permitido'),
  ('owner', 'people',           'todo', 'permitido', 'permitido',      'permitido'),
  ('owner', 'payment_methods',  'todo', 'permitido', 'permitido',      'permitido'),
  ('owner', 'user_roles',       'todo', 'permitido', 'permitido',      'permitido'),
  ('owner', 'audit_log',        'todo', 'permitido', 'sin privilegio', 'sin privilegio');

-- ── Antes de medir: que lo medido sea lo que se cree ────────────────────────

-- Si una tabla no tuviera exactamente dos filas, el veredicto de lectura sería
-- ilegible: 1 dejaría de significar "sólo lo publicado". Se comprueba primero.
select is_empty(
  $q$
    select t.relname::text || ' tiene ' || x.filas || ' filas'
      from (
        select c.oid, c.relname
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relkind = 'r'
           and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
         offset 0
      ) t
     cross join lateral (
       select (xpath(
                '/row/c/text()',
                query_to_xml(format('select count(*) as c from public.%I', t.relname), false, true, '')
              ))[1]::text::integer as filas
     ) x
     where x.filas <> 2
  $q$,
  'cada tabla de public tiene exactamente dos filas de prueba: una pública y una reservada'
);

-- La matriz se escribe a mano, así que puede quedar vieja. Esta aserción es la que
-- lo impide: una tabla nueva en `public` rompe la prueba hasta que alguien decida
-- explícitamente qué puede hacer cada rol con ella. Es lo contrario de una lista
-- que envejece en silencio.
select results_eq(
  $q$ select distinct tabla from esperado order by 1 $q$,
  $q$
    -- `relname` es de tipo `name`, con intercalación "C". Sin el COLLATE explícito
    -- la comparación contra una columna `text` no tiene una intercalación común y
    -- Postgres se niega a resolverla.
    select c.relname::text collate "default"
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
     order by 1
  $q$,
  'la matriz esperada nombra exactamente las tablas que existen en public: una tabla nueva rompe esta prueba hasta que se le asigne una fila'
);

-- ── Se ejecutan las 260 celdas ──────────────────────────────────────────────

create temporary table observado (
  rol text not null,
  tabla text not null,
  operacion text not null,
  veredicto text not null,
  primary key (rol, tabla, operacion)
) on commit drop;

do $$
declare
  celda record;
  resultado text;
begin
  for celda in
    select r.nombre, r.db_role, r.claims, c.tabla, c.operacion, c.sentencia
      from rol r
     cross join caso c
     order by r.nombre, c.tabla, c.operacion
  loop
    -- El veredicto se resuelve primero y se guarda después, con el rol ya
    -- restituido: `anon` no tiene privilegio para escribir en una tabla temporal
    -- de esta sesión, y el registro de la prueba no puede depender de eso.
    resultado := pg_temp.intentar(celda.db_role, celda.claims, celda.operacion, celda.sentencia);

    insert into observado (rol, tabla, operacion, veredicto)
    values (celda.nombre, celda.tabla, celda.operacion, resultado);
  end loop;
end
$$;

-- ── La comparación, rol por rol y operación por operación ───────────────────
-- Se parte en veinte aserciones en lugar de una sola para que el mensaje de una
-- falla diga de entrada qué rol y qué operación se rompieron; `results_eq` imprime
-- después las filas que sobran y las que faltan, es decir la tabla exacta.

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'anon' and operacion = 'lectura' order by tabla $q$,
  $q$ select tabla, lectura from esperado where rol = 'anon' order by tabla $q$,
  'anon lee sólo lo publicado, y nada de aportes, comprobantes, roles ni auditoría (I1, I2)'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'anon' and operacion = 'inserción' order by tabla $q$,
  $q$ select tabla, insercion from esperado where rol = 'anon' order by tabla $q$,
  'anon no puede insertar en ninguna tabla de public'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'anon' and operacion = 'modificación' order by tabla $q$,
  $q$ select tabla, modificacion from esperado where rol = 'anon' order by tabla $q$,
  'anon no puede modificar ninguna tabla de public'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'anon' and operacion = 'borrado' order by tabla $q$,
  $q$ select tabla, borrado from esperado where rol = 'anon' order by tabla $q$,
  'anon no puede borrar de ninguna tabla de public'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'auditor' and operacion = 'lectura' order by tabla $q$,
  $q$ select tabla, lectura from esperado where rol = 'auditor' order by tabla $q$,
  'auditor lee el libro completo, incluidos aportes y comprobantes: es el rol que permite verificar desde afuera'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'auditor' and operacion = 'inserción' order by tabla $q$,
  $q$ select tabla, insercion from esperado where rol = 'auditor' order by tabla $q$,
  'auditor no puede insertar en ninguna tabla: lectura sin escritura (E2)'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'auditor' and operacion = 'modificación' order by tabla $q$,
  $q$ select tabla, modificacion from esperado where rol = 'auditor' order by tabla $q$,
  'auditor no puede modificar ninguna tabla (E2)'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'auditor' and operacion = 'borrado' order by tabla $q$,
  $q$ select tabla, borrado from esperado where rol = 'auditor' order by tabla $q$,
  'auditor no puede borrar de ninguna tabla (E2)'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'editor' and operacion = 'lectura' order by tabla $q$,
  $q$ select tabla, lectura from esperado where rol = 'editor' order by tabla $q$,
  'editor no ve plata: ni un aporte, ni un comprobante, ni un gasto que no sea público (E1)'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'editor' and operacion = 'inserción' order by tabla $q$,
  $q$ select tabla, insercion from esperado where rol = 'editor' order by tabla $q$,
  'editor inserta contenido —novedades, fotos, hitos— y nada del libro (E1)'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'editor' and operacion = 'modificación' order by tabla $q$,
  $q$ select tabla, modificacion from esperado where rol = 'editor' order by tabla $q$,
  'editor edita contenido y personas, y nada del libro ni las cuentas de aporte (E1, T1)'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'editor' and operacion = 'borrado' order by tabla $q$,
  $q$ select tabla, borrado from esperado where rol = 'editor' order by tabla $q$,
  'editor sólo puede desasociar una foto de una novedad: todo otro borrado es de administración'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'admin' and operacion = 'lectura' order by tabla $q$,
  $q$ select tabla, lectura from esperado where rol = 'admin' order by tabla $q$,
  'admin lee todas las tablas, incluidas las del libro y la de roles'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'admin' and operacion = 'inserción' order by tabla $q$,
  $q$ select tabla, insercion from esperado where rol = 'admin' order by tabla $q$,
  'admin registra aportes y gastos, y no puede crear una cuenta de aporte ni otorgar un rol (T1)'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'admin' and operacion = 'modificación' order by tabla $q$,
  $q$ select tabla, modificacion from esperado where rol = 'admin' order by tabla $q$,
  'admin modifica el libro y el contenido, y no puede tocar una cuenta de aporte ni un rol (T1)'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'admin' and operacion = 'borrado' order by tabla $q$,
  $q$ select tabla, borrado from esperado where rol = 'admin' order by tabla $q$,
  'admin no borra campañas, ni aportes, ni gastos, ni cuentas de aporte, ni roles'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'owner' and operacion = 'lectura' order by tabla $q$,
  $q$ select tabla, lectura from esperado where rol = 'owner' order by tabla $q$,
  'owner lee todas las tablas'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'owner' and operacion = 'inserción' order by tabla $q$,
  $q$ select tabla, insercion from esperado where rol = 'owner' order by tabla $q$,
  'owner es el único que puede crear una cuenta de aporte y otorgar un rol (T1)'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'owner' and operacion = 'modificación' order by tabla $q$,
  $q$ select tabla, modificacion from esperado where rol = 'owner' order by tabla $q$,
  'owner modifica todo salvo el registro de auditoría y la fila de un comprobante'
);

select results_eq(
  $q$ select tabla, veredicto from observado where rol = 'owner' and operacion = 'borrado' order by tabla $q$,
  $q$ select tabla, borrado from esperado where rol = 'owner' order by tabla $q$,
  'owner tampoco borra un aporte, un gasto ni el registro de auditoría: no es una cuestión de rango (T2, FR-015)'
);

-- ── Las garantías del modelo de amenazas, dichas de una sola vez ────────────
-- Las tres aserciones que siguen se deducen de la matriz de arriba. Existen igual
-- porque son las frases que el modelo de amenazas promete, y una prueba cuyo
-- nombre repite la promesa es la que explica qué se rompió cuando falla.

select is_empty(
  $q$
    select rol || ' ' || operacion || ' ' || tabla
      from observado
     where rol = 'auditor'
       and operacion <> 'lectura'
       and veredicto = 'permitido'
     order by 1
  $q$,
  'auditor no logra una sola escritura en ninguna tabla de public (E2)'
);

select is_empty(
  $q$
    select tabla || ': ' || veredicto
      from observado
     where rol = 'editor'
       and operacion = 'lectura'
       and tabla in ('contributions', 'expense_receipts', 'audit_log')
       and veredicto <> 'nada'
     order by 1
  $q$,
  'editor no lee ni un aporte, ni un comprobante, ni una línea del registro de auditoría (E1)'
);

select is_empty(
  $q$
    select rol || ' borra ' || tabla
      from observado
     where operacion = 'borrado'
       and tabla in ('contributions', 'expenses')
       and veredicto = 'permitido'
     order by 1
  $q$,
  'ningún rol puede borrar un aporte ni un gasto: lo financiero se anula con motivo, no se borra (FR-015)'
);

-- ── Dos lugares donde el esquema es más estricto que data-model.md §4 ───────
-- Los dos se asertan por separado, con el nombre diciendo que son una divergencia,
-- para que no se los pueda cambiar en ninguna de las dos direcciones sin que una
-- prueba lo diga. La matriz del documento es la intención; esto es lo que corre.

select is(
  (select veredicto from observado where rol = 'editor' and tabla = 'updates' and operacion = 'borrado'),
  'denegado (RLS)',
  'divergencia deliberada: editor no puede borrar una novedad, aunque data-model.md §4 le dé CRUD; borrarla rompe un enlace ya compartido (FR-027)'
);

select is_empty(
  $q$
    select rol
      from observado
     where tabla = 'expense_receipts'
       and operacion = 'modificación'
       and veredicto = 'permitido'
     order by 1
  $q$,
  'divergencia deliberada: nadie modifica la fila de un comprobante, aunque data-model.md §4 dé CRUD a admin y owner; un comprobante no se corrige, se carga otro'
);

-- ── La vista pública agregada ───────────────────────────────────────────────
-- Es la única lectura de aportes que existe para todo el mundo, y la razón por la
-- que `contributions` puede estar cerrada sin que la página de transparencia
-- quede vacía (amenaza I2). Se comprueba con los cinco roles de una sola vez.

create temporary table totales_por_rol (rol text primary key, filas integer not null) on commit drop;

do $$
declare
  r record;
  cuantas integer;
begin
  for r in select nombre, db_role, claims from rol order by nombre
  loop
    execute format('set local role %I', r.db_role);
    perform set_config('request.jwt.claims', coalesce(r.claims::text, ''), true);
    -- La campaña en borrador no aparece para nadie en la vista: filtra por
    -- `published_at` antes de agregar.
    execute 'select count(*) from public.campaign_totals' into cuantas;
    reset role;
    perform set_config('request.jwt.claims', '', true);

    insert into totales_por_rol (rol, filas) values (r.nombre, cuantas);
  end loop;
end
$$;

select is_empty(
  $q$ select rol || ': ' || filas from totales_por_rol where filas <> 1 order by 1 $q$,
  'los cinco roles leen la vista campaign_totals y ven la misma única fila de la campaña publicada (I2)'
);

-- ── T082 · Las cuentas de aporte, dicho con el dato que importa ─────────────
-- La matriz de arriba ya dice que `admin` y `editor` reciben negación en las tres
-- escrituras de `payment_methods`. Esto lo dice de la otra manera, que es la que
-- se entiende sin leer la matriz: se intenta **cambiar un CBU de verdad** y se
-- comprueba después que el CBU publicado sigue siendo el mismo.
--
-- Es la peor cosa que puede pasar en este sistema (amenaza T1): si alguien altera
-- estos veintidós dígitos, el dinero de la campaña va a otra cuenta. La prueba
-- mira el efecto y no la excepción, porque un UPDATE negado por RLS **no falla**:
-- afecta cero filas y devuelve éxito (amenaza E5). Un test que sólo verificara que
-- no hubo error pasaría también si el CBU hubiera cambiado.

set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {"user_role": "admin"}}';

update public.payment_methods
   set fields = '[{"label": "CBU", "value": "9999999999999999999999", "copyable": true}]'::jsonb;
delete from public.payment_methods;

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {"user_role": "editor"}}';

update public.payment_methods
   set fields = '[{"label": "CBU", "value": "9999999999999999999999", "copyable": true}]'::jsonb;
delete from public.payment_methods;

reset role;

select results_eq(
  $q$
    select label, fields -> 0 ->> 'value'
      from public.payment_methods
     order by label
  $q$,
  $q$
    values ('Cuenta en borrador', '021000021'),
           ('Transferencia publicada', '0170099220000067797')
  $q$,
  'después de que admin y editor intentan cambiar el CBU y borrar la cuenta, las dos cuentas siguen intactas (T1)'
);

-- Y el camino legítimo no está bloqueado: una regla que impide corregir un dato
-- mal cargado termina obligando a desactivarla el día que hace falta.
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub": "10000000-0000-4000-8000-000000000001", "role": "authenticated", "app_metadata": {"user_role": "owner"}}';

update public.payment_methods
   set fields = '[{"label": "CBU", "value": "2850590940090418135201", "copyable": true}]'::jsonb
 where id = '60000000-0000-4000-8000-000000000001';

reset role;

select is(
  (select fields -> 0 ->> 'value' from public.payment_methods
    where id = '60000000-0000-4000-8000-000000000001'),
  '2850590940090418135201',
  'owner sí corrige el CBU de la cuenta publicada: la restricción no bloquea el camino legítimo (T1)'
);

select * from finish();
rollback;
