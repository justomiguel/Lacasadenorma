import type { EmailKind, EmailResult } from "@/src/domain/ports/email";

import { publishErrorDiagnostic } from "../logging/diagnostic";
import { QueryError } from "../supabase/admin/query";
import { createAuthAdminClient } from "../supabase/auth-admin";
import { createServerSupabaseClient } from "../supabase/server-client";

/**
 * Anota el intento en `email_deliveries`. La dirección **no viaja**: la resuelve
 * `record_email_delivery()` desde `auth.users` (ADR-028).
 *
 * Con sesión usa el cliente de quien donó. Sin sesión —oferta por teléfono—
 * usa la clave secreta: `anon` no tiene EXECUTE y PostgREST responde 401.
 */
export async function recordEmailDelivery(input: {
  readonly kind: EmailKind;
  readonly subjectId: string;
  readonly result: EmailResult;
  readonly userId?: string;
}): Promise<void> {
  const sessionClient = await createServerSupabaseClient();
  const secretClient = createAuthAdminClient();

  if (sessionClient === null && secretClient === null) {
    return;
  }

  const userId = await resolveUserId(input.userId, sessionClient);
  const client = secretClient ?? sessionClient;

  if (client === null) {
    return;
  }

  if (secretClient === null && userId === null && !input.kind.startsWith("staff.")) {
    await throwDeliveryError({
      message: "Registrar un envío de persona necesita una sesión o de quién es.",
      code: "42501",
      status: 401,
    });
  }

  if (secretClient === null && userId === null) {
    await throwDeliveryError({
      message:
        "sin sesión: anon no puede ejecutar record_email_delivery (401). Hace falta SUPABASE_SECRET_KEY para anotar un correo de equipo.",
      code: "42501",
      status: 401,
    });
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
    p_user_id: (userId ?? null) as string,
  });

  if (error !== null) {
    await throwDeliveryError(error);
  }
}

async function resolveUserId(
  explicit: string | undefined,
  sessionClient: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<string | null> {
  if (explicit !== undefined) {
    return explicit;
  }

  if (sessionClient === null) {
    return null;
  }

  const { data } = await sessionClient.auth.getUser();

  return data.user?.id ?? null;
}

async function throwDeliveryError(cause: {
  message: string;
  code?: string | undefined;
  details?: string | undefined;
  hint?: string | undefined;
  status?: number | undefined;
}): Promise<never> {
  const error = new QueryError("registrar el envío", cause);

  await publishErrorDiagnostic(error);
  throw error;
}
