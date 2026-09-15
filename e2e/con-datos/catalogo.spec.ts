import { expect, test } from "@playwright/test";

import { entrar, sufijoUnico } from "../soporte/backoffice";
import {
  articuloDelCatalogo,
  abrirItemDelCatalogo,
  completarTraer,
  conItemPublicado,
  filaDelCatalogo,
  formularioDeTraer,
  ocultarItemSiExiste,
  vencerReserva,
} from "../soporte/catalogo";
import {
  CLAVE_PUBLICA,
  correoDePrueba,
  crearCuenta,
  cerrarSesion,
} from "../soporte/cuentas";

/**
 * Reservar un ítem, el conflicto, cancelar y el vencimiento (fase D).
 *
 * Cada prueba crea su ítem por el backoffice y lo despublica al terminar: un
 * ítem de prueba extra ensucia `/catalogo` para la revisión visual.
 */

const ITEM_DEL_FIXTURE = "dddddddd-0000-4000-8000-000000000001";

test.describe("fase D · reservas", () => {
  test("la ficha dice que el monto es estimado y se puede cubrir por Mercado Pago o PayPal", async ({
    page,
  }) => {
    await page.goto(`/catalogo/${ITEM_DEL_FIXTURE}`);

    await expect(page.getByRole("heading", { name: /cómo donar esto/i })).toBeVisible();
    await expect(page.getByRole("img", { name: /foto ilustrativa/i })).toBeVisible();
    await expect(page.getByText(/solamente ilustrativa/i)).toBeVisible();
    await expect(page.getByText(/no representa el objeto real/i)).toBeVisible();
    await expect(page.getByText(/estimado, no un precio fijo/i).first()).toBeVisible();
    await expect(
      page.getByText(/traer el mismo bien o cubrirlo con plata/i),
    ).toBeVisible();
    await expect(page.getByRole("radio", { name: /traer el mismo bien/i })).toBeChecked();
    await expect(page.locator("[data-pay=transfer]")).toBeHidden();
    await expect(page.locator("[data-pay=mercadopago]")).toBeHidden();
    await expect(page.locator("[data-pay=paypal]")).toBeHidden();
    await expect(page.getByLabel(/^nombre$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /quiero donar/i })).toBeVisible();

    await page.getByRole("radio", { name: /^transferencia$/i }).click();
    await expect(page.locator("[data-pay=transfer]")).toBeVisible();
    await expect(page.locator("[data-pay=mercadopago]")).toBeHidden();
    await expect(page.getByText(/^cbu$/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /quiero donar/i })).toBeHidden();
    await expect(page.getByText(/no hace falta cuenta ni anotarse/i)).toBeVisible();

    await page.getByRole("radio", { name: /mercado pago/i }).click();
    await expect(page.locator("[data-pay=mercadopago]")).toBeVisible();
    await expect(page.locator("[data-pay=transfer]")).toBeHidden();
    await expect(page.getByLabel(/sumar más/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /continuar con mercado pago/i }).first(),
    ).toBeVisible();

    await page.getByLabel(/sumar más/i).fill("1000");
    await expect(page.getByText(/total a enviar por mercado pago/i)).toBeVisible();

    await page.getByRole("radio", { name: /paypal/i }).click();
    await expect(page.locator("[data-pay=paypal]")).toBeVisible();
    await expect(page.locator("[data-pay=mercadopago]")).toBeHidden();
    await expect(
      page.getByRole("link", { name: /continuar con paypal/i }).first(),
    ).toBeVisible();
  });

  test("el listado es una tabla en teléfono, con estimado y quiero donar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/catalogo");

    await expect(
      page.getByRole("columnheader", { name: /estimado por unidad/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /^donar$/i }).first(),
    ).toBeVisible();

    const fila = filaDelCatalogo(page, "Chapas del techo (datos de desarrollo)");

    await expect(
      fila.getByRole("img", { name: /foto ilustrativa de chapas/i }),
    ).toBeVisible();
    await expect(fila.getByRole("link", { name: /quiero donar/i })).toBeVisible();
    await expect(fila.getByText("$ 150.000")).toBeVisible();
    await expect(fila.getByText("$ 1.050.000")).toBeVisible();

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(
      Math.max(0, desborde),
      "la tabla se desplaza adentro, la página no desborda",
    ).toBe(0);
  });

  test("pedir donar sin sesión vuelve al mismo ítem después de ingresar", async ({
    request,
    browser,
  }, info) => {
    // Alta, salida, catálogo e ingreso: 45 s cortaba en CI con el formulario
    // de redes debajo.
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
          await articulo.getByRole("button", { name: /quiero donar/i }).click();

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

  test("reservar, conflicto cuando alguien se adelanta, y cancelar", async ({
    request,
    browser,
  }, info) => {
    // Dos altas del público y el cruce: el muro ya pide 90 s para el mismo
    // armado. Confirmar el correo alcanza (ADR-046); no se espera habilitación.
    test.setTimeout(90_000);
    const sufijo = sufijoUnico(info.project.name);
    const titulo = `Última bolsa (${sufijo})`;
    const emailA = correoDePrueba(info.project.name, "reserva-a");
    const emailB = correoDePrueba(info.project.name, "reserva-b");

    const staff = await browser.newContext();
    const staffPage = await staff.newPage();

    try {
      const contextoA = await browser.newContext();
      const paginaA = await contextoA.newPage();
      const contextoB = await browser.newContext();
      const paginaB = await contextoB.newPage();

      try {
        await conItemPublicado(request, staffPage, titulo, 1, async (itemId) => {
          await crearCuenta(paginaA, request, emailA);
          await crearCuenta(paginaB, request, emailB);

          // ADR-046: confirmar el correo alcanza. No se espera habilitación.

          // Las dos personas tienen que ver el formulario **antes** de que A
          // reserve: un ítem cubierto se sigue mostrando, pero ya no se ofrece
          // (FR-210). Si B entra después, no hay botón que apretar.
          await paginaA.goto("/catalogo");
          await abrirItemDelCatalogo(paginaA, titulo);
          await paginaB.goto("/catalogo");
          await abrirItemDelCatalogo(paginaB, titulo);

          const articuloA = articuloDelCatalogo(paginaA);
          const articuloB = articuloDelCatalogo(paginaB);
          const reservar = /quiero donar/i;

          await expect(articuloA).toHaveCount(1);
          await expect(articuloB).toHaveCount(1);

          await expect(articuloA.getByRole("button", { name: reservar })).toBeVisible();
          await expect(articuloB.getByRole("button", { name: reservar })).toBeVisible();

          await completarTraer(formularioDeTraer(articuloA));
          await expect(paginaA).toHaveURL(/\/cuenta$/);
          await expect(paginaA.getByRole("tab", { name: /reservas/i })).toHaveAttribute(
            "aria-selected",
            "true",
          );
          await expect(
            paginaA.getByRole("heading", { name: /lo que te anotaste/i }),
          ).toBeVisible();
          await expect(paginaA.getByText(titulo)).toBeVisible();
          await expect(paginaA.getByText(/vence el/i)).toBeVisible();

          await completarTraer(formularioDeTraer(articuloB));
          await expect(paginaB).toHaveURL(
            new RegExp(`/catalogo/${itemId}\\?conflicto=1$`),
          );
          await expect(paginaB.getByText(/alguien se adelantó/i).first()).toBeVisible();
          await expect(articuloB.getByText(/ya está cubierto/i)).toBeVisible();

          await paginaA.getByRole("button", { name: /cancelar esta reserva/i }).click();
          await expect(paginaA.getByText(/la cancelaste/i)).toBeVisible();
        });
      } finally {
        await contextoA.close();
        await contextoB.close();
      }
    } finally {
      await ocultarItemSiExiste(staffPage.request, titulo);
      await staff.close();
    }
  });

  test("una reserva vencida vuelve las unidades al listado", async ({
    request,
    browser,
  }, info) => {
    const sufijo = sufijoUnico(info.project.name);
    const titulo = `Cal (${sufijo})`;
    const email = correoDePrueba(info.project.name, "vence");

    const staff = await browser.newContext();
    const staffPage = await staff.newPage();

    try {
      const donante = await browser.newContext();
      const donantePage = await donante.newPage();

      try {
        await conItemPublicado(request, staffPage, titulo, 1, async () => {
          await crearCuenta(donantePage, request, email);
          await donantePage.goto("/catalogo");
          await abrirItemDelCatalogo(donantePage, titulo);
          const articulo = articuloDelCatalogo(donantePage);
          await expect(articulo).toHaveCount(1);
          await completarTraer(formularioDeTraer(articulo));
          await expect(donantePage).toHaveURL(/\/cuenta$/);
          await expect(
            donantePage.getByRole("tab", { name: /reservas/i }),
          ).toHaveAttribute("aria-selected", "true");

          const pledgeId = await donantePage
            .locator('input[name="pledgeId"]')
            .inputValue();

          await vencerReserva(request, pledgeId);

          await donantePage.goto("/cuenta");
          await expect(donantePage.getByText(/venció el/i)).toBeVisible();

          await donantePage.goto("/catalogo");
          await expect(filaDelCatalogo(donantePage, titulo)).toHaveCount(1);
          await expect(
            filaDelCatalogo(donantePage, titulo).getByText(/faltan 1/i),
          ).toBeVisible();
        });
      } finally {
        await donante.close();
      }
    } finally {
      await ocultarItemSiExiste(staffPage.request, titulo);
      await staff.close();
    }
  });

  test("un editor no entra a /admin/donaciones", async ({ page }) => {
    await entrar(page, "editor");
    await page.goto("/admin/donaciones");

    await expect(page).toHaveURL(/\/admin\/sin-permiso/);
    await expect(
      page.getByRole("heading", { level: 1, name: /no es para tu rol/i }),
    ).toBeVisible();
  });

  test("la palanca de revalidar no acepta una URL absoluta", async ({ request }) => {
    const respuesta = await request.post("/e2e/revalidar", {
      data: { paths: ["https://evil.example/"] },
    });

    expect(respuesta.status()).toBe(400);
  });
});
