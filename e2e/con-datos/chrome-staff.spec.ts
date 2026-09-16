import { expect, test } from "@playwright/test";

import { entrar } from "../soporte/backoffice";
import { correoDePrueba, crearCuenta } from "../soporte/cuentas";
import { VIEWPORT_MINIMO } from "../soporte/paginas";

/**
 * El chrome público nombra el backoffice sólo si hay rol (ADR-037).
 *
 * En el teléfono el enlace tiene que estar **en el viewport** al abrir el menú:
 * `toBeVisible` encuentra nodos debajo del pliegue, y ahí no se ve.
 */

test.describe("chrome · Backoffice", () => {
  test("una cuenta del público en /admin termina en /admin/sin-permiso", async ({
    page,
    request,
  }, info) => {
    const email = correoDePrueba(info.project.name, "sin-rol");

    await crearCuenta(page, request, email);
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/sin-permiso$/);

    for (const ruta of [
      "/admin/aportes",
      "/admin/gastos",
      "/admin/cuentas",
      "/admin/metricas",
    ]) {
      await page.goto(ruta);
      await expect(page, `${ruta} se abrió para una cuenta sin rol`).toHaveURL(
        /\/admin\/sin-permiso$/,
      );
    }

    await expect(page.getByRole("link", { name: /^backoffice$/i })).toHaveCount(0);
  });

  test("quien tiene rol ve Backoffice en el sitio público y llega al panel", async ({
    page,
  }) => {
    await entrar(page, "editor");
    await page.goto("/");

    const angosto = (page.viewportSize()?.width ?? 1440) < 1024;

    if (angosto) {
      await page.setViewportSize(VIEWPORT_MINIMO);
      await page.getByRole("button", { name: /abrir el menú/i }).click();

      const enlace = page
        .getByRole("dialog")
        .getByRole("link", { name: /^backoffice$/i });

      await expect(enlace).toBeVisible({ timeout: 20_000 });
      await expect(enlace).toBeInViewport();
      await enlace.click();
    } else {
      const enlace = page
        .getByRole("banner")
        .getByRole("link", { name: /^backoffice$/i });

      await expect(enlace).toBeVisible({ timeout: 20_000 });
      await enlace.click();
    }

    await expect(page).toHaveURL(/\/admin(\/|$|\?)/);
    await expect(page).not.toHaveURL(/sin-permiso/);
  });
});
