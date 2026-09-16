import { expect, test } from "@playwright/test";

import { esperarSinViolaciones } from "../soporte/axe";
import { entrar } from "../soporte/backoffice";

/**
 * El tablero de métricas es de `owner`. Un admin autenticado no lo ve; sin
 * sesión nadie entra. Lo que se afirma acá es el permiso y que la pantalla
 * muestra libro y gráficos cuando el fixture tiene movimientos (SC-601, SC-602).
 */

test.describe("métricas del owner", () => {
  test("owner ve el tablero con libro y gráficos", async ({ page }) => {
    await entrar(page, "owner");
    await page.goto("/admin/metricas");

    await expect(page).not.toHaveURL(/sin-permiso/);
    await expect(page.getByRole("heading", { level: 1, name: "Métricas" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Métricas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.locator("[data-figure]").first()).toBeVisible();
    await expect(page.getByRole("img").first()).toBeVisible();
    await expect(page.getByRole("table").first()).toBeVisible();

    await esperarSinViolaciones(page, "/admin/metricas");
  });

  test("admin no entra al tablero", async ({ page }) => {
    await entrar(page, "admin");
    await page.goto("/admin/metricas");

    await expect(page).toHaveURL(/\/admin\/sin-permiso/);
    await expect(page.getByRole("link", { name: "Métricas" })).toHaveCount(0);
  });
});
