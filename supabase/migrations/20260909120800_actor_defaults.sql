-- Quién hizo cada cosa, y cuándo, lo decide la base y no quien llama.
--
-- Las columnas de procedencia —`recorded_by`, `uploaded_by`, `author_id`,
-- `audit_log.actor_id`— se crearon sin valor por defecto, así que hasta acá el valor
-- lo tenía que mandar el cliente. Eso las volvía inútiles para lo único que sirven:
-- un registro donde el actor es un campo que elige quien actúa no guarda quién hizo
-- algo, guarda quién dijo que lo hizo.
--
-- Con `default auth.uid()` el valor sale del token verificado cuando la columna se
-- omite. Un DEFAULT no admite subconsulta, así que la llamada va suelta; no es el
-- caso del aviso `auth_rls_initplan`, porque un default se evalúa una vez por fila
-- insertada y no una vez por fila leída.
--
-- En `contributions`, `expenses`, `expense_receipts`, `media` y
-- `updates` eso alcanza: la fila entera ya está bajo una policy que sólo `admin`
-- puede insertar, así que el peor caso es un admin atribuyéndole una carga a otro
-- admin, y la fila se puede corregir después.
--
-- En `audit_log` no alcanza, y por eso abajo hay un trigger. La tabla es
-- append-only: nadie puede corregir una fila, así que una atribución falsa queda
-- para siempre. El modelo de amenazas lista una credencial de `admin` robada como
-- actor posible (R1), y sin el trigger esa credencial alcanza para dejar el rastro
-- apuntando a otra persona y fechado en cualquier momento.

alter table public.contributions
  alter column recorded_by set default auth.uid();

alter table public.expenses
  alter column recorded_by set default auth.uid();

alter table public.expense_receipts
  alter column uploaded_by set default auth.uid();

alter table public.media
  alter column uploaded_by set default auth.uid();

alter table public.updates
  alter column author_id set default auth.uid();

alter table public.audit_log
  alter column actor_id set default auth.uid();

-- El actor y la fecha de una entrada de auditoría los fija la base, siempre.
--
-- Un `default` sólo se aplica cuando la columna se omite; este trigger lo impone
-- aunque venga un valor. La única excepción es una acción del sistema, sin sesión,
-- donde `auth.uid()` es nulo y la columna queda nula: es el caso que documenta
-- `data-model.md` para una migración o un job.
--
-- `security invoker` es correcto acá: la función no necesita más privilegios que
-- quien inserta, sólo necesita correr antes que él.
create or replace function private.stamp_audit_entry()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.actor_id := (select auth.uid());
  new.occurred_at := now();

  return new;
end;
$$;

revoke all on function private.stamp_audit_entry() from public;

create trigger audit_log_stamp_entry
  before insert on public.audit_log
  for each row execute function private.stamp_audit_entry();

comment on function private.stamp_audit_entry() is
  'El actor y la fecha de una entrada de auditoría los determina la base, nunca el cliente (amenazas R1, T2).';
