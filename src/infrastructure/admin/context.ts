import type { Campaign } from "@/src/domain/entities";
import type { AdminGateway } from "@/src/domain/ports/admin";
import type { AdminDeps, AdminResult } from "@/src/application/admin";

import { readViewer, type Viewer } from "../auth/viewer";
import { logger } from "../logging/logger";
import { getAdminGateway } from "../supabase/admin-repositories";

/**
 * La raíz de composición del backoffice.
 *
 * Existe para que ninguna pantalla ni ninguna acción tenga que armar sus propias
 * dependencias. Dos cosas que resuelve, y las dos son fallas silenciosas si se
 * resuelven mal:
 *
 * **Sin Supabase configurado no hay backoffice.** El sitio público funciona sin base
 * —muestra el contenido editorial y omite las cifras (FR-034)— pero el backoffice no
 * tiene nada que hacer sin ella. En lugar de fallar con un error de conexión, devuelve
 * `null` y la pantalla lo explica.
 *
 * **El actor de una acción sale de la sesión verificada, nunca del formulario.** Es lo
 * que hace que `actor: null` sea un caso real y no teórico: una Server Action es un
 * endpoint HTTP que se puede invocar por su ID sin cookie (amenaza T7).
 */

export interface AdminContext {
  readonly gateway: AdminGateway;
  readonly viewer: Viewer;
  readonly campaign: Campaign | null;
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const [gateway, viewer] = await Promise.all([getAdminGateway(), readViewer()]);

  if (gateway === null || viewer === null) {
    return null;
  }

  return { gateway, viewer, campaign: await gateway.campaign.getCampaign() };
}

/**
 * Lo que una pantalla del backoffice necesita antes de poder mostrar algo.
 *
 * Es una unión y no un objeto con campos anulables porque los tres casos se ven
 * distintos en la pantalla y ninguno de los dos primeros es una lista vacía: sin base
 * hay que revisar variables de entorno, y sin campaña hay que cargar una antes de
 * poder imputar un gasto. Distinguirlos en el tipo obliga a que cada pantalla diga
 * cuál de los dos es (principio XII).
 */
export type AdminScope =
  | { readonly state: "sin-base" }
  | { readonly state: "sin-campana"; readonly gateway: AdminGateway }
  | {
      readonly state: "lista";
      readonly gateway: AdminGateway;
      readonly campaign: Campaign;
    };

export async function getAdminScope(): Promise<AdminScope> {
  const context = await getAdminContext();

  if (context === null) {
    return { state: "sin-base" };
  }

  if (context.campaign === null) {
    return { state: "sin-campana", gateway: context.gateway };
  }

  return { state: "lista", gateway: context.gateway, campaign: context.campaign };
}

/**
 * Las dependencias de una acción de servidor.
 *
 * Devuelve `null` sólo cuando no hay proyecto configurado. La ausencia de sesión
 * **no** devuelve `null`: devuelve dependencias con `actor: null`, para que el caso
 * de uso lo rechace con un mensaje y no con un error genérico.
 */
export async function getAdminDeps(): Promise<AdminDeps | null> {
  const gateway = await getAdminGateway();

  if (gateway === null) {
    return null;
  }

  const viewer = await readViewer();

  return {
    gateway,
    logger,
    actor: viewer === null ? null : { userId: viewer.userId, role: viewer.role },
  };
}

/** El resultado cuando el proyecto no está configurado. Se dice, no se oculta. */
export const NOT_CONFIGURED: AdminResult<never> = {
  status: "failed",
  message:
    "El backoffice necesita una base de datos configurada. Revisá las variables de entorno de Supabase.",
};
