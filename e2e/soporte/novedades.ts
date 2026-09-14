import { expect, type Page } from "@playwright/test";

import { entrar } from "./backoffice";

const URL_DE_UNA_NOVEDAD =
  /\/admin\/novedades\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Saca del sitio una novedad de prueba. Tiene que pasar por el botón del
 * backoffice: `revalidatePath("/reconstruccion")` vive en esa acción, y un
 * `PATCH` a PostgREST deja la página de la obra mostrando el título de prueba
 * hasta cinco minutos (ADR-017). CI lo midió: el proyecto `escritorio` publicaba
 * «Llegó el agua…» para leer la auditoría y no la despublicaba; `movil` y
 * `safari` encontraban esa fila como `listUpdates({ limit: 1 })` y el flujo 3
 * buscaba el título del fixture.
 *
 * El botón se busca en la sección «Estado»: la lista de novedades tiene un
 * Despublicar por cada fila publicada, y un clic ahí sacaría del sitio la
 * novedad equivocada.
 */
export async function volverABorradorSiSiguePublicada(
  page: Page,
  url: string,
): Promise<void> {
  if (!URL_DE_UNA_NOVEDAD.test(new URL(url, "http://x.test").pathname)) {
    console.warn("No hay URL de novedad para despublicar", url);
    return;
  }

  try {
    await page.goto(url);

    if (/\/admin\/(login|sin-permiso)/.test(page.url())) {
      await entrar(page, "editor");
      await page.goto(url);
    }

    const publicada = page.getByRole("region", { name: "Estado" });
    const borrador = page.getByRole("region", { name: "Publicar" });

    await expect(publicada.or(borrador)).toBeVisible();

    if (!(await publicada.isVisible())) {
      return;
    }

    await publicada.getByRole("button", { name: "Despublicar", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(/volvió a borrador/i);
  } catch (error) {
    console.warn("No se pudo despublicar la novedad de prueba", error);
  }
}
