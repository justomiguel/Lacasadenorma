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
import {
  CLAVE_PUBLICA,
  correoDePrueba,
  crearCuenta,
  cerrarSesion,
  enlacePendiente,
  urlDelEnlace,
} from "../soporte/cuentas";

/**
 * Quiero donar sin sesión: crear la cuenta, confirmar el correo, volver.
 *
 * Vive aparte de `catalogo.spec.ts` porque ese archivo ya estaba al tope de
 * `max-lines`. El ítem del fixture alcanza para el salto a crear; el alta
 * nueva necesita un ítem publicado propio para no ensuciar el listado.
 */

const ITEM_DEL_FIXTURE = "dddddddd-0000-4000-8000-000000000001";

test.describe("fase D · Quiero donar pide cuenta", () => {
  test("sin sesión, Quiero donar lleva a crear una cuenta", async ({ page }) => {
    await page.goto(`/catalogo/${ITEM_DEL_FIXTURE}`);
    await completarTraer(formularioDeTraer(articuloDelCatalogo(page)));

    await expect(page).toHaveURL(new RegExp(`/cuenta/crear\\?volver=`));
    await expect(page).toHaveURL(new RegExp(ITEM_DEL_FIXTURE));
    await expect(page.getByRole("heading", { name: /crear una cuenta/i })).toBeVisible();
    await expect(
      page.getByText(/el mail es para escribirte, no para verificar/i),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /^ingresá$/i })).toHaveAttribute(
      "href",
      new RegExp(`/cuenta/ingresar\\?volver=.*${ITEM_DEL_FIXTURE}`),
    );
  });

  test("sin cuenta, confirmar el correo vuelve a la ficha", async ({
    request,
    browser,
  }, info) => {
    test.setTimeout(90_000);
    const sufijo = sufijoUnico(info.project.name);
    const titulo = `Chapas para confirmar (${sufijo})`;
    const email = correoDePrueba(info.project.name, "confirmar");

    const staff = await browser.newContext();
    const staffPage = await staff.newPage();

    try {
      const donante = await browser.newContext();
      const donantePage = await donante.newPage();

      try {
        await conItemPublicado(request, staffPage, titulo, 1, async (itemId) => {
          await donantePage.goto("/catalogo");
          await abrirItemDelCatalogo(donantePage, titulo);
          await completarTraer(formularioDeTraer(articuloDelCatalogo(donantePage)));

          await expect(donantePage).toHaveURL(new RegExp(`/cuenta/crear\\?volver=`));
          await expect(donantePage).toHaveURL(new RegExp(itemId));

          await donantePage.getByLabel("Correo").fill(email);
          await donantePage.getByLabel("Contraseña").fill(CLAVE_PUBLICA);
          await donantePage.getByRole("button", { name: /crear la cuenta/i }).click();
          await expect(
            donantePage.getByRole("heading", { name: /revisá tu correo/i }),
          ).toBeVisible();
          await expect(
            donantePage.getByText(/así sabemos que esa casilla existe/i),
          ).toBeVisible();

          const enlace = await enlacePendiente(request, email);

          expect(enlace.type).toBe("signup");

          await donantePage.goto(urlDelEnlace(enlace));

          await expect(donantePage).toHaveURL(new RegExp(`/catalogo/${itemId}$`));
          await expect(donantePage.getByRole("heading", { name: titulo })).toBeVisible();
        });
      } finally {
        await donante.close();
      }
    } finally {
      await ocultarItemSiExiste(staffPage.request, titulo);
      await staff.close();
    }
  });

  test("pedir donar sin sesión vuelve al mismo ítem después de ingresar", async ({
    request,
    browser,
  }, info) => {
    test.setTimeout(90_000);
    const sufijo = sufijoUnico(info.project.name);
    const titulo = `Chapas para volver (${sufijo})`;
    const email = correoDePrueba(info.project.name, "volver");

    const staff = await browser.newContext();
    const staffPage = await staff.newPage();

    try {
      const donante = await browser.newContext();
      const donantePage = await donante.newPage();

      try {
        await conItemPublicado(request, staffPage, titulo, 1, async (itemId) => {
          await crearCuenta(donantePage, request, email);
          await cerrarSesion(donantePage);

          await donantePage.goto("/catalogo");
          await abrirItemDelCatalogo(donantePage, titulo);
          const articulo = articuloDelCatalogo(donantePage);

          await expect(articulo).toHaveCount(1);
          await expect(articulo).toBeVisible();
          await completarTraer(formularioDeTraer(articulo));

          await expect(donantePage).toHaveURL(new RegExp(`/cuenta/crear\\?volver=`));
          await expect(donantePage).toHaveURL(new RegExp(itemId));

          await donantePage.getByRole("link", { name: /^ingresá$/i }).click();
          await expect(donantePage).toHaveURL(new RegExp(`/cuenta/ingresar\\?volver=`));
          await expect(donantePage).toHaveURL(new RegExp(itemId));

          const acceso = donantePage
            .locator("form")
            .filter({ has: donantePage.getByRole("button", { name: /^ingresar$/i }) });

          await acceso.getByLabel("Correo").fill(email);
          await acceso.getByLabel("Contraseña").fill(CLAVE_PUBLICA);
          await acceso.getByRole("button", { name: /^ingresar$/i }).click();

          await expect(donantePage).toHaveURL(new RegExp(`/catalogo/${itemId}$`));
          await expect(donantePage.getByRole("heading", { name: titulo })).toBeVisible();
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
