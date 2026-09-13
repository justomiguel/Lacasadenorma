-- Cuentas del público: el perfil, y la función de autorización que hace falta para
-- que abrir el registro no abra nada más.
--
-- ── Lo que cambia de significado ────────────────────────────────────────────
--
-- Las doce migraciones anteriores se escribieron cuando tener sesión implicaba ser
-- una de las entre dos y cinco personas que administran la campaña. A partir de
-- acá, `authenticated` significa **cualquiera con un correo**
-- ([ADR-027](../../docs/adr/027-identidad-publica.md)).
--
-- Esta migración **no toca ninguna policy existente**, y eso es un hallazgo y no un
-- descuido: las policies del proyecto nunca se escribieron como `to authenticated`
-- sin predicado. Cada una pide `private.has_min_role(...)` o
-- `private.can_read_ledger()`, así que una cuenta sin rol interno recibe
-- exactamente lo que recibe un visitante sin sesión. Eso se verifica ejecutándolo,
-- con la persona `donante` agregada a `supabase/tests/030-matriz-de-permisos.sql`,
-- y se mantiene con `npm run check:rls`, que rechaza la primera policy que se
-- escriba de la otra manera.
--
-- ── can_read_donors, y por qué no es has_min_role ───────────────────────────
--
-- La misma corrección que `can_read_ledger()` hizo con la plata, aplicada a los
-- datos personales. `editor` administra el catálogo —qué falta, cuánto, con qué
-- foto— y **no** ve un solo nombre de quien se comprometió a traerlo. Pero `editor`
-- es rango 2 y `auditor` rango 1, así que una policy escrita como
-- `has_min_role('auditor')` le abriría los nombres, los correos y las notas
-- privadas. La lectura de donantes no es una escala sino un conjunto: `auditor`,
-- `admin`, `owner`.
--
-- Su espejo en TypeScript es el permiso `donaciones.leer` de
-- `src/domain/permissions.ts`, y hay un test que afirma que `editor` no lo tiene.

create or replace function private.can_read_donors()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- `is not distinct from` y no `=`: un token sin `app_metadata` da null, y una
  -- función de autorización que devuelve null obliga a que cada quien la use se
  -- acuerde de que null no es false. Devuelve false y listo.
  select
    private.has_min_role('admin')
    or (
      (select auth.uid()) is not null
      and ((select auth.jwt()) -> 'app_metadata' ->> 'user_role') is not distinct from 'auditor'
    )
$$;

-- Postgres otorga EXECUTE a PUBLIC en toda función nueva. Sin esto, la función de
-- autorización sería invocable por cualquiera (amenaza E3), que con el registro
-- abierto pasó de improbable a trivial.
revoke all on function private.can_read_donors() from public;
grant execute on function private.can_read_donors() to authenticated;

comment on function private.can_read_donors() is
  'Quién puede leer datos personales de donantes: auditor, admin, owner. editor no. Misma forma y mismo motivo que can_read_ledger() (ADR-027).';

-- ── donor_profiles ──────────────────────────────────────────────────────────
-- Lo poco que la aplicación necesita saber de una cuenta del público, y nada más.
--
-- **El correo no se copia acá.** Vive en `auth.users`, que `authenticated` no puede
-- leer y no debería, y viaja en el claim `email` del token de su dueña. Una copia
-- sería un segundo lugar del que se puede filtrar y un segundo lugar que hay que
-- acordarse de borrar.

create table public.donor_profiles (
  -- La misma clave que la cuenta. No hay un identificador nuevo que se pueda
  -- filtrar, y `on delete cascade` hace que borrar la cuenta borre el perfil sin
  -- que nadie tenga que acordarse (FR-240).
  id uuid primary key references auth.users (id) on delete cascade,

  -- Nulo hasta que la persona decida aparecer. **No se deriva del correo**
  -- (FR-230): "juanperez" no es un nombre que alguien eligió publicar.
  display_name text,

  -- En qué idioma sale cada correo (FR-232). Los dos que el sitio publica.
  locale text not null default 'es',

  -- El default **es** el anonimato (FR-225). Aparecer con nombre es una decisión
  -- explícita, y por eso se afirma el default de la columna en las pruebas: lo que
  -- importa es qué pasa cuando la aplicación no manda el campo.
  --
  -- Es una preferencia, no el dato autoritativo: cada reserva guarda el suyo, y la
  -- restricción de "no anónima ⇒ con nombre" vive ahí, que es donde se publica.
  default_anonymous boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint donor_profiles_locale_known check (locale in ('es', 'en')),

  -- Nulo significa "todavía no decidí aparecer". Una cadena de espacios
  -- significaría lo mismo y se publicaría como un renglón vacío en el muro.
  constraint donor_profiles_display_name_not_blank check (
    display_name is null or length(btrim(display_name)) > 0
  )
);

create trigger donor_profiles_touch_updated_at
  before update on public.donor_profiles
  for each row execute function private.touch_updated_at();

comment on table public.donor_profiles is
  'Perfil de una cuenta del público. El correo no se copia: vive en auth.users y viaja en el claim del token (ADR-027).';

alter table public.donor_profiles enable row level security;

-- ── Policies: las primeras del proyecto que se resuelven por propiedad ──────
--
-- Hasta acá toda policy preguntaba "¿qué rol tenés?". Éstas preguntan "¿es tuya
-- esta fila?", que es el patrón que van a copiar `donation_pledges` y todo lo que
-- venga después.
--
-- Cuatro cosas que son decisiones y no estilo:
--
-- 1. **`(select auth.uid())` y no `auth.uid()` suelto.** El subselect se evalúa una
--    vez por consulta; la llamada suelta, una vez por fila.
-- 2. **Una policy por comando y por rol**, nunca `for all`: mezcla la condición de
--    lectura con la de escritura y esconde una de las dos.
-- 3. **La de UPDATE lleva `using` y `with check`.** Sin `with check`, una cuenta
--    podría mudar su propia fila a un `id` ajeno y quedarse con el perfil de otra
--    persona (amenaza E4 sobre datos personales). Hay una prueba que lo intenta.
-- 4. **Ninguna policy para `anon`, y ningún GRANT.** Un perfil no tiene nada de
--    público: lo que el público ve de una donación son las cinco columnas del muro,
--    que llegan en otra migración. Son dos barreras, como en `contributions`.
--
-- Y una ausencia deliberada: **no hay policy de escritura para ningún rol
-- interno.** El equipo lee un perfil para coordinar una entrega y no lo edita. Un
-- nombre público lo elige su dueña (FR-230), y el rol interno no sustituye a la
-- propiedad.

create policy donor_profiles_select on public.donor_profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.can_read_donors());

create policy donor_profiles_insert on public.donor_profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy donor_profiles_update on public.donor_profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Irse tiene que poder hacerse sin pedirle permiso a nadie (FR-208). El borrado del
-- perfil es sólo la mitad: la cuenta se borra por la API de auth, y `on delete
-- cascade` se lleva esta fila.
create policy donor_profiles_delete on public.donor_profiles
  for delete to authenticated
  using (id = (select auth.uid()));

-- RLS filtra filas y no otorga el privilegio de la operación. Sin este GRANT las
-- policies serían correctas y las consultas fallarían igual.
--
-- El GRANT es del rol `authenticated` y no se puede separar por audiencia: `admin`
-- y una cuenta del público son el mismo rol de base de datos. Lo único que distingue
-- a una de la otra es la policy, y es exactamente por eso que `npm run check:rls`
-- existe.
grant select, insert, update, delete on public.donor_profiles to authenticated;
