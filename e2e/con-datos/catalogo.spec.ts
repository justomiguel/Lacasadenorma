import { expect, test } from "@playwright/test";

import { entrar, sufijoUnico } from "../soporte/backoffice";
import {
  articuloDelCatalogo,
  abrirItemDelCatalogo,
  completarTraer,
  confirmarLlegada,
  revertirDonacion,
  conItemPublicado,
  filaDelCatalogo,
  formularioDeTraer,
  ocultarItemSiExiste,
  vencerReserva,
} from "../soporte/catalogo";
import { correoDePrueba, crearCuenta, elegirAparecerEnCuenta } from "../soporte/cuentas";
import { esperarQueAparezca } from "../soporte/revalidar";

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
          await expect(
            paginaA.getByRole("link", { name: /mis donaciones|my donations/i }),
          ).toHaveAttribute("aria-current", "page");
          await expect(
            paginaA.getByRole("heading", { name: /lo que te anotaste/i }),
          ).toBeVisible();
          await expect(paginaA.getByRole("link", { name: titulo })).toHaveAttribute(
            "href",
            `/catalogo/${itemId}`,
          );
          await expect(paginaA.getByText(/vence el/i)).toBeVisible();
          await expect(paginaA.getByText(/ya está cubierto/i)).toBeVisible();

          await completarTraer(formularioDeTraer(articuloB));
          await expect(paginaB).toHaveURL(
            new RegExp(`/catalogo/${itemId}\\?conflicto=1$`),
          );
          await expect(paginaB.getByText(/alguien se adelantó/i).first()).toBeVisible();
          await expect(articuloB.getByText(/ya está cubierto/i)).toBeVisible();

          await paginaA.getByRole("button", { name: /cancelar esta reserva/i }).click();
          await expect(paginaA.getByText(/todavía no te anotaste/i)).toBeVisible();
          await expect(paginaA.getByText(/la cancelaste/i)).not.toBeVisible();
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
            donantePage.getByRole("link", { name: /mis donaciones|my donations/i }),
          ).toHaveAttribute("aria-current", "page");

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

  test("una donación parcial muestra el % de ese ítem y sigue ofreciendo donar", async ({
    request,
    browser,
  }, info) => {
    test.setTimeout(90_000);
    const sufijo = sufijoUnico(info.project.name);
    const titulo = `Bolsas a medias (${sufijo})`;
    const visible = `Ana Parcial ${sufijo}`;
    const email = correoDePrueba(info.project.name, "parcial");

    const staff = await browser.newContext();
    const staffPage = await staff.newPage();

    try {
      const donante = await browser.newContext();
      const pagina = await donante.newPage();

      try {
        await conItemPublicado(request, staffPage, titulo, 10, async () => {
          await crearCuenta(pagina, request, email);
          await pagina.goto("/catalogo");
          await abrirItemDelCatalogo(pagina, titulo);
          await completarTraer(formularioDeTraer(articuloDelCatalogo(pagina)), {
            quantity: 5,
          });
          await expect(pagina).toHaveURL(/\/cuenta$/);
          await elegirAparecerEnCuenta(pagina, visible);

          await confirmarLlegada(staffPage, titulo);
          await esperarQueAparezca(request, "/catalogo", "· 5 unidades");
          await esperarQueAparezca(request, "/quienes-ayudaron", "donó el 50%");

          await pagina.goto("/catalogo");
          const fila = filaDelCatalogo(pagina, titulo);

          await expect(fila.getByText(`${visible} · 5 unidades`)).toBeVisible();
          await expect(fila.getByRole("link", { name: /quiero donar/i })).toBeVisible();
          await expect(fila.getByText(/faltan 5 de 10/i)).toBeVisible();

          await pagina.goto("/quienes-ayudaron");
          const linea = pagina.locator("li").filter({ hasText: titulo });

          await expect(linea.getByRole("heading", { name: visible })).toBeVisible();
          await expect(
            linea.getByText(`${visible} donó el 50% de ${titulo}`),
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

  test("revertir un Donado lo saca del muro y devuelve las unidades", async ({
    request,
    browser,
  }, info) => {
    test.setTimeout(90_000);
    const sufijo = sufijoUnico(info.project.name);
    const titulo = `Para revertir (${sufijo})`;
    const visible = `Ana Revierte ${sufijo}`;
    const email = correoDePrueba(info.project.name, "revertir");

    const staff = await browser.newContext();
    const staffPage = await staff.newPage();

    try {
      const donante = await browser.newContext();
      const pagina = await donante.newPage();

      try {
        await conItemPublicado(request, staffPage, titulo, 2, async () => {
          await crearCuenta(pagina, request, email);
          await pagina.goto("/catalogo");
          await abrirItemDelCatalogo(pagina, titulo);
          await completarTraer(formularioDeTraer(articuloDelCatalogo(pagina)));
          await expect(pagina).toHaveURL(/\/cuenta$/);
          await elegirAparecerEnCuenta(pagina, visible);

          await confirmarLlegada(staffPage, titulo);
          await esperarQueAparezca(request, "/catalogo", "· 1 unidad");

          await revertirDonacion(staffPage, titulo);
          await esperarQueAparezca(request, "/catalogo", "Faltan 2");

          await pagina.goto("/catalogo");
          const fila = filaDelCatalogo(pagina, titulo);

          await expect(fila.getByText(/faltan 2/i)).toBeVisible();
          await expect(fila.getByText(visible)).toHaveCount(0);

          await pagina.goto("/quienes-ayudaron");
          await expect(pagina.getByRole("heading", { name: visible })).toHaveCount(0);
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
