-- Roles, autorización y registro de auditoría.
--
-- El rol de una persona **no** se lee de `user_metadata`: esa columna la puede
-- editar el propio usuario, así que un rol ahí sería una escalada de privilegios
-- de una línea (amenaza S3). Vive en `public.user_roles`, y el hook de auth lo
-- copia a `app_metadata` del token, que sólo el servidor de auth escribe.

-- ── user_roles ──────────────────────────────────────────────────────────────

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id),
  granted_at timestamptz not null default now(),

  unique (user_id, role)
);

-- El índice lo exige la policy que filtra por `user_id`, y el hook que resuelve el
-- rol en cada emisión de token.
create index user_roles_user_id_idx on public.user_roles (user_id);

alter table public.user_roles enable row level security;

-- ── Jerarquía de roles ──────────────────────────────────────────────────────
-- El orden replica exactamente APP_ROLES en src/domain/entities/role.ts. Si los
-- dos se separan, la interfaz y la base van a discrepar sobre quién puede qué.
--
-- Recibe `text` y no el enum a propósito: un claim que trae basura tiene que dar
-- rango 0, no reventar la policy con un error de casteo.

create or replace function private.role_rank(role_name text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case role_name
    when 'auditor' then 1
    when 'editor'  then 2
    when 'admin'   then 3
    when 'owner'   then 4
    else 0
  end
$$;

-- ── has_min_role ────────────────────────────────────────────────────────────
-- La función de rango, que usan casi todas las policies.
--
-- `auditor` es rango 1: pasa cualquier chequeo de lectura por rango
-- (`has_min_role('auditor')` = "cualquier rol interno") y falla el de cualquier
-- escritura, que pide `'editor'` o más. Es lectura sin escritura, que es
-- exactamente el rol que permite que alguien externo a la familia verifique sin
-- poder alterar nada.
--
-- Lo que el rango **no** puede expresar está abajo, en `can_read_ledger`.

create or replace function private.has_min_role(minimum public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and private.role_rank(((select auth.jwt()) -> 'app_metadata' ->> 'user_role'))
        >= private.role_rank(minimum::text)
$$;

-- Postgres otorga EXECUTE a PUBLIC en toda función nueva. Sin esto, la función de
-- autorización sería invocable por cualquiera (amenaza E3).
revoke all on function private.has_min_role(public.app_role) from public;
revoke all on function private.role_rank(text) from public;

-- Y se otorga sólo a `authenticated`, porque una policy se evalúa con los
-- privilegios de quien consulta: sin este grant, toda policy que la nombre
-- fallaría con "permission denied for function".
--
-- `anon` **no** lo recibe, y por eso las policies de lectura pública están
-- separadas por rol en la migración siguiente: la policy de `anon` comprueba
-- `published_at` y nada más. Que un rol anónimo no pueda ni invocar la función de
-- autorización es más fuerte que confiar en que devuelva `false`.
grant execute on function private.has_min_role(public.app_role) to authenticated;

-- `role_rank` no se otorga a nadie: la llama `has_min_role`, que es
-- `security definer` y por lo tanto corre con los privilegios del dueño.

-- ── can_read_ledger ─────────────────────────────────────────────────────────
-- Corrección: el rango no alcanza para el libro.
--
-- La matriz de data-model.md §4 y la amenaza E1 dicen lo mismo: `editor` publica
-- contenido y **no toca plata**. Pero `editor` es rango 2 y `auditor` rango 1, así
-- que las policies del libro escritas como `has_min_role('auditor')` le abrían a
-- `editor` los aportes, los comprobantes, el registro de auditoría y los gastos
-- todavía no publicados. Era una escalada de lectura silenciosa: la policy se leía
-- como correcta y no lo era.
--
-- La lectura del libro no es una escala sino un conjunto: `auditor`, `admin` y
-- `owner`. `auditor` se nombra aparte porque es justamente el caso especial que
-- una jerarquía numérica no puede expresar —lo mismo que ya documenta
-- `src/domain/entities/role.ts`—; de `admin` para arriba se sigue resolviendo por
-- rango, para que un rol futuro más privilegiado lo herede sin tocar esto.

create or replace function private.can_read_ledger()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.has_min_role('admin')
    or (
      (select auth.uid()) is not null
      and ((select auth.jwt()) -> 'app_metadata' ->> 'user_role') = 'auditor'
    )
$$;

revoke all on function private.can_read_ledger() from public;
grant execute on function private.can_read_ledger() to authenticated;

-- ── Hook del token de acceso ────────────────────────────────────────────────
-- Copia el rol más privilegiado de la persona a `app_metadata` del JWT. Una
-- persona puede tener varios roles; gana el de mayor rango.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb;
  resolved_role text;
begin
  select r.role::text
    into resolved_role
    from public.user_roles r
   where r.user_id = (event ->> 'user_id')::uuid
   order by private.role_rank(r.role::text) desc
   limit 1;

  claims := coalesce(event -> 'claims', '{}'::jsonb);

  -- jsonb_set no crea niveles intermedios: sin esto, fijar
  -- {app_metadata,user_role} sobre un token sin app_metadata no haría nada.
  if claims -> 'app_metadata' is null then
    claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb);
  end if;

  if resolved_role is not null then
    claims := jsonb_set(claims, '{app_metadata,user_role}', to_jsonb(resolved_role));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- El hook lo invoca el servidor de auth, nadie más.
revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

-- El servidor de auth necesita leer los roles para resolverlos en cada token.
grant usage on schema public to supabase_auth_admin;
grant select on public.user_roles to supabase_auth_admin;

create policy user_roles_read_by_auth_admin
  on public.user_roles
  for select
  to supabase_auth_admin
  using (true);

-- ── audit_log ───────────────────────────────────────────────────────────────
-- Sólo se agrega. No hay policy de UPDATE ni de DELETE para ningún rol, ni para
-- `owner`: un historial que puede desaparecer no es un historial (amenaza T2).

create table public.audit_log (
  id bigint generated always as identity primary key,
  -- Nulo sólo para acciones del sistema.
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  -- Antes y después, **sin datos sensibles**. Lo redacta la capa de aplicación.
  diff jsonb,
  occurred_at timestamptz not null default now(),

  constraint audit_log_action_format check (action ~ '^[a-z_]+\.[a-z_]+$')
);

create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index audit_log_entity_idx on public.audit_log (entity_table, entity_id);
create index audit_log_actor_idx on public.audit_log (actor_id);

alter table public.audit_log enable row level security;

comment on table public.audit_log is
  'Append-only. Sin policies de UPDATE ni DELETE, deliberadamente, ni para owner.';
