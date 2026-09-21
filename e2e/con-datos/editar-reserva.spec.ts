import { expect, test } from "@playwright/test";

import { sufijoUnico } from "../soporte/backoffice";
import {
  articuloDelCatalogo,
  abrirItemDelCatalogo,
  completarTraer,
  conItemPublicado,
  formularioDeTraer,
  ocultarItemSiExiste,
} from "../soporte/catalogo";
import { correoDePrueba, crearCuenta } from "../soporte/cuentas";

/**
 * Subir la cantidad de una reserved propia (FR-220). Vive aparte del
 * conflicto de `catalogo.spec.ts` para no tapar esa carrera, y aparte porque
 * ese archivo ya está al tope de `max-lines`.
 */

test.describe("fase D · editar una reserva propia", () => {
  test("reservar 1 y subir a 2 desde la cuenta", async ({ request, browser }, info) => {
    test.setTimeout(90_000);
    const sufijo = sufijoUnico(info.project.name);
    const titulo = `Más bolsas (${sufijo})`;
    const email = correoDePrueba(info.project.name, "editar");

    const staff = await browser.newContext();
    const staffPage = await staff.newPage();

    try {
      const donante = await browser.newContext();
      const pagina = await donante.newPage();

      try {
        await conItemPublicado(request, staffPage, titulo, 3, async (itemId) => {
          await crearCuenta(pagina, request, email);
          await pagina.goto("/catalogo");
          await abrirItemDelCatalogo(pagina, titulo);
          await completarTraer(formularioDeTraer(articuloDelCatalogo(pagina)));
          await expect(pagina).toHaveURL(/\/cuenta$/);
          await expect(
            pagina.getByRole("link", { name: /mis donaciones|my donations/i }),
          ).toHaveAttribute("aria-current", "page");
          await expect(pagina.getByRole("link", { name: titulo })).toHaveAttribute(
            "href",
            `/catalogo/${itemId}`,
          );

          await expect(pagina.getByLabel(/^cuántas$/i)).toHaveValue("1");
          await pagina.getByLabel(/^cuántas$/i).fill("2");
          await pagina.getByRole("button", { name: /guardar cambios/i }).click();
          await expect(pagina.getByText(/2 /i)).toBeVisible();
        });
      } finally {
        await donante.close();
      }
    } finally {
      await ocultarItemSiExiste(staffPage.request, titulo);
      await staff.close();
    }
  });
});
