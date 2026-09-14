import { expect, type APIRequestContext } from "@playwright/test";

import { apiLocal, tokenDe } from "./backoffice";

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

  // El route handler sólo marca el path. La regeneración corre en la visita
  // siguiente, y esa visita puede servir el HTML viejo (stale-while-revalidate).
  // Dos GET: el primero dispara, el segundo ya trae lo nuevo.
  for (const path of paths) {
    const primera = (await request.get(path)).status();
    const segunda = (await request.get(path)).status();

    expect([200, 404], `${path} (${String(primera)})`).toContain(primera);
    expect([200, 404], `${path} (${String(segunda)})`).toContain(segunda);
  }
}

/**
 * Espera a que una página dejada vieja por ISR deje de mostrar un texto.
 *
 * Dos GET no alcanzan si la regeneración tira (`keepStaleOnError`) o si el
 * primer visitante todavía se lleva el HTML anterior. Se vuelve a marcar y a
 * pedir hasta que el texto no esté, o hasta que el timeout lo diga.
 */
export async function esperarQueNoAparezca(
  request: APIRequestContext,
  path: string,
  texto: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const primera = await (await request.get(path)).text();

        if (!primera.includes(texto)) {
          return false;
        }

        const segunda = await (await request.get(path)).text();

        if (!segunda.includes(texto)) {
          return false;
        }

        const marca = await request.post("/e2e/revalidar", {
          data: { paths: [path] },
        });

        expect(marca.status(), await marca.text()).toBe(200);

        return true;
      },
      {
        timeout: 15_000,
        intervals: [500, 1_000, 1_000, 2_000],
        message: `${path} todavía muestra «${texto}» después de invalidar ISR`,
      },
    )
    .toBe(false);
}

/**
 * Saca una novedad de prueba del sitio. `/reconstruccion` muestra sólo la
 * última: si ésta queda publicada, el flujo 3 del proyecto siguiente deja de
 * ver el título del fixture.
 */
export async function ocultarNovedad(
  request: APIRequestContext,
  slug: string,
): Promise<void> {
  const token = await tokenDe(request, "editor");
  const respuesta = await request.patch(
    `${apiLocal()}/rest/v1/updates?slug=eq.${encodeURIComponent(slug)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: "return=minimal",
      },
      data: { published_at: null },
    },
  );

  expect(respuesta.status(), "despublicar la novedad de prueba").toBe(204);
  await revalidar(request, [
    "/reconstruccion",
    "/en/reconstruccion",
    "/novedades",
    "/en/novedades",
    `/novedades/${slug}`,
    `/en/novedades/${slug}`,
  ]);
}
