import {
  HiddenValue,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/admin/form";
import { PencilIcon } from "@/components/design-system/icons";
import { IdentifyingMark } from "@/components/design-system/identifying-mark";
import type { AdminPledgeRecord } from "@/src/domain/entities/donation-pledge";

/**
 * Cantidad y nota de una reserva anotada. Si nació por teléfono, también
 * nombre y teléfono: en una de cuenta el contacto vive en el perfil.
 */
export function PledgeEditFields({
  pledge,
}: {
  pledge: Pick<
    AdminPledgeRecord,
    "id" | "quantity" | "donorNote" | "userId" | "contactName" | "contactPhone"
  >;
}) {
  return (
    <>
      <HiddenValue name="id" value={pledge.id} />
      <TextField
        name="quantity"
        label="cantidad"
        required
        inputMode="numeric"
        defaultValue={String(pledge.quantity)}
      />
      <TextAreaField
        name="nota"
        label="nota"
        defaultValue={pledge.donorNote ?? ""}
        rows={2}
        maxLength={500}
      />
      {pledge.userId === null ? (
        <>
          <TextField
            name="contactName"
            label="nombre"
            required
            defaultValue={pledge.contactName ?? ""}
            maxLength={80}
          />
          <TextField
            name="contactPhone"
            label="teléfono"
            required
            defaultValue={pledge.contactPhone ?? ""}
            maxLength={40}
          />
        </>
      ) : null}
      <SubmitButton pendingLabel="Guardando…">
        <span className="inline-flex items-center gap-xs">
          <IdentifyingMark>
            <PencilIcon />
          </IdentifyingMark>
          Guardar cambios
        </span>
      </SubmitButton>
    </>
  );
}
