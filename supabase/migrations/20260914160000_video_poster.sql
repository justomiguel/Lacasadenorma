-- Fotograma de portada de un video (ADR-038). Vive en `fotos` porque el
-- bucket `videos` no acepta JPEG. No es una fila extra de `media`: si lo
-- fuera, aparecería al final del artículo como adjunto sin nombrar.

alter table public.media
  add column poster_path text,
  add column poster_width integer,
  add column poster_height integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'media_poster_matches_kind'
      and conrelid = 'public.media'::regclass
  ) then
    alter table public.media
      add constraint media_poster_matches_kind check (
        (
          kind = 'photo'
          and poster_path is null
          and poster_width is null
          and poster_height is null
        )
        or (
          kind = 'video'
          and (
            (
              poster_path is null
              and poster_width is null
              and poster_height is null
            )
            or (
              poster_path is not null
              and length(btrim(poster_path)) > 0
              and poster_width > 0
              and poster_height > 0
            )
          )
        )
      );
  end if;
end $$;

comment on column public.media.poster_path is
  'JPEG del fotograma 10, en el bucket fotos. Sólo un video. Null si no se pudo extraer.';
comment on column public.media.poster_width is
  'Ancho real del JPEG de portada. Va con poster_path o los tres son null.';
comment on column public.media.poster_height is
  'Alto real del JPEG de portada. Va con poster_path o los tres son null.';
