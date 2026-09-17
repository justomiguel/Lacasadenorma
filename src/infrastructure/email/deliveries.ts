import type { EmailKind, EmailResult } from "@/src/domain/ports/email";

import { QueryError } from "../supabase/admin/query";
import { createServerSupabaseClient } from "../supabase/server-client";

/**
 * Anota el intento en `email_deliveries`. La dirección **no viaja**: la resuelve
 * `record_email_delivery()` desde `auth.users` (ADR-028).
 *
 * `subjectId` es la reserva o la cuenta, según la clase. `pledge_id` sólo se
 * llena cuando el correo habla de una reserva; los de cuenta van con
 * `about_user_id`, que resuelve la función.
 */
export async function recordEmailDelivery(input: {
  readonly kind: EmailKind;
  readonly subjectId: string;
  readonly result: EmailResult;
  readonly userId?: string;
}): Promise<void> {
  const client = await createServerSupabaseClient();

  if (client === null) {
    return;
  }

  const pledgeId =
    input.kind.startsWith("pledge.") ||
    input.kind.startsWith("staff.pledge") ||
    input.kind === "staff.new_pledge" ||
    input.kind === "staff.phone_offer"
      ? input.subjectId
      : null;

  const { error } = await client.rpc("record_email_delivery", {
    p_kind: input.kind,
    p_status: input.result.status,
    // El generador declara todo argumento como no nulo; el esquema acepta
    // `null` en los tres opcionales y en `pledge_id` cuando el correo es de
    // una cuenta, no de una reserva. Misma forma que `record_audit`.
    p_pledge_id: pledgeId as string,
    p_provider_id: (input.result.status === "sent"
      ? input.result.providerId
      : null) as string,
    p_error: (input.result.status === "failed" ? input.result.error : null) as string,
    p_user_id: (input.userId ?? null) as string,
  });

  if (error !== null) {
    throw new QueryError("registrar el envío", error);
  }
}
