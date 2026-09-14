-- Retrato de la cuenta del público (ADR-037).
--
-- Una foto de una persona no es una foto de la obra. El bucket es privado, la
-- ruta es `{user_id}/retrato.{ext}`, y la policy pregunta si esa carpeta es de
-- quien pide. El muro no nombra esta columna: subirla no es consentimiento para
-- aparecer (FR-246).
--
-- SVG no entra, como en el resto de los buckets (amenaza T6). AVIF tampoco: este
-- proyecto no lee sus medidas, y un retrato sin ancho y alto no se puede reservar
-- en el layout.

-- ── Columna ─────────────────────────────────────────────────────────────────

alter table public.donor_profiles
  add column portrait_path text;

alter table public.donor_profiles
  add constraint donor_profiles_portrait_own check (
    portrait_path is null
    or portrait_path = id::text || '/retrato.jpg'
    or portrait_path = id::text || '/retrato.png'
    or portrait_path = id::text || '/retrato.webp'
  );

comment on column public.donor_profiles.portrait_path is
  'Ruta en el bucket privado avatares. Nulo = no subió foto. No se publica (ADR-037).';

revoke update on public.donor_profiles from authenticated;
grant update (display_name, locale, default_anonymous, portrait_path)
  on public.donor_profiles to authenticated;

-- ── Bucket ──────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatares',
  'avatares',
  false,
  2097152, -- 2 MiB: un retrato de teléfono entra recortado.
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── Policies: una por comando, por propiedad, nunca for all ─────────────────
--
-- No hay policy para `anon`. No hay policy para roles internos: coordinar una
-- entrega no pide ver la cara. `(select auth.uid())` una vez por consulta.

create policy avatares_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatares_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Upsert de Storage pide INSERT + SELECT + UPDATE. Sin esta, reemplazar el
-- retrato fallaría en silencio.
create policy avatares_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatares_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
