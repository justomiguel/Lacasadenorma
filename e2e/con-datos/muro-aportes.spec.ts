import { expect, test } from "@playwright/test";

import { entrar, sufijoUnico } from "../soporte/backoffice";
import { esperarQueAparezca, esperarQueNoAparezca } from "../soporte/revalidar";

/**
 * El muro de aportes en plata: el nombre con consentimiento, el % sólo si
 * el interruptor está prendido, y el monto nunca (ADR-042).
 */

test.describe("fase · muro de aportes", () => {
  test("el interruptor muestra u oculta el porcentaje, nunca el monto", async ({
    page,
    request,
  }, info) => {
    test.setTimeout(90_000);
    test.skip(
      info.project.name !== "escritorio",
      "el interruptor es de la campaña: un solo worker para no pisarse",
    );
    const sufijo = sufijoUnico(info.project.name);
    const visible = `Aporte Visible ${sufijo}`;
    const hoy = new Date().toISOString().slice(0, 10);

    await entrar(page, "admin");
    await page.goto("/admin/aportes");

    // El `id` del Panel vive en el h2 (`aria-labelledby`), no en el section:
    // `#nuevo` no contiene el formulario. El patrón es el de `catalogo.ts`.
    const alta = page.getByRole("region", { name: /registrar un aporte/i });
    const interruptor = page.getByRole("region", {
      name: /quiénes ayudaron · plata/i,
    });

    await alta.getByLabel("Monto", { exact: true }).fill("1.000.000");
    await alta.getByLabel(/fecha en que entró/i).fill(hoy);
    await alta.getByLabel(/nombre para el muro/i).fill(visible);
    await alta.getByLabel(/aparecer en quiénes ayudaron/i).check();
    await alta.getByRole("button", { name: /registrar aporte/i }).click();

    await expect(page.getByText(/aporte registrado/i).first()).toBeVisible();

    await esperarQueAparezca(request, "/quienes-ayudaron", visible);

    const muro = await page.goto("/quienes-ayudaron");

    expect(muro).not.toBeNull();

    const linea = page
      .getByRole("heading", { name: visible })
      .locator("xpath=ancestor::li[1]");

    await expect(page.getByRole("heading", { name: visible })).toBeVisible();
    await expect(linea.getByText(/%/)).toHaveCount(0);
    await expect(page.getByText("$ 1.000.000")).toHaveCount(0);
    await expect(page.getByText("1000000")).toHaveCount(0);

    await page.goto("/admin/aportes");

    await interruptor.getByLabel(/mostrar el porcentaje/i).check();
    await interruptor.getByRole("button", { name: /^guardar$/i }).click();
    await expect(page.getByText(/va a mostrar el porcentaje/i).first()).toBeVisible();

    await esperarQueAparezca(request, "/quienes-ayudaron", "de lo que ya llegó");

    await page.goto("/quienes-ayudaron");

    await expect(page.getByRole("heading", { name: visible })).toBeVisible();
    await expect(linea.getByText(/%/)).toHaveCount(1);
    await expect(page.getByText("$ 1.000.000")).toHaveCount(0);

    await page.goto("/admin/aportes");
    await interruptor.getByLabel(/mostrar el porcentaje/i).uncheck();
    await interruptor.getByRole("button", { name: /^guardar$/i }).click();
    await expect(page.getByText(/sólo el nombre/i).first()).toBeVisible();

    await esperarQueNoAparezca(request, "/quienes-ayudaron", "de lo que ya llegó");

    await page.goto("/quienes-ayudaron");
    await expect(page.getByRole("heading", { name: visible })).toBeVisible();
    await expect(linea.getByText(/%/)).toHaveCount(0);
  });
});
