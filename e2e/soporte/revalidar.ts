import { expect, type APIRequestContext } from "@playwright/test";

/**
 * Invalida las páginas estáticas que una escritura por REST dejó viejas.
 *
 * Las acciones del backoffice llaman `revalidatePath` (ADR-017). El cleanup
 * que le habla a PostgREST directo no pasa por esas acciones, y sin esto la
 * corrida siguiente sigue viendo el dato hasta que vencen los 300 s.
 */
export async function revalidar(
  request: APIRequestContext,
  paths: readonly string[],
): Promise<void> {
  const respuesta = await request.post("/e2e/revalidar", { data: { paths } });

  expect(respuesta.status(), await respuesta.text()).toBe(200);
}
