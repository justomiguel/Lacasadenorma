-- Integridad de lo que se publica como cifra.
--
-- Estas reglas no son de permisos sino de forma del dato, y viven en la base
-- porque el formulario puede cambiar y la base no. Un `check` que se prueba es la
-- diferencia entre "el formulario valida eso" y "eso no puede existir".
--
-- Las dos reglas de fondo, que vienen de data-model.md y de AGENTS.md:
--
--   · Nada financiero se borra. Se anula con `voided_at` **y** motivo (FR-015).
--   · Un historial que puede desaparecer no es un historial: `audit_log` sólo se
--     agrega, y eso se garantiza con la ausencia de policies de UPDATE y DELETE
--     más la ausencia del GRANT (amenaza T2).

begin;
select plan(25);

-- ── Fixture ─────────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000003', 'administracion@ejemplo.test'),
  ('10000000-0000-4000-8000-000000000004', 'propiedad@ejemplo.test');

insert into public.campaigns (id, slug, title, summary, published_at)
values ('c0000000-0000-4000-8000-000000000001', 'casa-de-norma', 'La casa de Norma',
        'Reconstrucción de la casa', now());

insert into public.expenses (id, campaign_id, amount_minor, currency, spent_at, concept, category, published_at)
values ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
        30000, 'ARS', date '2026-08-05', 'Chapas', 'materiales', now());

insert into public.contributions (id, campaign_id, amount_minor, currency, received_at)
values ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
        100000, 'ARS', date '2026-08-01');

insert into public.audit_log (action, entity_table, entity_id)
values ('expense.created', 'expenses', 'e0000000-0000-4000-8000-000000000001');

-- ── audit_log es append-only (amenaza T2) ───────────────────────────────────
-- No hay policy de UPDATE ni de DELETE, y tampoco está el GRANT: `authenticated`
-- sólo recibió SELECT e INSERT. Por eso el resultado es un error de privilegio y
-- no cero filas afectadas. Se prueba con el rol más alto que existe, porque la
-- afirmación que interesa es "ni siquiera owner".

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated","app_metadata":{"user_role":"owner"}}';

select throws_ok(
  $q$ delete from public.audit_log $q$,
  '42501',
  'permission denied for table audit_log',
  'ni owner puede borrar del registro de auditoría (T2)'
);

select throws_ok(
  $q$ update public.audit_log set action = 'expense.updated' $q$,
  '42501',
  'permission denied for table audit_log',
  'ni owner puede reescribir una entrada del registro de auditoría (T2)'
);

-- TRUNCATE merece su propia aserción porque es el único camino que **ignora RLS
-- por completo**: no evalúa policies, borra la tabla entera y ni siquiera dispara
-- los triggers de fila. Contra TRUNCATE una policy no protege nada; lo único que
-- lo detiene es que el privilegio no exista. Es la forma más rápida de hacer
-- desaparecer un historial y la que más silenciosamente podría colarse en un
-- `grant all` escrito con apuro.
select throws_ok(
  $q$ truncate public.audit_log $q$,
  '42501',
  'permission denied for table audit_log',
  'ni owner puede truncar el registro de auditoría, que es el camino que saltea RLS (T2)'
);

-- ── Nada financiero se borra (FR-015) ───────────────────────────────────────
-- Acá sí hay GRANT de DELETE sobre las dos tablas, y lo que falta es la policy.
-- Sin policy de DELETE la fila no es visible para esa operación: cero filas
-- afectadas, sin error. Contar las filas es la única forma de distinguir "no se
-- borró" de "no hubo error" (amenaza E5).

select results_eq(
  $q$
    with borrados as (
      delete from public.contributions
       where id = 'f0000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::int from borrados
  $q$,
  $q$ values (0) $q$,
  'un aporte no se borra: se anula (FR-015)'
);

select results_eq(
  $q$
    with borrados as (
      delete from public.expenses
       where id = 'e0000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::int from borrados
  $q$,
  $q$ values (0) $q$,
  'un gasto no se borra: se anula (FR-015)'
);

-- ── Anular es dejar dicho por qué ───────────────────────────────────────────
-- El check es una equivalencia: `voided_at` nulo si y sólo si `void_reason` nulo.
-- Una anulación sin motivo sería un borrado disfrazado, y un motivo sin fecha, un
-- registro que dice algo que no pasó.

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"user_role":"admin"}}';

select throws_ok(
  $q$
    update public.contributions set voided_at = now()
     where id = 'f0000000-0000-4000-8000-000000000001'
  $q$,
  '23514',
  null,
  'anular un aporte sin motivo viola el check (FR-015)'
);

select throws_ok(
  $q$
    update public.expenses set voided_at = now()
     where id = 'e0000000-0000-4000-8000-000000000001'
  $q$,
  '23514',
  null,
  'anular un gasto sin motivo viola el check (FR-015)'
);

select throws_ok(
  $q$
    update public.contributions set void_reason = 'Me parece'
     where id = 'f0000000-0000-4000-8000-000000000001'
  $q$,
  '23514',
  null,
  'un motivo de anulación sin fecha de anulación tampoco es válido'
);

select results_eq(
  $q$
    with anulados as (
      update public.contributions
         set voided_at = now(), void_reason = 'Transferencia devuelta por el banco'
       where id = 'f0000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::int from anulados
  $q$,
  $q$ values (1) $q$,
  'anular con fecha y motivo sí funciona: la regla no bloquea el camino correcto'
);

select throws_ok(
  $q$
    insert into public.contributions (campaign_id, amount_minor, currency, received_at)
    values ('c0000000-0000-4000-8000-000000000001', 0, 'ARS', current_date)
  $q$,
  '23514',
  null,
  'un aporte de monto cero no es un aporte'
);

-- ── Comprobantes: ningún SVG (amenaza T6) ───────────────────────────────────
-- Un SVG es un documento con scripts: servido desde el mismo origen sería un XSS
-- almacenado. La lista blanca vive en el check, en el bucket y en el servidor; acá
-- se prueba la del check, que es la que ningún formulario nuevo puede olvidar.

select throws_ok(
  $q$
    insert into public.expense_receipts (expense_id, storage_path, file_name, mime_type, size_bytes)
    values ('e0000000-0000-4000-8000-000000000001', 'comprobantes/factura.svg',
            'factura.svg', 'image/svg+xml', 4000)
  $q$,
  '23514',
  null,
  'un comprobante image/svg+xml se rechaza (T6)'
);

select lives_ok(
  $q$
    insert into public.expense_receipts (expense_id, storage_path, file_name, mime_type, size_bytes)
    values ('e0000000-0000-4000-8000-000000000001', 'comprobantes/factura.pdf',
            'factura.pdf', 'application/pdf', 120000)
  $q$,
  'un comprobante en PDF entra sin problema: la lista blanca no bloquea lo legítimo'
);

-- ── Hitos ───────────────────────────────────────────────────────────────────
-- Un hito completado sin fecha se publicaría como avance sin decir cuándo pasó.

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"user_role":"admin"}}';

select throws_ok(
  $q$
    insert into public.milestones (campaign_id, title, status)
    values ('c0000000-0000-4000-8000-000000000001', 'Techo colocado', 'completado')
  $q$,
  '23514',
  null,
  'un hito completado sin fecha viola el check'
);

select lives_ok(
  $q$
    insert into public.milestones (campaign_id, title, status, happened_on)
    values ('c0000000-0000-4000-8000-000000000001', 'Techo colocado', 'completado', date '2026-08-09')
  $q$,
  'un hito completado con fecha se guarda'
);

-- ── Fotografías: el alt es obligatorio y tiene que decir algo (FR-024) ──────

select throws_ok(
  $q$
    insert into public.media (storage_path, alt_text, width, height)
    values ('fotos/sin-alt.jpg', '   ', 1600, 1200)
  $q$,
  '23514',
  null,
  'una foto con alt en blanco se rechaza (FR-024)'
);

select throws_ok(
  $q$
    insert into public.media (storage_path, alt_text, width, height)
    values ('fotos/IMG_2841.jpg', 'IMG_2841.jpg', 1600, 1200)
  $q$,
  '23514',
  null,
  'un alt que es el nombre del archivo no describe nada y se rechaza (FR-024)'
);

select lives_ok(
  $q$
    insert into public.media (storage_path, alt_text, width, height)
    values ('fotos/techo.jpg', 'Cabriadas de madera apoyadas sobre los muros', 1600, 1200)
  $q$,
  'una foto con alt descriptivo se guarda'
);

-- ── Cuentas de aporte: ningún dato de relleno (amenaza T1, honestidad) ──────
-- Es la última línea de defensa de la regla de contenido: publicar un CBU con la
-- palabra PENDIENTE es peor que no publicar nada, porque parece un dato.

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated","app_metadata":{"user_role":"owner"}}';

select throws_ok(
  $q$
    insert into public.payment_methods (campaign_id, country_code, currency, label, fields, published_at)
    values ('c0000000-0000-4000-8000-000000000001', 'AR', 'ARS', 'Transferencia en Argentina',
            '[{"label": "CBU", "value": "PENDIENTE"}]'::jsonb, now())
  $q$,
  '23514',
  null,
  'una cuenta de aporte con un marcador de relleno se rechaza'
);

select throws_ok(
  $q$
    insert into public.payment_methods (campaign_id, country_code, currency, label, fields, published_at)
    values ('c0000000-0000-4000-8000-000000000001', 'AR', 'ARS', 'Transferencia en Argentina',
            '[]'::jsonb, now())
  $q$,
  '23514',
  null,
  'una cuenta publicada sin ningún campo no sirve para transferir y se rechaza (FR-007)'
);

select lives_ok(
  $q$
    insert into public.payment_methods (campaign_id, country_code, currency, label, fields, published_at)
    values ('c0000000-0000-4000-8000-000000000001', 'AR', 'ARS', 'Transferencia en Argentina',
            '[{"label": "CBU", "value": "0170099220000067797", "copyable": true}]'::jsonb, now())
  $q$,
  'una cuenta de aporte con un CBU real se publica'
);

-- ════════════════════════════════════════════════════════════════════════════
-- Lo que el cliente no puede elegir
-- ════════════════════════════════════════════════════════════════════════════
-- Las dos secciones que siguen prueban campos que existen para ser evidencia. Un
-- campo de evidencia que quien actúa puede elegir no prueba nada, y las dos veces
-- la garantía está en la base: un trigger que sobreescribe lo que vino.

-- ── El registro de auditoría ata al actor y la fecha con la sesión (R1) ─────
--
-- `audit_log_insert` sólo exige `private.has_min_role('admin')`: la policy no mira
-- `actor_id` ni `occurred_at`, y no podría hacerlo sin rechazar la entrada en lugar
-- de corregirla. El trigger `audit_log_stamp_entry` los fija con el token y el reloj
-- del servidor, así que da igual lo que mande quien inserta.
--
-- Importa porque la amenaza R1 —"no se puede saber quién cambió una cifra"— se
-- mitiga con este registro, y el modelo de amenazas lista una credencial de `admin`
-- robada como actor posible. Sin el trigger, esa credencial alcanzaba para dejar el
-- rastro apuntando a otra persona y fechado en cualquier momento. Y como la tabla es
-- append-only —probado más arriba—, esa entrada falsa quedaba para siempre.

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"user_role":"admin"}}';

insert into public.audit_log (actor_id, action, entity_table, occurred_at)
values ('10000000-0000-4000-8000-000000000004', 'payment_method.updated', 'payment_methods',
        timestamptz '2020-01-01');

reset role;

select results_eq(
  $q$
    select actor_id::text
      from public.audit_log
     where action = 'payment_method.updated'
  $q$,
  $q$ values ('10000000-0000-4000-8000-000000000003') $q$,
  'admin declara a owner como actor y la entrada queda atribuida a admin, que es quien la insertó (R1)'
);

select ok(
  (
    select occurred_at > now() - interval '1 minute'
      from public.audit_log
     where action = 'payment_method.updated'
  ),
  'la fecha declarada en 2020 se reemplaza por la del servidor (R1)'
);

-- Sin sesión no hay actor, y la columna queda nula en lugar de mentir. Es el caso
-- de una migración o un job, y está documentado en data-model.md.
reset role;
set local "request.jwt.claims" = '';

insert into public.audit_log (action, entity_table)
values ('campaign.migrated', 'campaigns');

select is(
  (select actor_id from public.audit_log where action = 'campaign.migrated'),
  null,
  'una acción del sistema, sin sesión, deja el actor nulo en lugar de atribuirlo a alguien'
);

-- ── El contador de comprobantes no se puede escribir a mano (FR-013) ────────
--
-- La migración 20260909120700 intentaba protegerlo con
--
--     revoke update (receipt_count) on public.expenses from authenticated;
--
-- que no hace nada: el privilegio venía de un grant de tabla, y Postgres no puede
-- quitarle una columna a un grant de tabla —avisa "no privileges could be revoked
-- for column" y sigue de largo—. La migración 20260909120900 lo resuelve
-- recalculando la columna en cada escritura de la fila.
--
-- Importa porque FR-013 publica **que un comprobante existe** sin publicar el
-- archivo, y este contador es lo único que el público ve de eso. Un contador
-- escribible a mano es un número sin respaldo, que es justo lo que la página de
-- transparencia promete que no hay.

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"user_role":"admin"}}';

update public.expenses
   set receipt_count = 99
 where id = 'e0000000-0000-4000-8000-000000000001';

reset role;

select results_eq(
  $q$
    select e.receipt_count,
           (select count(*)::integer from public.expense_receipts r where r.expense_id = e.id)
      from public.expenses e
     where e.id = 'e0000000-0000-4000-8000-000000000001'
  $q$,
  $q$ values (1, 1) $q$,
  'admin escribe 99 en el contador y la base lo deja en la cuenta real de comprobantes (FR-013)'
);

-- Un gasto nuevo tampoco puede traer su propio contador.
reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"user_role":"admin"}}';

insert into public.expenses (id, campaign_id, amount_minor, currency, spent_at, concept, category, receipt_count)
values ('e0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000001',
        50000, 'ARS', date '2026-08-20', 'Aberturas', 'materiales', 7);

reset role;

select is(
  (select receipt_count from public.expenses where id = 'e0000000-0000-4000-8000-000000000009'),
  0,
  'un gasto nuevo con contador declarado se guarda en cero, que es la cuenta real (FR-013)'
);

select * from finish();
rollback;
