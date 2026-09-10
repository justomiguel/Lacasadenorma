-- Shim de plataforma para desarrollo y pruebas sin Docker (ADR-013).
--
-- Recrea la parte de Supabase que las migraciones asumen: los roles, los esquemas
-- `auth` y `storage`, las funciones `auth.uid()` y `auth.jwt()`, y los privilegios
-- por defecto. Con esto, **las migraciones se aplican sin modificar** contra un
-- Postgres de `apt`, y las policies RLS se pueden probar de verdad.
--
-- Lo que NO recrea, y hay que tener presente: GoTrue, PostgREST y Realtime. Una
-- migración puede pasar acá y fallar en el proyecto real. La compuerta verdadera
-- es `supabase db push --dry-run` y `supabase db advisors --linked` antes del
-- primer push (riesgo aceptado, documentado en el modelo de amenazas).

-- ── Roles ───────────────────────────────────────────────────────────────────
-- Los mismos nombres que usa la plataforma, para que un `to anon, authenticated`
-- en una policy signifique acá exactamente lo que va a significar allá.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin noinherit;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator noinherit login;
  end if;
end
$$;

grant anon, authenticated, service_role to authenticator;
grant anon, authenticated, service_role, supabase_auth_admin to current_user;

-- ── Esquemas ────────────────────────────────────────────────────────────────

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

-- `pgcrypto` en `extensions`, donde la instala la plataforma. La necesita
-- `auth.users.encrypted_password`: `crypt()` y `gen_salt('bf')`, el mismo bcrypt con
-- el que GoTrue guarda las contraseñas. Va acá y no en `public` porque `reset` borra
-- `public` entero, y la extensión se caería con él.
create extension if not exists pgcrypto with schema extensions;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;
grant usage on schema storage to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

-- ── Usuarios ────────────────────────────────────────────────────────────────
-- Sólo las columnas que el esquema de la aplicación referencia. `raw_app_meta_data`
-- es donde vive el rol: la escribe el servidor de auth, no el usuario.
--
-- `encrypted_password` existe para `scripts/local-api.mjs`, que verifica la
-- contraseña con `extensions.crypt()` contra este hash y así emite un token de
-- verdad para el flujo 9. Mismo nombre y mismo formato que la columna de la
-- plataforma —bcrypt, prefijo `$2a$`— para que el fixture no tenga que saber contra
-- cuál de las dos está corriendo. Nunca se escribe en claro: quien inserta un
-- usuario pasa por `extensions.crypt(clave, extensions.gen_salt('bf'))`.

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Contexto de la petición ─────────────────────────────────────────────────
-- Misma implementación que la plataforma: leen `request.jwt.claims`, que PostgREST
-- fija por transacción. En las pruebas se fija con `set local`.

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

create or replace function auth.email()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;

grant execute on function auth.jwt(), auth.uid(), auth.role(), auth.email()
  to anon, authenticated, service_role;

-- ── Storage ─────────────────────────────────────────────────────────────────
-- Lo mínimo para que las policies de objetos se puedan crear y probar.

create table if not exists storage.buckets (
  id text primary key,
  name text not null unique,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id),
  name text not null,
  owner uuid,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists objects_bucket_id_name_idx
  on storage.objects (bucket_id, name);

alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;

-- `storage.foldername` la usan las policies para separar por carpeta.
create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(name, '/')
$$;

grant select on storage.buckets to anon, authenticated;
grant all on storage.objects to authenticated;
grant select on storage.objects to anon;
grant execute on function storage.foldername(text) to anon, authenticated;
