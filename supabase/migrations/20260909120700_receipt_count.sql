-- Contador de comprobantes por gasto.
--
-- FR-013 pide publicar **que un comprobante existe** sin publicar el archivo, y
-- data-model.md lo resuelve con "un contador derivado, no las filas". Este es ese
-- contador.
--
-- Por qué una columna con trigger y no una vista que cuente:
--
-- `anon` no puede leer `expense_receipts` —es la amenaza I1— así que una vista con
-- `security_invoker = true` le devolvería cero comprobantes a todo el mundo, que
-- sería un dato falso. La otra opción era una función `security definer` por
-- gasto, es decir una llamada por fila de la tabla de gastos. Una columna que el
-- trigger mantiene se lee en la misma consulta que el gasto y no puede
-- desincronizarse, porque no hay camino para insertar un comprobante sin pasar por
-- el trigger.
--
-- La columna es un dato derivado, así que nadie la escribe a mano: se le revoca el
-- privilegio de UPDATE sobre esa columna a `authenticated`.

alter table public.expenses
  add column receipt_count integer not null default 0;

alter table public.expenses
  add constraint expenses_receipt_count_not_negative check (receipt_count >= 0);

comment on column public.expenses.receipt_count is
  'Derivado: lo mantiene el trigger de expense_receipts. Permite publicar que el comprobante existe sin exponer el archivo (FR-013).';

create or replace function private.sync_expense_receipt_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- `security definer` porque el trigger tiene que poder actualizar `expenses`
  -- incluso cuando quien inserta el comprobante no tiene UPDATE sobre esa
  -- columna. Es exactamente el caso que justifica el privilegio elevado: la
  -- función hace una sola cosa, sobre una sola columna, con parámetros que no
  -- vienen del usuario.
  update public.expenses e
     set receipt_count = (
       select count(*)
         from public.expense_receipts r
        where r.expense_id = e.id
     )
   where e.id = coalesce(new.expense_id, old.expense_id);

  return null;
end;
$$;

revoke all on function private.sync_expense_receipt_count() from public;

create trigger expense_receipts_sync_count
  after insert or delete or update of expense_id on public.expense_receipts
  for each row execute function private.sync_expense_receipt_count();

-- El contador es derivado: se quita el privilegio de escribirlo directamente. El
-- resto de las columnas de `expenses` sigue siendo actualizable por `admin`, que
-- es lo que dice la matriz de permisos.
revoke update (receipt_count) on public.expenses from authenticated;
