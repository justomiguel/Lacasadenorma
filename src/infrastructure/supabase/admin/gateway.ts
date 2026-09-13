import type { AdminGateway } from "@/src/domain/ports/admin";

import type { ServerSupabaseClient } from "../server-client";
import { createAuditPort, createRolesPort } from "./audit-port";
import { createCampaignPort } from "./campaign-port";
import { createContributionsPort } from "./contributions-port";
import { createExpensesPort } from "./expenses-port";
import { createMilestonesPort } from "./milestones-port";
import { createPaymentMethodsPort } from "./payment-methods-port";
import { createUpdatesPort } from "./updates-port";

/**
 * Implementación del backoffice sobre Supabase.
 *
 * Corre con el cliente **con sesión**, así que cada consulta se evalúa con las
 * policies del rol de quien está mirando. Eso importa más de lo que parece: las
 * guardas de `guards.ts` deciden qué pantalla se muestra, pero lo que impide una
 * escritura no autorizada es que la policy la rechace. Si las dos discrepan, la que
 * gana es la de la base, y es la que tiene pruebas pgTAP.
 *
 * Ninguna operación de este módulo borra un registro financiero. Se anula, con
 * motivo y fecha. La forma del puerto ya lo impone; acá se cumple.
 */
export function createAdminGateway(client: ServerSupabaseClient): AdminGateway {
  return {
    campaign: createCampaignPort(client),
    contributions: createContributionsPort(client),
    expenses: createExpensesPort(client),
    updates: createUpdatesPort(client),
    milestones: createMilestonesPort(client),
    paymentMethods: createPaymentMethodsPort(client),
    audit: createAuditPort(client),
    roles: createRolesPort(client),
  };
}

/** Raíz de composición del backoffice. Devuelve `null` sin Supabase configurado. */
export async function getAdminGateway(): Promise<AdminGateway | null> {
  const { createServerSupabaseClient } = await import("../server-client");
  const client = await createServerSupabaseClient();

  return client === null ? null : createAdminGateway(client);
}
