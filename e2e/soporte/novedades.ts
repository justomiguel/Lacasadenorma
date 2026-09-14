import { expect, type Page } from "@playwright/test";

import { entrar } from "./backoffice";

/**
 * Saca del sitio una novedad de prueba. Tiene que pasar por el botón del
 * backoffice: `revalidatePath("/reconstruccion")` vive en esa acción, y un
 * `PATCH` a PostgREST deja la página de la obra mostrando el título de prueba
 * hasta cinco minutos (ADR-017). CI lo midió: el proyecto `escritorio` publicaba
 * «Llegó el agua…» para leer la auditoría y no la despublicaba; `movil` y
 * `safari` encontraban esa fila como `listUpdates({ limit: 1 })` y el flujo 3
 * buscaba el título del fixture.
 */
export async function volverABorradorSiSiguePublicada(
  page: Page,
  url: string,
): Promise<void> {
  try {
    await page.goto(url);

    if (/\/admin\/(login|sin-permiso)/.test(page.url())) {
      await entrar(page, "editor");
      await page.goto(url);
    }

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const despublicar = page.getByRole("button", { name: /^despublicar$/i });

    if (!(await despublicar.isVisible())) {
      return;
    }

    await despublicar.click();
    await expect(page.getByRole("status")).toContainText(/volvió a borrador/i);
  } catch (error) {
    console.warn("No se pudo despublicar la novedad de prueba", error);
  }
}
