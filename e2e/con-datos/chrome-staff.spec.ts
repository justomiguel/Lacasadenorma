import { expect, test } from "@playwright/test";

import { entrar } from "../soporte/backoffice";
import { correoDePrueba, crearCuenta } from "../soporte/cuentas";
import { VIEWPORT_MINIMO } from "../soporte/paginas";

/**
 * El chrome público nombra el backoffice sólo si hay rol (ADR-037).
 *
 * En el teléfono el enlace tiene que estar **en el viewport** al abrir el menú:
 * `toBeVisible` encuentra nodos debajo del pliegue, y ahí no se ve. Métricas
 * va debajo de Backoffice y sólo para owner (FR-615).
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
    await expect(page.getByRole("link", { name: /^métricas$/i })).toHaveCount(0);
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

      const menu = page.getByRole("dialog");
      const enlace = menu.getByRole("link", { name: /^backoffice$/i });

      await expect(enlace).toBeVisible({ timeout: 20_000 });
      await expect(enlace).toBeInViewport();
      await expect(menu.getByRole("link", { name: /^métricas$/i })).toHaveCount(0);
      await enlace.click();
    } else {
      const enlace = page
        .getByRole("banner")
        .getByRole("link", { name: /^backoffice$/i });

      await expect(enlace).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByRole("banner").getByRole("link", { name: /^métricas$/i }),
      ).toHaveCount(0);
      await enlace.click();
    }

    await expect(page).toHaveURL(/\/admin(\/|$|\?)/);
    await expect(page).not.toHaveURL(/sin-permiso/);
  });

  test("el owner ve Métricas debajo de Backoffice en el menú y llega al tablero", async ({
    page,
  }) => {
    await entrar(page, "owner");
    await page.setViewportSize(VIEWPORT_MINIMO);
    await page.goto("/");
    await page.getByRole("button", { name: /abrir el menú/i }).click();

    const menu = page.getByRole("dialog");
    const backoffice = menu.getByRole("link", { name: /^backoffice$/i });
    const metricas = menu.getByRole("link", { name: /^métricas$/i });

    await expect(backoffice).toBeVisible({ timeout: 20_000 });
    await expect(metricas).toBeVisible();
    await expect(metricas).toBeInViewport();
    await expect(metricas).toHaveAttribute("href", "/admin/metricas");
    await expect(metricas.locator("svg")).toHaveCount(1);

    const backofficeBox = await backoffice.boundingBox();
    const metricasBox = await metricas.boundingBox();

    expect(backofficeBox, "Backoffice tenía que tener caja").not.toBeNull();
    expect(metricasBox, "Métricas tenía que tener caja").not.toBeNull();
    expect(metricasBox!.y).toBeGreaterThan(backofficeBox!.y);

    await metricas.click();
    await expect(page).toHaveURL(/\/admin\/metricas/);
    await expect(page).not.toHaveURL(/sin-permiso/);
  });
});
