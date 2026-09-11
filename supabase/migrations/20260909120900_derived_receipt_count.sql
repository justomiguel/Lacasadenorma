-- El contador de comprobantes no se puede escribir a mano.
--
-- La migración 20260909120700 termina con:
--
--     revoke update (receipt_count) on public.expenses from authenticated;
--
-- y ese REVOKE no hace nada. El privilegio se había otorgado a nivel de tabla, y
-- Postgres no puede quitarle una columna a un grant de tabla: emite el aviso
-- "no privileges could be revoked for column" y sigue de largo. El resultado es que
-- una sesión de `admin` puede fijar `receipt_count` en el número que quiera.
--
-- Por qué importa: FR-013 publica **que un comprobante existe** sin publicar el
-- archivo, y este contador es lo único que el público ve de eso. Un contador
-- escribible a mano es un número sin respaldo, que es justo lo que la página de
-- transparencia promete que no hay.
--
-- La corrección no es revocar columna por columna —eso obliga a acordarse de
-- otorgar cada columna nueva, y el día que alguien se olvide el síntoma es un
-- formulario que falla, no una alerta— sino recalcular el valor en la base cada vez
-- que la fila se escribe. Así el contador no depende de quién escribe ni de qué
-- manda: es siempre la cuenta de las filas de `expense_receipts`.

create or replace function private.derive_expense_receipt_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- `security definer` por lo mismo que en `sync_expense_receipt_count`: quien
  -- escribe un gasto no tiene por qué poder leer los comprobantes de otro. La
  -- función hace una sola cosa y no acepta ningún parámetro del usuario.
  new.receipt_count := (
    select count(*)
      from public.expense_receipts r
     where r.expense_id = new.id
  );

  return new;
end;
$$;

revoke all on function private.derive_expense_receipt_count() from public;

comment on function private.derive_expense_receipt_count() is
  'receipt_count es derivado: su valor lo calcula la base en cada escritura de la fila, nunca el cliente (FR-013).';

-- `of receipt_count` en el UPDATE deja pasar sin costo las escrituras que no tocan
-- la columna, que son casi todas. El INSERT no lleva cláusula porque un gasto nuevo
-- no puede traer un contador propio.
create trigger expenses_derive_receipt_count
  before insert or update of receipt_count on public.expenses
  for each row execute function private.derive_expense_receipt_count();
