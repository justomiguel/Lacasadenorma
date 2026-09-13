-- Irse.
--
-- FR-208 y `docs/privacy.md` § Derechos de las personas dicen lo mismo: una cuenta
-- del público se borra desde `/cuenta`, sin pedirle permiso a nadie y sin dar
-- explicaciones. Para que eso sea cierto hace falta que la aplicación web pueda
-- borrar una fila de `auth.users`, y la aplicación web no tiene con qué: la única
-- credencial que maneja es la publicable, que se resuelve como `authenticated`, y
-- `authenticated` no puede tocar el esquema `auth`.
--
-- ── Por qué no la clave secreta ─────────────────────────────────────────────
--
-- El camino que la documentación de Supabase sugiere es `auth.admin.deleteUser()`
-- con la clave `service_role`. Eso significa tener, en el proceso que sirve el
-- sitio público, una credencial que **saltea RLS por completo** —el `bypassrls`
-- está en el rol, no en la política— para una operación que cada persona hace sobre
-- sí misma. El remedio es peor que la enfermedad: a partir de ese momento, un solo
-- error de programación en cualquier ruta que alcance ese cliente lee y escribe
-- todo el proyecto.
--
-- Esta función es la superficie mínima que resuelve el caso: `security definer`,
-- **sin argumentos**, y el sujeto sale de `auth.uid()`. No hay forma de pedirle que
-- borre a otra persona, ni con el parámetro equivocado, porque no recibe
-- parámetros. Es la misma forma que van a tener las funciones de reserva
-- (ADR-029): la escritura privilegiada entra por una puerta angosta y declarada.
--
-- ── Lo que el entorno local no puede demostrar ──────────────────────────────
--
-- El shim de `supabase/shim/00-platform.sql` tiene `auth.users` y nada más. En el
-- proyecto real, `auth.identities`, `auth.sessions`, `auth.refresh_tokens`,
-- `auth.mfa_factors` y `auth.one_time_tokens` referencian `auth.users` con
-- `on delete cascade`, así que el `delete` se las lleva. Eso vale acá como riesgo
-- aceptado de ADR-013 y la compuerta es `supabase db push --dry-run` más una
-- prueba manual en el proyecto de preview antes del primer despliegue.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  quien uuid := (select auth.uid());
begin
  -- Una Server Action es un endpoint HTTP invocable por su ID sin cookie (amenaza
  -- T7). Sin sesión no hay cuenta propia, y decirlo es mejor que borrar nada y
  -- contestar que salió bien.
  if quien is null then
    raise exception 'No hay sesión: no hay cuenta propia que borrar.';
  end if;

  -- Quien administra la campaña no se da de baja por acá, y no es una jerarquía
  -- aplicada a las personas: `owner` es el rol que otorga roles. Si la última
  -- propietaria pudiera irse desde una pantalla del sitio público, el proyecto
  -- quedaría sin nadie capaz de volver a entrar al backoffice y la recuperación
  -- sería un `insert` a mano en la base de producción. Se quita el rol primero.
  if exists (select 1 from public.user_roles r where r.user_id = quien) then
    raise exception
      'Una cuenta con rol interno no se borra desde /cuenta: primero hay que quitarle el rol.';
  end if;

  -- El perfil se va por la cascada de `donor_profiles.id`, y las reservas quedan
  -- con `user_id` nulo y anonimizadas cuando esa tabla exista (FR-240). No se
  -- escribe nada en `audit_log`: una fila que dijera "esta cuenta se borró" con su
  -- identificador sería justamente el residuo que el borrado tiene que no dejar.
  delete from auth.users u where u.id = quien;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'Borra la cuenta de quien la invoca. Sin argumentos a propósito: el sujeto es auth.uid() y no hay forma de pedir otra (FR-208, ADR-027).';
