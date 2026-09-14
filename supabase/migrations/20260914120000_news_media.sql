-- Fotos y videos de las novedades: el diario interpola ambos en el cuerpo
-- (ADR-034). `fotos` no cambia: una foto de teléfono entra, un video no. El
-- video va a su propio bucket, con su propio techo de tamaño y su propia lista
-- de MIME, que es la barrera que un formulario nuevo no puede olvidar.

create type public.media_kind as enum ('photo', 'video');

alter table public.media
  add column kind public.media_kind not null default 'photo',
  add column bucket_id text not null default 'fotos';

alter table public.media
  add constraint media_kind_matches_bucket check (
    (kind = 'photo' and bucket_id = 'fotos')
    or (kind = 'video' and bucket_id = 'videos')
  );

comment on column public.media.kind is
  'photo o video. Decide el bucket y cómo se renderiza. Default photo: las filas anteriores a ADR-034.';

comment on column public.media.bucket_id is
  'fotos o videos. El check media_kind_matches_bucket impide que un video se sirva desde el bucket de fotos.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos',
  'videos',
  true,
  52428800, -- 50 MiB: un video corto de teléfono entra; uno de 4K de varios minutos, no.
  array['video/mp4', 'video/webm']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Misma asimetría que `fotos`: el archivo se sirve por CDN, esconder la fila no
-- escondería nada. Escritura de editor; borrar es de administración.

create policy videos_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'videos');

create policy videos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'videos' and private.has_min_role('editor'));

create policy videos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'videos' and private.has_min_role('editor'))
  with check (bucket_id = 'videos' and private.has_min_role('editor'));

create policy videos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'videos' and private.has_min_role('admin'));
