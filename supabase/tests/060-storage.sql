-- Los buckets y sus policies.
--
-- La asimetría es la misma que gobierna el resto del modelo: `fotos` es público
-- porque esconder la fila no escondería el archivo del CDN, y `comprobantes` y
-- `avatares` son privados porque son datos de un tercero o de una persona
-- (FR-013, FR-246, amenaza I1).
--
-- Un detalle del entorno local que conviene tener presente: el shim habilita RLS
-- sobre `storage.buckets` y no crea policies, así que la configuración de los
-- buckets se verifica como superusuario. No es una omisión de la prueba: qué
-- tamaño y qué tipos acepta un bucket es configuración, no una decisión de
-- permisos, y en el proyecto real esa tabla la administra la plataforma.
--
-- `storage.objects` es **una sola tabla** para los dos buckets, así que todas las
-- policies conviven ahí y lo único que las separa es el `bucket_id`. Por eso cada
-- aserción nombra el bucket: es el discriminante real.

begin;
select plan(27);

-- ── Configuración de los buckets ────────────────────────────────────────────

select results_eq(
  $q$
    select id, public, file_size_limit, allowed_mime_types
      from storage.buckets
     where id = 'fotos'
  $q$,
  $q$
    values ('fotos', true, 10485760::bigint,
            array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
  $q$,
  'el bucket fotos es público, con 10 MiB de límite y sólo formatos de imagen'
);

select results_eq(
  $q$
    select id, public, file_size_limit, allowed_mime_types
      from storage.buckets
     where id = 'videos'
  $q$,
  $q$
    values ('videos', true, 52428800::bigint,
            array['video/mp4', 'video/webm'])
  $q$,
  'el bucket videos es público, con 50 MiB de límite y sólo MP4 y WebM (ADR-034)'
);

select results_eq(
  $q$
    select id, public, file_size_limit, allowed_mime_types
      from storage.buckets
     where id = 'comprobantes'
  $q$,
  $q$
    values ('comprobantes', false, 20971520::bigint,
            array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'])
  $q$,
  'el bucket comprobantes no es público, con 20 MiB de límite y PDF permitido'
);

select results_eq(
  $q$
    select id, public, file_size_limit, allowed_mime_types
      from storage.buckets
     where id = 'avatares'
  $q$,
  $q$
    values ('avatares', false, 2097152::bigint,
            array['image/jpeg', 'image/png', 'image/webp'])
  $q$,
  'el bucket avatares no es público, con 2 MiB de límite y sólo retratos (ADR-037)'
);

-- Un SVG es un documento con scripts. Servido desde el mismo origen sería un XSS
-- almacenado, así que no entra en ningún bucket, ni siquiera en el privado.
select is_empty(
  $q$
    select id from storage.buckets
     where allowed_mime_types is null
        or 'image/svg+xml' = any(allowed_mime_types)
  $q$,
  'ningún bucket acepta image/svg+xml, y ninguno deja la lista de tipos abierta (T6)'
);

-- ── Fixture ─────────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'auditoria@ejemplo.test'),
  ('10000000-0000-4000-8000-000000000002', 'edicion@ejemplo.test'),
  ('10000000-0000-4000-8000-000000000003', 'administracion@ejemplo.test'),
  ('10000000-0000-4000-8000-000000000004', 'propiedad@ejemplo.test'),
  ('10000000-0000-4000-8000-000000000005', 'quien.dona@ejemplo.invalid'),
  ('10000000-0000-4000-8000-000000000006', 'quien.tambien.dona@ejemplo.invalid');

insert into storage.objects (id, bucket_id, name) values
  ('b0000000-0000-4000-8000-000000000001', 'fotos', 'obra/techo.jpg'),
  ('b0000000-0000-4000-8000-000000000002', 'comprobantes', '2026/08/chapas.pdf'),
  ('b0000000-0000-4000-8000-000000000003', 'videos', 'obra/colada.mp4'),
  (
    'b0000000-0000-4000-8000-000000000004',
    'avatares',
    '10000000-0000-4000-8000-000000000005/retrato.jpg'
  );

-- ── anon ────────────────────────────────────────────────────────────────────

set local role anon;

select is(
  (select count(*) from storage.objects where bucket_id = 'fotos')::int,
  1,
  'anon lee los objetos del bucket fotos: se sirven desde el CDN de todos modos'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'videos')::int,
  1,
  'anon lee los objetos del bucket videos: se sirven desde el CDN de todos modos'
);

-- Para `comprobantes` no hay ninguna policy que nombre a `anon`, y la ausencia
-- **es** la negación: cero filas, sin error, porque el privilegio de SELECT sobre
-- storage.objects sí existe y lo que no matchea es la policy.
select is(
  (select count(*) from storage.objects where bucket_id = 'comprobantes')::int,
  0,
  'anon no ve ningún comprobante en el storage (I1)'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'avatares')::int,
  0,
  'anon no ve ningún retrato: el bucket es privado (FR-246)'
);

select throws_ok(
  $q$ insert into storage.objects (bucket_id, name) values ('fotos', 'obra/colada.jpg') $q$,
  '42501',
  null,
  'anon no sube archivos, ni siquiera al bucket público'
);

-- ── editor ──────────────────────────────────────────────────────────────────
-- Publicar el avance de la obra es contenido, no plata.

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"user_role":"editor"}}';

select lives_ok(
  $q$ insert into storage.objects (bucket_id, name) values ('fotos', 'obra/contrapiso.jpg') $q$,
  'editor sube una foto al bucket fotos'
);

select lives_ok(
  $q$ insert into storage.objects (bucket_id, name) values ('videos', 'obra/contrapiso.mp4') $q$,
  'editor sube un video al bucket videos'
);

select results_eq(
  $q$
    with cambiados as (
      update storage.objects set name = 'obra/techo-nuevo.jpg'
       where id = 'b0000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::int from cambiados
  $q$,
  $q$ values (1) $q$,
  'editor puede reemplazar una foto ya subida'
);

select throws_ok(
  $q$ insert into storage.objects (bucket_id, name) values ('comprobantes', '2026/08/inventado.pdf') $q$,
  '42501',
  null,
  'editor no sube comprobantes: cargar una factura acompaña al registro de un gasto'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'comprobantes')::int,
  0,
  'editor tampoco puede descargar un comprobante: la factura es del libro (E1, I1)'
);

-- ── auditor ─────────────────────────────────────────────────────────────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"user_role":"auditor"}}';

select is(
  (select count(*) from storage.objects where bucket_id = 'comprobantes')::int,
  1,
  'auditor sí lee los comprobantes: es el rol que verifica los gastos'
);

-- ── admin ───────────────────────────────────────────────────────────────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"user_role":"admin"}}';

select lives_ok(
  $q$ insert into storage.objects (bucket_id, name) values ('comprobantes', '2026/08/cemento.pdf') $q$,
  'admin carga un comprobante'
);

-- No existe policy de UPDATE para `comprobantes`, y es deliberado: un comprobante
-- no se corrige, se carga otro. Reescribir el archivo de una factura ya publicada
-- dejaría el registro mintiendo sin que nada lo indique. Se asserta la ausencia de
-- la policy y también su efecto, porque una cosa sin la otra se puede romper sin
-- que ninguna prueba se entere.
select is_empty(
  $q$
    select policyname::text
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and cmd in ('UPDATE', 'ALL')
       and coalesce(qual, '') || coalesce(with_check, '') like '%comprobantes%'
  $q$,
  'no existe ninguna policy de UPDATE para el bucket comprobantes'
);

select results_eq(
  $q$
    with cambiados as (
      update storage.objects set name = '2026/08/otra-cosa.pdf'
       where id = 'b0000000-0000-4000-8000-000000000002'
      returning 1
    )
    select count(*)::int from cambiados
  $q$,
  $q$ values (0) $q$,
  'admin no puede reescribir un comprobante ya cargado'
);

select results_eq(
  $q$
    with borrados as (
      delete from storage.objects
       where id = 'b0000000-0000-4000-8000-000000000002'
      returning 1
    )
    select count(*)::int from borrados
  $q$,
  $q$ values (0) $q$,
  'admin no borra un comprobante'
);

-- ── owner ───────────────────────────────────────────────────────────────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated","app_metadata":{"user_role":"owner"}}';

select results_eq(
  $q$
    with borrados as (
      delete from storage.objects
       where id = 'b0000000-0000-4000-8000-000000000002'
      returning 1
    )
    select count(*)::int from borrados
  $q$,
  $q$ values (1) $q$,
  'sólo owner borra un comprobante'
);

-- ── donante: el retrato es propio o no existe ───────────────────────────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated","app_metadata":{}}';

select is(
  (select count(*) from storage.objects where bucket_id = 'avatares')::int,
  1,
  'una cuenta del público lee su retrato'
);

select lives_ok(
  $q$ insert into storage.objects (bucket_id, name) values
    ('avatares', '10000000-0000-4000-8000-000000000005/retrato.png') $q$,
  'una cuenta del público sube un retrato a su carpeta'
);

select throws_ok(
  $q$ insert into storage.objects (bucket_id, name) values
    ('avatares', '10000000-0000-4000-8000-000000000006/retrato.jpg') $q$,
  '42501',
  null,
  'una cuenta del público no sube un retrato a la carpeta de otra'
);

select results_eq(
  $q$
    with cambiados as (
      update storage.objects set name = '10000000-0000-4000-8000-000000000005/retrato.webp'
       where id = 'b0000000-0000-4000-8000-000000000004'
      returning 1
    )
    select count(*)::int from cambiados
  $q$,
  $q$ values (1) $q$,
  'una cuenta del público puede reemplazar su retrato'
);

-- ── otra cuenta del público ─────────────────────────────────────────────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated","app_metadata":{}}';

select is(
  (select count(*) from storage.objects where bucket_id = 'avatares')::int,
  0,
  'una cuenta del público no lee el retrato de otra'
);

-- ── editor no ve retratos: coordinar el catálogo no pide una cara ───────────

reset role;
set local role authenticated;
set local "request.jwt.claims" =
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"user_role":"editor"}}';

select is(
  (select count(*) from storage.objects where bucket_id = 'avatares')::int,
  0,
  'editor no lee retratos: no es can_read_donors y no es dueño'
);

select * from finish();
rollback;
