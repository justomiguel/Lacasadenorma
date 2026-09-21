import { expect, test, type Locator } from "@playwright/test";

import { entrar, sufijoUnico } from "../soporte/backoffice";
import { ocultarItemSiExiste } from "../soporte/catalogo";

/**
 * Quien donó por fuera: el owner carga una cuenta del público ya habilitada.
 *
 * Sin mail se inventa `{local}@lacasadenorma.com`. La clave no se ve. Esa
 * persona no tiene sesión acá, y no entra al backoffice: no es un rol.
 * Si el formulario no está, falta la clave de Auth del harness: se falla.
 */

const ITEM_DEL_FIXTURE = "dddddddd-0000-4000-8000-000000000001";

test.describe("donantes · quien donó por fuera", () => {
  test("owner carga a quien donó por fuera, sin mail", async ({
    page,
    request,
  }, info) => {
    test.setTimeout(90_000);

    const sufijo = sufijoUnico(info.project.name);
    const nombre = `Vecina ${sufijo}`;
    const titulo = `Ladrillos de ${sufijo}`;
    const hoy = new Date().toISOString().slice(0, 10);
    let itemCreado = false;

    try {
      await entrar(page, "owner");
      await page.goto("/admin/catalogo");

      const catalogo = page.getByRole("region", { name: /agregar un ítem/i });

      await catalogo.getByLabel("Qué hace falta").fill(titulo);
      await catalogo.getByLabel("Cuántas hacen falta").fill("2");
      await catalogo.getByRole("button", { name: /guardar ítem/i }).click();
      await expect(catalogo.getByRole("status")).toHaveText(/ítem guardado/i);
      itemCreado = true;

      await page.goto("/admin/donantes");

      const alta = page.getByRole("region", {
        name: /cargar a alguien que donó por fuera/i,
      });

      await expect(
        alta.getByRole("button", { name: /crear la cuenta/i }),
        "el alta tiene que estar: la clave de Auth es parte del harness",
      ).toBeVisible();

      await alta.getByLabel("Nombre").fill(nombre);
      await alta.getByRole("button", { name: /crear la cuenta/i }).click();

      await expect(alta.getByText(/@lacasadenorma\.com/)).toBeVisible();
      await expect(alta.getByRole("button", { name: /copiar/i })).toBeVisible();

      await page.goto("/admin/donantes");
      await page.getByRole("link", { name: nombre, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();

      const plata = page.getByRole("region", { name: /^plata/i });

      await plata.getByLabel("Monto", { exact: true }).fill("100");
      await plata.getByLabel(/fecha en que entró/i).fill(hoy);
      await plata.getByRole("button", { name: /registrar aporte/i }).click();
      await expect(plata.getByText(/aporte registrado/i)).toBeVisible();

      const material = page.getByRole("region", { name: /^material/i });
      const anotar = material.getByRole("button", { name: /anotar la entrega/i });

      await expect(anotar).toBeVisible();

      const itemId = await valorDeOpcion(material.getByLabel("Ítem"), titulo);

      await material.getByLabel("Ítem").selectOption(itemId ?? ITEM_DEL_FIXTURE);
      await material.getByLabel("Cantidad").fill("1");
      await anotar.click();
      await expect(material.getByText(/entrega anotada/i)).toBeVisible();

      // No hay sesión de esta persona: la clave se inventó y nadie la ve.
      // /admin como ella no se recorre. Es donante, no un rol interno.
    } finally {
      if (itemCreado) {
        await ocultarItemSiExiste(request, titulo);
      }
    }
  });

  test("el editor no ve Crear la cuenta", async ({ page }) => {
    await entrar(page, "editor");
    await page.goto("/admin/donantes");

    await expect(page.getByRole("button", { name: /crear la cuenta/i })).toHaveCount(0);
  });
});

async function valorDeOpcion(select: Locator, titulo: string): Promise<string | null> {
  const options = select.locator("option");
  const count = await options.count();

  for (let i = 0; i < count; i += 1) {
    const option = options.nth(i);
    const label = (await option.textContent()) ?? "";

    if (label.includes(titulo)) {
      return option.getAttribute("value");
    }
  }

  return null;
}
