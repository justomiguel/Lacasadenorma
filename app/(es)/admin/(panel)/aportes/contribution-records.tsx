import {
  ActionForm,
  CheckboxField,
  HiddenValue,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/form";
import { NoRecords, Record, RecordList, RowAction } from "@/components/admin/records";
import type { ContributionAdminRecord } from "@/src/domain/entities";
import { formatMoney } from "@/src/domain/money";

import { updateContributionAppearanceAction, voidContributionAction } from "./actions";

export function ContributionRecords({
  contributions,
  canWrite,
}: {
  contributions: readonly ContributionAdminRecord[];
  canWrite: boolean;
}) {
  if (contributions.length === 0) {
    return (
      <NoRecords>
        Todavía no hay aportes registrados. El total público va a mostrar el aviso
        correspondiente en lugar de un cero.
      </NoRecords>
    );
  }

  return (
    <RecordList>
      {contributions.map((contribution) => {
        const anulado = contribution.voidedAt !== null;
        const enElMuro =
          !contribution.isAnonymous && contribution.contributorDisplayName !== null;

        return (
          <Record
            key={contribution.id}
            title={contribution.sourceNote ?? "Sin nota de conciliación"}
            amount={formatMoney(contribution.amount)}
            muted={anulado}
            meta={contribution.receivedAt}
            status={
              anulado
                ? `Anulado: ${contribution.voidReason ?? "sin motivo registrado"}`
                : enElMuro
                  ? `En el muro como ${contribution.contributorDisplayName}`
                  : "No aparece en el muro"
            }
          >
            {anulado || !canWrite ? null : (
              <>
                <RowAction label="Nombre en el muro">
                  <ActionForm action={updateContributionAppearanceAction}>
                    <HiddenValue name="id" value={contribution.id} />
                    <TextField
                      name="contributorDisplayName"
                      label="Nombre para mostrar"
                      maxLength={80}
                      defaultValue={contribution.contributorDisplayName ?? ""}
                    />
                    <CheckboxField
                      name="appearOnWall"
                      label="Aparecer en Quiénes ayudaron"
                      defaultChecked={enElMuro}
                      hint="El monto no se publica. El porcentaje, sólo si está prendido el interruptor de esta campaña."
                    />
                    <SubmitButton tone="quiet" pendingLabel="Guardando…">
                      Guardar nombre
                    </SubmitButton>
                  </ActionForm>
                </RowAction>
                <RowAction label="Anular este aporte" tone="danger">
                  <ActionForm action={voidContributionAction}>
                    <HiddenValue name="id" value={contribution.id} />
                    <TextAreaField
                      name="reason"
                      label="Por qué se anula"
                      required
                      rows={3}
                      hint="Por ejemplo: el banco rechazó la transferencia. Queda registrado junto al aporte."
                    />
                    <SubmitButton tone="danger" pendingLabel="Anulando…">
                      Anular aporte
                    </SubmitButton>
                  </ActionForm>
                </RowAction>
              </>
            )}
          </Record>
        );
      })}
    </RecordList>
  );
}
