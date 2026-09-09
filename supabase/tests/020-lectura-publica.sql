-- Qué ve y qué no ve una visitante sin sesión.
--
-- Es la superficie más expuesta del sistema y la que decide si la página de
-- transparencia se puede publicar: todo lo que `anon` puede leer es, por
-- definición, público.
--
-- Cómo se simula la identidad: PostgREST abre una transacción, cambia de rol y
-- fija `request.jwt.claims`. Acá se hace igual, con `set local` para que el cambio
-- muera con la transacción y no se filtre al archivo siguiente. `reset role`
-- vuelve al superusuario, que es el único que puede crear las filas de prueba
-- —crearlas como `anon` sería imposible, que es justamente lo que se está
-- probando—.
--
-- Sobre `throws_ok` en lugar de contar filas: `anon` no tiene el privilegio de
-- SELECT sobre `contributions`, `expense_receipts`, `user_roles` ni `audit_log`.
-- No es que la policy no matchee y devuelva cero filas: la consulta **falla** con
-- 42501 antes de mirar ninguna fila. Son dos capas distintas —privilegio y RLS— y
-- la prueba tiene que decir cuál es la que actúa, porque el día que alguien
-- agregue un `grant select ... to anon` por error, un `is(count, 0)` seguiría en
-- verde y esto no.

begin;
select plan(23);

-- ── Fixture ─────────────────────────────────────────────────────────────────
-- Cada archivo crea sus propias filas dentro de la transacción y nunca depende de
-- supabase/fixtures/dev.sql, que es contenido de desarrollo y cambia sin aviso.

insert into public.campaigns (id, slug, title, summary, goal_amount_minor, goal_currency, status, published_at)
values
  ('c0000000-0000-4000-8000-000000000001', 'casa-de-norma', 'La casa de Norma',
   'Reconstrucción de la casa', 500000000, 'ARS', 'active', now()),
  ('c0000000-0000-4000-8000-000000000002', 'campana-en-borrador', 'Campaña en borrador',
   'Todavía no se publica', null, 'ARS', 'draft', null);

insert into public.budget_items (campaign_id, title, sort_order, published_at)
values
  ('c0000000-0000-4000-8000-000000000001', 'Techo y cabriadas', 1, now()),
  ('c0000000-0000-4000-8000-000000000001', 'Aberturas sin cotizar', 2, null);

-- Aportes: uno válido en pesos, uno anulado en pesos, uno válido en dólares, y uno
-- de la campaña en borrador que no tiene que aparecer en ningún total público.
insert into public.contributions (campaign_id, amount_minor, currency, received_at, voided_at, void_reason)
values
  ('c0000000-0000-4000-8000-000000000001', 100000, 'ARS', date '2026-08-01', null, null),
  ('c0000000-0000-4000-8000-000000000001',  50000, 'ARS', date '2026-08-02', now(), 'Transferencia devuelta por el banco'),
  ('c0000000-0000-4000-8000-000000000001',  20000, 'USD', date '2026-08-03', null, null),
  ('c0000000-0000-4000-8000-000000000002', 250000, 'ARS', date '2026-08-04', null, null);

insert into public.expenses (id, campaign_id, amount_minor, currency, spent_at, concept, category, published_at, voided_at, void_reason)
values
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   30000, 'ARS', date '2026-08-05', 'Chapas', 'materiales', now(), null, null),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
    7000, 'ARS', date '2026-08-06', 'Cemento facturado dos veces', 'materiales', now(), now(), 'Duplicado del proveedor'),
  ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001',
    9000, 'ARS', date '2026-08-07', 'Arena todavía sin publicar', 'materiales', null, null, null),
  ('e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001',
    5000, 'USD', date '2026-08-08', 'Herramienta importada', 'herramientas', now(), null, null);

-- Un comprobante del gasto publicado y otro del que está en borrador: el segundo
-- no tiene que contarse en la vista.
insert into public.expense_receipts (expense_id, storage_path, file_name, mime_type, size_bytes)
values
  ('e0000000-0000-4000-8000-000000000001', 'comprobantes/chapas.pdf', 'chapas.pdf', 'application/pdf', 120000),
  ('e0000000-0000-4000-8000-000000000003', 'comprobantes/arena.pdf', 'arena.pdf', 'application/pdf', 90000);

insert into public.milestones (campaign_id, title, status, happened_on, sort_order, published_at)
values
  ('c0000000-0000-4000-8000-000000000001', 'Techo colocado', 'completado', date '2026-08-09', 1, now()),
  ('c0000000-0000-4000-8000-000000000001', 'Hito en borrador', 'pendiente', null, 2, null);

insert into public.media (id, storage_path, alt_text, width, height)
values
  ('d0000000-0000-4000-8000-000000000001', 'fotos/techo.jpg', 'Cabriadas de madera apoyadas sobre los muros', 1600, 1200),
  ('d0000000-0000-4000-8000-000000000002', 'fotos/frente.jpg', 'Frente de la casa con el revoque a la vista', 1600, 1200);

insert into public.updates (id, campaign_id, slug, title, body, published_at)
values
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'llego-el-techo', 'Llegó el techo', 'Se colocaron las cabriadas.', now()),
  ('a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
   'novedad-en-borrador', 'Novedad en borrador', 'Todavía no se publica.', null);

insert into public.update_media (update_id, media_id)
values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002');

insert into public.people (slug, full_name, published_at)
values
  ('norma', 'Norma', now()),
  ('persona-en-borrador', 'Persona en borrador', null);

insert into public.payment_methods (campaign_id, country_code, currency, label, fields, sort_order, published_at)
values
  ('c0000000-0000-4000-8000-000000000001', 'AR', 'ARS', 'Transferencia en Argentina',
   '[{"label": "CBU", "value": "0170099220000067797", "copyable": true}]'::jsonb, 1, now()),
  ('c0000000-0000-4000-8000-000000000001', 'US', 'USD', 'Cuenta en dólares sin publicar',
   '[{"label": "Routing", "value": "021000021", "copyable": true}]'::jsonb, 2, null);

insert into public.audit_log (action, entity_table, entity_id)
values ('expense.created', 'expenses', 'e0000000-0000-4000-8000-000000000001');

-- Antes de cambiar de rol: que el fixture cubra **todas** las tablas que tienen
-- `published_at`, no sólo las que alguien se acordó de enumerar más abajo. Si
-- mañana aparece una tabla publicable y nadie le agrega filas acá, esta aserción
-- falla, y con ella se entera de que la comprobación siguiente no la estaba
-- mirando. Es la diferencia entre una prueba que cubre y una que parece cubrir.

select is_empty(
  $q$
    select t.relname::text || ' (publicadas=' || x.publicadas || ', borradores=' || x.borradores || ')'
      from (
        select c.relname
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          join pg_attribute a
            on a.attrelid = c.oid and a.attname = 'published_at' and not a.attisdropped
         where n.nspname = 'public'
           and c.relkind = 'r'
         offset 0
      ) t
     cross join lateral (
       select
         (xpath('/row/c/text()', query_to_xml(
           format('select count(*) as c from public.%I where published_at is not null', t.relname),
           false, true, ''
         )))[1]::text::integer as publicadas,
         (xpath('/row/c/text()', query_to_xml(
           format('select count(*) as c from public.%I where published_at is null', t.relname),
           false, true, ''
         )))[1]::text::integer as borradores
     ) x
     where x.publicadas = 0 or x.borradores = 0
     order by 1
  $q$,
  'el fixture deja una fila publicada y un borrador en cada tabla con published_at: sin las dos, lo que sigue no probaría nada'
);

-- ── A partir de acá, todo se consulta como una visitante sin sesión ─────────

set local role anon;

-- ── Lo que no existe para anon ──────────────────────────────────────────────

select throws_ok(
  'select * from public.contributions',
  '42501',
  'permission denied for table contributions',
  'anon no puede leer un aporte individual (I2)'
);

select throws_ok(
  'select * from public.expense_receipts',
  '42501',
  'permission denied for table expense_receipts',
  'anon no puede leer un comprobante (I1)'
);

select throws_ok(
  'select * from public.audit_log',
  '42501',
  'permission denied for table audit_log',
  'anon no puede leer el registro de auditoría'
);

select throws_ok(
  'select * from public.user_roles',
  '42501',
  'permission denied for table user_roles',
  'anon no puede leer quién administra el sitio'
);

-- ── Borradores (amenaza I7) ─────────────────────────────────────────────────
-- En cada tabla se compara el conjunto visible completo, no sólo la ausencia del
-- borrador: así la aserción también falla si dejara de verse lo publicado, que es
-- el otro modo de romper la página.

select results_eq(
  $q$ select slug from public.campaigns order by slug $q$,
  $q$ values ('casa-de-norma') $q$,
  'anon ve la campaña publicada y no la que está en borrador (I7)'
);

select results_eq(
  $q$ select title from public.budget_items order by title $q$,
  $q$ values ('Techo y cabriadas') $q$,
  'anon ve el rubro publicado y no el que está en borrador (I7)'
);

select results_eq(
  $q$ select concept from public.expenses order by concept $q$,
  $q$ values ('Chapas'), ('Herramienta importada') $q$,
  'anon ve sólo los gastos publicados y no anulados (I7)'
);

select is_empty(
  $q$
    select concept from public.expenses
     where id = 'e0000000-0000-4000-8000-000000000002'
  $q$,
  'anon no ve un gasto anulado, aunque esté publicado'
);

select results_eq(
  $q$ select title from public.milestones order by title $q$,
  $q$ values ('Techo colocado') $q$,
  'anon ve el hito publicado y no el que está en borrador (I7)'
);

select results_eq(
  $q$ select slug from public.updates order by slug $q$,
  $q$ values ('llego-el-techo') $q$,
  'anon ve la novedad publicada y no la que está en borrador (I7)'
);

select results_eq(
  $q$ select slug from public.people order by slug $q$,
  $q$ values ('norma') $q$,
  'anon ve la persona publicada y no la que está en borrador (I7)'
);

select results_eq(
  $q$ select label from public.payment_methods order by label $q$,
  $q$ values ('Transferencia en Argentina') $q$,
  'anon ve sólo la cuenta de aporte publicada: nulo en published_at es no mostrar (FR-007)'
);

-- La visibilidad de `update_media` la hereda de la novedad: el subselect sobre
-- `updates` pasa por la RLS de `updates` para quien consulta, así que la foto de un
-- borrador tampoco aparece por este camino lateral.
select results_eq(
  $q$ select update_id::text from public.update_media order by 1 $q$,
  $q$ values ('a0000000-0000-4000-8000-000000000001') $q$,
  'anon no ve las fotos asociadas a una novedad en borrador (I7)'
);

-- Las trece aserciones de arriba nombran una tabla cada una, y esa es su virtud:
-- dicen qué se ve y qué no en castellano. Su defecto es que una tabla publicable
-- nueva no aparece en ninguna, y su borrador se publicaría sin que nada fallara.
--
-- Esta recorre el catálogo y le pregunta a **cada** tabla con `published_at`,
-- incluidas las que todavía no existen, cuántas filas sin publicar deja ver. La
-- respuesta tiene que ser cero en todas.
--
-- Las tablas sobre las que `anon` no tiene el privilegio de SELECT se saltean: ahí
-- no hay nada que filtrar porque la consulta ni siquiera es posible, y eso ya lo
-- comprueban las cuatro aserciones de `throws_ok` del principio.

select is_empty(
  $q$
    select t.relname::text || ' deja ver ' || x.borradores || ' sin publicar'
      from (
        select c.relname
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          join pg_attribute a
            on a.attrelid = c.oid and a.attname = 'published_at' and not a.attisdropped
         where n.nspname = 'public'
           and c.relkind = 'r'
           and has_table_privilege(c.oid, 'select')
         offset 0
      ) t
     cross join lateral (
       select (xpath('/row/c/text()', query_to_xml(
         format('select count(*) as c from public.%I where published_at is null', t.relname),
         false, true, ''
       )))[1]::text::integer as borradores
     ) x
     where x.borradores > 0
     order by 1
  $q$,
  'ninguna tabla de public con published_at le muestra a anon una sola fila sin publicar, tampoco las que se agreguen mañana (I7)'
);

-- Las fotos viven en un bucket público: esconder la fila no escondería el archivo,
-- así que la lectura es abierta y la prueba lo deja explícito en lugar de que se
-- lea como un olvido.
select is(
  (select count(*) from public.media)::int,
  2,
  'anon lee las fotos: el bucket es público y la fila no finge lo contrario'
);

-- ── Totales agregados (SC-007) ──────────────────────────────────────────────
-- Lo público de los aportes es esto y nada más. Los números son los del fixture y
-- se escriben a mano a propósito: si la vista cambiara de criterio, esta aserción
-- tiene que fallar en lugar de acompañar el cambio.
--
--   ARS  recibido 100000  = 100000 válido, sin los 50000 anulados
--        gastado   30000  = Chapas; sin el anulado y sin el que está en borrador
--        saldo     70000
--        1 gasto publicado, con 1 comprobante
--   USD  recibido  20000
--        gastado    5000
--        saldo     15000
--        1 gasto publicado, sin comprobantes
--
-- Las dos monedas van en filas separadas: convertir necesitaría un tipo de cambio
-- explícito y fechado, que hoy no existe.

select results_eq(
  $q$
    select currency::text, received_minor, spent_minor, balance_minor, expense_count, receipt_count
      from public.campaign_totals
     where campaign_id = 'c0000000-0000-4000-8000-000000000001'
     order by currency
  $q$,
  $q$
    values ('ARS', 100000::bigint, 30000::bigint, 70000::bigint, 1, 1),
           ('USD',  20000::bigint,  5000::bigint, 15000::bigint, 1, 0)
  $q$,
  'anon lee los totales por moneda sin anulados ni borradores, y sin mezclar monedas (SC-007)'
);

select is_empty(
  $q$
    select * from public.campaign_totals
     where campaign_id = 'c0000000-0000-4000-8000-000000000002'
  $q$,
  'los totales de una campaña en borrador no son públicos'
);

-- ── Funciones ───────────────────────────────────────────────────────────────
-- `anon` tiene USAGE sobre el esquema `private` —sin eso ninguna policy podría
-- nombrar una función de ahí y toda lectura fallaría—, pero no EXECUTE sobre la
-- función de autorización. Que el rol anónimo no pueda ni invocarla es más fuerte
-- que confiar en que devuelva `false`.

select throws_ok(
  $q$ select private.has_min_role('auditor') $q$,
  '42501',
  'permission denied for function has_min_role',
  'anon no puede ejecutar private.has_min_role (E3)'
);

select throws_ok(
  $q$ select public.custom_access_token_hook('{}'::jsonb) $q$,
  '42501',
  'permission denied for function custom_access_token_hook',
  'anon no puede ejecutar el hook del token: lo invoca el servidor de auth y nadie más (E3)'
);

-- `private.touch_updated_at` sí conserva el EXECUTE que Postgres le otorga a
-- PUBLIC por defecto: la migración no se lo revoca. No es una superficie de
-- ataque, y esta aserción es la razón por la que se puede afirmar eso en lugar de
-- suponerlo: es una función de trigger, y Postgres se niega a ejecutarla fuera de
-- un trigger antes de correr una sola línea de su cuerpo. Si algún día dejara de
-- ser una función de trigger, esta prueba pasa a fallar y el grant deja de ser
-- inofensivo el mismo día.

select throws_ok(
  $q$ select private.touch_updated_at() $q$,
  '0A000',
  'trigger functions can only be called as triggers',
  'el grant por defecto sobre private.touch_updated_at es inerte: no se puede invocar fuera de un trigger'
);

-- La excepción, que es deliberada y conviene tenerla clavada en una prueba: el
-- agregado sí se le otorga a `anon`, porque la vista pública `campaign_totals` lo
-- llama con los privilegios de quien consulta. Devuelve totales por moneda y
-- ninguna fila de detalle.
select lives_ok(
  $q$ select * from private.campaign_totals_for('c0000000-0000-4000-8000-000000000001') $q$,
  'anon sí puede ejecutar private.campaign_totals_for: es de lo que vive la vista pública'
);

-- ── Escritura ───────────────────────────────────────────────────────────────
-- Sin policy y sin GRANT. Falla por privilegio, que es la barrera exterior.

select throws_ok(
  $q$
    insert into public.updates (campaign_id, slug, title, body)
    values ('c0000000-0000-4000-8000-000000000001', 'novedad-de-un-extrano', 'Hola', 'Texto')
  $q$,
  '42501',
  'permission denied for table updates',
  'anon no puede publicar una novedad'
);

select * from finish();
rollback;
