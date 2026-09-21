import { expect, test } from "@playwright/test";

import {
  articuloDelCatalogo,
  abrirItemDelCatalogo,
  filaDelCatalogo,
  formularioDeTraer,
} from "../soporte/catalogo";

/**
 * El catálogo público como inventario: listado, ficha y formulario vacío.
 *
 * Vive aparte de `catalogo.spec.ts` porque ese archivo ya estaba al tope de
 * `max-lines`. Las reservas, el conflicto y revertir siguen allá.
 */

const ITEM_DEL_FIXTURE = "dddddddd-0000-4000-8000-000000000001";

test.describe("fase D · inventario", () => {
  test("la ficha dice que el monto es estimado y se puede cubrir por Mercado Pago o PayPal", async ({
    page,
  }) => {
    await page.goto(`/catalogo/${ITEM_DEL_FIXTURE}`);
    const articulo = articuloDelCatalogo(page);

    await expect(articulo.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(articulo.getByRole("img", { name: /foto ilustrativa/i })).toBeVisible();
    await expect(articulo.getByText(/solamente ilustrativa/i)).toBeVisible();
    await expect(articulo.getByText(/no representa el objeto real/i)).toBeVisible();
    await expect(articulo.getByText(/estimado/i).first()).toBeVisible();
    await expect(articulo.getByText(/no fijo/i).first()).toBeVisible();
    await expect(
      articulo.getByRole("radio", { name: /traer el mismo bien/i }),
    ).toBeChecked();
    await expect(
      articulo.getByRole("radio", { name: /cubrir con plata/i }),
    ).toBeVisible();
    await expect(articulo.locator("[data-pay=transfer]")).toBeHidden();
    await expect(articulo.locator("[data-pay=mercadopago]")).toBeHidden();
    await expect(articulo.locator("[data-pay=paypal]")).toBeHidden();
    await expect(articulo.getByLabel(/^nombre$/i)).toBeVisible();
    await expect(articulo.getByLabel(/^teléfono$/i)).toBeVisible();
    await expect(articulo.getByLabel(/^correo$/i)).toBeVisible();
    await expect(articulo.getByLabel(/dirección donde ir a buscar/i)).toHaveCount(0);
    await expect(articulo.getByRole("button", { name: /quiero donar/i })).toBeVisible();

    await articulo.getByRole("radio", { name: /cubrir con plata/i }).click();
    await articulo.getByRole("radio", { name: /^transferencia$/i }).click();
    await expect(articulo.locator("[data-pay=transfer]")).toBeVisible();
    await expect(articulo.locator("[data-pay=mercadopago]")).toBeHidden();
    await expect(articulo.getByText(/^cbu$/i).first()).toBeVisible();
    await expect(articulo.getByRole("button", { name: /quiero donar/i })).toBeHidden();
    await expect(articulo.getByText(/no hace falta cuenta ni anotarse/i)).toHaveCount(0);

    await articulo.getByRole("radio", { name: /mercado pago/i }).click();
    await expect(articulo.locator("[data-pay=mercadopago]")).toBeVisible();
    await expect(articulo.locator("[data-pay=transfer]")).toBeHidden();
    await expect(articulo.getByLabel(/sumar más/i)).toBeVisible();
    await expect(
      articulo.getByRole("link", { name: /continuar con mercado pago/i }).first(),
    ).toBeVisible();

    await articulo.getByLabel(/sumar más/i).fill("1000");
    await expect(articulo.getByText(/total a enviar por mercado pago/i)).toBeVisible();

    await articulo.getByRole("radio", { name: /paypal/i }).click();
    await expect(articulo.locator("[data-pay=paypal]")).toBeVisible();
    await expect(articulo.locator("[data-pay=mercadopago]")).toBeHidden();
    await expect(
      articulo.getByRole("link", { name: /continuar con paypal/i }).first(),
    ).toBeVisible();
  });

  test("el listado es un inventario en teléfono, con estimado y quiero donar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/catalogo");

    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByRole("columnheader")).toHaveCount(0);

    const fila = filaDelCatalogo(page, "Chapas del techo (datos de desarrollo)");

    await expect(
      fila.getByRole("img", { name: /foto ilustrativa de chapas/i }),
    ).toBeVisible();
    await expect(fila.getByRole("link", { name: /quiero donar/i })).toBeVisible();
    await expect(fila.getByText("$ 150.000")).toBeVisible();

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(Math.max(0, desborde), "el inventario no desborda la página").toBe(0);

    await expect(
      page.locator("[data-foco-condicional]"),
      "en el catálogo la acción es donar el ítem, no ir a /ayudar",
    ).toHaveCount(0);
  });

  test("en la ficha tampoco está la barra de ayudar", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`/catalogo/${ITEM_DEL_FIXTURE}`);

    await expect(page.locator("[data-foco-condicional]")).toHaveCount(0);
  });

  test("enviar vacío lleva al primer dato faltante y lo marca en rojo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`/catalogo/${ITEM_DEL_FIXTURE}`);

    const formulario = formularioDeTraer(articuloDelCatalogo(page));
    const nombre = formulario.getByLabel(/^nombre$/i);

    await formulario.getByRole("button", { name: /quiero donar/i }).click();

    await expect(nombre).toBeFocused();
    await expect(nombre).toBeInViewport();
    await expect(nombre).toHaveCSS("border-top-color", "rgb(138, 58, 42)");

    await nombre.fill("Ana");
    await formulario.getByRole("button", { name: /quiero donar/i }).click();

    await expect(
      formulario.getByText(/teléfono o un correo, uno de los dos/i),
    ).toBeVisible();
  });

  test("del listado a la ficha se ve la foto, no sólo el epígrafe", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/catalogo");
    await abrirItemDelCatalogo(page, "Chapas del techo (datos de desarrollo)");

    const ficha = articuloDelCatalogo(page);
    const revelado = ficha.locator("[data-reveal-photo]");

    await expect(revelado).toHaveAttribute("data-in-view", "");
    await expect(revelado).toHaveCSS("opacity", "1");
    await expect(
      ficha.getByRole("img", { name: /foto ilustrativa de chapas/i }),
    ).toBeVisible();
    await expect(ficha.getByText(/solamente ilustrativa/i)).toBeVisible();
  });
});
