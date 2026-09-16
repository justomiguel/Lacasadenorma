import { expect, test, type Page } from "@playwright/test";

import { esperarSinViolaciones } from "../soporte/axe";
import { entrar, sufijoUnico } from "../soporte/backoffice";
import { cargarItemPublicado, ocultarItemSiExiste } from "../soporte/catalogo";

/**
 * Acciones del catálogo en el backoffice: ver, editar esa fila, borrar
 * (ADR-050, FR-258, SC-215). El HTML de `/catalogo` no se toca.
 */

function filaDe(page: Page, titulo: string) {
  return page
    .getByRole("region", { name: /qué le falta a la casa/i })
    .getByRole("row")
    .filter({ hasText: titulo });
}

test.describe("catálogo · acciones del owner", () => {
  test("ver, editar la fila y borrar un ítem que nadie tomó", async ({
    page,
    request,
  }, info) => {
    const titulo = `Ladrillos de prueba (${sufijoUnico(info.project.name)})`;
    let borrado = false;

    try {
      await entrar(page, "owner");
      await page.goto("/admin/catalogo");

      const alta = page.getByRole("region", { name: /agregar un ítem/i });

      await alta.getByLabel("Qué hace falta").fill(titulo);
      await alta.getByRole("button", { name: /guardar ítem/i }).click();
      await expect(alta.getByRole("status")).toHaveText(/ítem guardado/i);

      const fila = filaDe(page, titulo);

      await expect(fila.getByRole("link", { name: /ver ficha/i })).toBeVisible();
      await expect(fila.getByRole("link", { name: /^editar$/i })).toBeVisible();
      await expect(fila.getByRole("button", { name: /^borrar$/i })).toBeVisible();

      await fila.getByRole("link", { name: /^editar$/i }).click();
      await expect(page).toHaveURL(/editar=/);

      const lista = page.getByRole("region", { name: /qué le falta a la casa/i });

      await expect(lista.getByLabel("Qué hace falta")).toHaveValue(titulo);
      await expect(lista.getByRole("button", { name: /guardar cambios/i })).toBeVisible();

      await fila.getByRole("link", { name: /ver ficha/i }).click();
      await expect(page).toHaveURL(/\/catalogo\/[0-9a-f-]{36}/i);
      await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();

      await page.goto("/admin/catalogo");
      const otra = filaDe(page, titulo);

      await otra.getByRole("button", { name: /^borrar$/i }).click();
      await otra.getByRole("button", { name: /borrar del catálogo/i }).click();
      await expect(page).toHaveURL(/hecho=borrado/);
      await expect(page.getByRole("status")).toHaveText(/ítem borrado/i);
      await expect(filaDe(page, titulo)).toHaveCount(0);
      borrado = true;
    } finally {
      if (!borrado) {
        await ocultarItemSiExiste(request, titulo);
      }
    }
  });

  test("el editor ve ver y editar, no borrar", async ({ page, request }, info) => {
    const titulo = `Arena de prueba (${sufijoUnico(info.project.name)})`;

    try {
      await cargarItemPublicado(page, titulo);
      await page.goto("/admin/catalogo");

      const fila = filaDe(page, titulo);

      await expect(fila.getByRole("link", { name: /ver ficha/i })).toBeVisible();
      await expect(fila.getByRole("link", { name: /^editar$/i })).toBeVisible();
      await expect(fila.getByRole("button", { name: /^borrar$/i })).toHaveCount(0);
    } finally {
      await ocultarItemSiExiste(request, titulo);
    }
  });

  test("la tabla del catálogo cumple WCAG 2.2 AA", async ({ page }) => {
    await entrar(page, "owner");
    await page.goto("/admin/catalogo");
    await expect(page.getByRole("heading", { level: 1, name: "Catálogo" })).toBeVisible();
    await esperarSinViolaciones(page, "/admin/catalogo");
  });
});
