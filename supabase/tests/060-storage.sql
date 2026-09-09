-- Los dos buckets y sus policies.
--
-- La asimetría es la misma que gobierna el resto del modelo: `fotos` es público
-- porque esconder la fila no escondería el archivo del CDN, y `comprobantes` es
-- privado porque una factura suele traer el nombre y el domicilio de un proveedor,
-- que es un dato de un tercero (FR-013, amenaza I1).
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
select plan(16);

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
     where id = 'comprobantes'
  $q$,
  $q$
    values ('comprobantes', false, 20971520::bigint,
            array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'])
  $q$,
  'el bucket comprobantes no es público, con 20 MiB de límite y PDF permitido'
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
  ('10000000-0000-4000-8000-000000000004', 'propiedad@ejemplo.test');

insert into storage.objects (id, bucket_id, name) values
  ('b0000000-0000-4000-8000-000000000001', 'fotos', 'obra/techo.jpg'),
  ('b0000000-0000-4000-8000-000000000002', 'comprobantes', '2026/08/chapas.pdf');

-- ── anon ────────────────────────────────────────────────────────────────────

set local role anon;

select is(
  (select count(*) from storage.objects where bucket_id = 'fotos')::int,
  1,
  'anon lee los objetos del bucket fotos: se sirven desde el CDN de todos modos'
);

-- Para `comprobantes` no hay ninguna policy que nombre a `anon`, y la ausencia
-- **es** la negación: cero filas, sin error, porque el privilegio de SELECT sobre
-- storage.objects sí existe y lo que no matchea es la policy.
select is(
  (select count(*) from storage.objects where bucket_id = 'comprobantes')::int,
  0,
  'anon no ve ningún comprobante en el storage (I1)'
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

select * from finish();
rollback;
