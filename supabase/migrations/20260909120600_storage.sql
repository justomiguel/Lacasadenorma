-- Buckets de Storage y sus policies.
--
-- Dos buckets, y la diferencia entre ellos es la misma asimetría que gobierna el
-- resto del modelo:
--
-- - `fotos` es **público**. Las fotos de la obra se sirven desde el CDN y se
--   optimizan con `next/image`; esconder la fila de `media` no escondería el
--   archivo, así que no se finge que sea privado.
-- - `comprobantes` es **privado**. Una factura suele traer el nombre y el
--   domicilio de un proveedor, que es un dato de un tercero (FR-013, amenaza I1).
--   El público sabe que el comprobante existe; el archivo se obtiene con una URL
--   firmada y sólo con rol de auditoría o más.
--
-- El límite de tamaño y la lista de tipos viven en el bucket y no sólo en el
-- formulario: es la única barrera que un formulario nuevo no puede olvidar.
--
-- **SVG no está permitido en ningún bucket.** Un SVG es un documento con scripts:
-- servido desde el mismo origen sería un XSS almacenado (amenaza T6).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'fotos',
    'fotos',
    true,
    10485760, -- 10 MiB: una foto de teléfono entra, un video no.
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'comprobantes',
    'comprobantes',
    false,
    20971520, -- 20 MiB: un PDF escaneado de varias páginas entra.
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf']
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── fotos ───────────────────────────────────────────────────────────────────
-- Lectura para todo el mundo, escritura desde `editor`: publicar el avance de la
-- obra es contenido, no plata.

create policy fotos_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'fotos');

create policy fotos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and private.has_min_role('editor'));

create policy fotos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and private.has_min_role('editor'))
  with check (bucket_id = 'fotos' and private.has_min_role('editor'));

-- Borrar una foto publicada es una operación de administración: rompe enlaces ya
-- compartidos.
create policy fotos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and private.has_min_role('admin'));

-- ── comprobantes ────────────────────────────────────────────────────────────
-- Sin policy para `anon`: la ausencia **es** la negación.

-- `can_read_ledger()`: la factura es parte del libro, y `editor` no lo ve. Con un
-- chequeo por rango `editor` habría podido descargar comprobantes, porque su rango
-- es mayor que el de `auditor` (amenazas I1 y E1).
create policy comprobantes_select on storage.objects
  for select to authenticated
  using (bucket_id = 'comprobantes' and private.can_read_ledger());

-- Cargar un comprobante acompaña al registro de un gasto, que es `admin`.
create policy comprobantes_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprobantes' and private.has_min_role('admin'));

-- No hay policy de UPDATE: un comprobante no se corrige, se carga otro. Reescribir
-- el archivo de una factura ya publicada dejaría el registro mintiendo sin que
-- nada lo indique.

create policy comprobantes_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprobantes' and private.has_min_role('owner'));

comment on table storage.objects is
  'Policies de este proyecto en supabase/migrations/20260909120600_storage.sql. El bucket comprobantes no tiene lectura para anon.';
