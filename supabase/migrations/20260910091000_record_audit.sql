-- El registro de auditoría se escribe por una función, no por privilegio de tabla.
--
-- El motivo completo está en `docs/adr/019-auditoria-por-funcion.md`. En corto: la
-- policy pedía `admin` para insertar, y dos operaciones que **no** son de `admin`
-- escriben una entrada. Las dos quedaban a medio camino:
--
--   * un `editor` publicaba una novedad, la fila quedaba publicada, la entrada no se
--     escribía y la pantalla decía "No se pudo cambiar el estado de la novedad";
--   * un `auditor` abría un comprobante y fallaba en el control que existe justamente
--     para registrar ese acceso (amenaza I1).
--
-- Bajar la policy a `has_min_role('auditor')` habría arreglado las dos y roto la
-- propiedad más fuerte del esquema: que el auditor no escribe una sola fila en ninguna
-- tabla (amenaza E2). Así que se va para el otro lado: **nadie inserta directamente**.

-- ── La única vía de escritura ───────────────────────────────────────────────
--
-- Los parámetros llevan prefijo `p_` porque adentro de plpgsql un parámetro llamado
-- `action` sería ambiguo con la columna `action` del `insert`, y la ambigüedad la
-- resuelve Postgres en tiempo de ejecución y no siempre a favor de lo que uno quiso.
--
-- `security definer` con `search_path` fijado: corre con los privilegios del dueño del
-- esquema, que es dueño de la tabla y por lo tanto no está sujeto a sus policies. Es la
-- excepción al mínimo privilegio, y está acotada a lo más chico que resuelve el
-- problema: devuelve `void`, no lee ninguna tabla, no recibe el actor, y comprueba el
-- rol antes de escribir.

create or replace function public.record_audit(
  p_action text,
  p_entity_table text,
  p_entity_id uuid,
  p_diff jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Cualquiera de los cuatro roles internos, y ninguno más. `anon` ni siquiera tiene
  -- el EXECUTE, así que para él la llamada falla antes de llegar hasta acá; esto cubre
  -- el caso de una sesión con token válido y todavía sin ningún rol otorgado.
  if not private.has_min_role('auditor') then
    raise exception 'Sólo un rol interno puede agregar al registro de auditoría.'
      using errcode = '42501';
  end if;

  -- `actor_id` y `occurred_at` no se pasan: los estampa el trigger
  -- `audit_log_stamp_entry` desde el token verificado y el reloj del servidor
  -- (migración 20260909120800). Que la función no los reciba es la razón por la que no
  -- los puede falsificar.
  insert into public.audit_log (action, entity_table, entity_id, diff)
  values (p_action, p_entity_table, p_entity_id, p_diff);
end;
$$;

-- Postgres otorga EXECUTE a PUBLIC en toda función nueva (amenaza E3).
revoke all on function public.record_audit(text, text, uuid, jsonb) from public;
grant execute on function public.record_audit(text, text, uuid, jsonb) to authenticated;

comment on function public.record_audit(text, text, uuid, jsonb) is
  'La única vía de escritura de audit_log. El actor sale del token, nunca del argumento (ADR-019).';

-- ── Y se cierra la que había ────────────────────────────────────────────────
-- Después de esto ningún rol de la aplicación puede insertar una fila en `audit_log`
-- directamente, ni `owner`. La lectura no cambia: sigue pidiendo `can_read_ledger()`,
-- así que un `editor` puede agregar al registro y no puede leerlo.

drop policy audit_log_insert on public.audit_log;

revoke insert on public.audit_log from authenticated;
revoke usage on sequence public.audit_log_id_seq from authenticated;
