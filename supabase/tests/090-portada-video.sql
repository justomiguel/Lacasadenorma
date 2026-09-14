-- El fotograma de portada cuelga del video: una foto no puede tenerlo, un
-- video o lo tiene completo o no lo tiene (ADR-038).

begin;
select plan(4);

select throws_ok(
  $q$
    insert into public.media (
      storage_path, alt_text, width, height, kind, bucket_id,
      poster_path, poster_width, poster_height
    )
    values (
      'fotos/con-poster.jpg',
      'Cabriadas de madera apoyadas sobre los muros',
      1600, 1200, 'photo', 'fotos',
      'fotos/otro.jpg', 1600, 1200
    )
  $q$,
  '23514',
  null,
  'una foto no guarda fotograma de portada'
);

select lives_ok(
  $q$
    insert into public.media (
      storage_path, alt_text, width, height, kind, bucket_id
    )
    values (
      'videos/sin-poster.mp4',
      'La colada del contrapiso, de un extremo al otro',
      1920, 1080, 'video', 'videos'
    )
  $q$,
  'un video sin fotograma extraído se guarda'
);

select lives_ok(
  $q$
    insert into public.media (
      storage_path, alt_text, width, height, kind, bucket_id,
      poster_path, poster_width, poster_height
    )
    values (
      'videos/con-poster.mp4',
      'La colada del contrapiso, de un extremo al otro',
      1920, 1080, 'video', 'videos',
      '2026-09-14/aaaaaaaa-0000-4000-8000-000000000001.jpg',
      1920, 1080
    )
  $q$,
  'un video con fotograma 10 se guarda'
);

select throws_ok(
  $q$
    insert into public.media (
      storage_path, alt_text, width, height, kind, bucket_id,
      poster_path, poster_width, poster_height
    )
    values (
      'videos/poster-a-medias.mp4',
      'La colada del contrapiso, de un extremo al otro',
      1920, 1080, 'video', 'videos',
      '2026-09-14/bbbbbbbb-0000-4000-8000-000000000002.jpg',
      null, null
    )
  $q$,
  '23514',
  null,
  'un video no puede tener ruta de portada sin medidas'
);

select * from finish();
rollback;
