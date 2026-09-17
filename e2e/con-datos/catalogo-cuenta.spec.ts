import { expect, test } from "@playwright/test";

import { entrar, sufijoUnico } from "../soporte/backoffice";
import {
  articuloDelCatalogo,
  abrirItemDelCatalogo,
  completarOfertaPorMail,
  completarOfertaPorTelefono,
  confirmarQueDonan,
  conItemPublicado,
  filaDelCatalogo,
  formularioDeTraer,
  idDeReservaActiva,
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
import { esperarQueAparezca } from "../soporte/revalidar";

/**
 * Quiero donar sin sesión: crear la cuenta, confirmar el correo, volver.
 *
 * Vive aparte de `catalogo.spec.ts` porque ese archivo ya estaba al tope de
 * `max-lines`. El ítem del fixture alcanza para el salto a crear; el alta
 * nueva necesita un ítem publicado propio para no ensuciar el listado.
 */

const ITEM_DEL_FIXTURE = "dddddddd-0000-4000-8000-000000000001";

test.describe("fase D · Quiero donar pide cuenta", () => {
  test("sin sesión, un correo lleva a crear una cuenta y explica por qué", async ({
    page,
  }) => {
    await page.goto(`/catalogo/${ITEM_DEL_FIXTURE}`);
    await completarOfertaPorMail(formularioDeTraer(articuloDelCatalogo(page)));

    await expect(page).toHaveURL(new RegExp(`/cuenta/crear\\?volver=`));
    await expect(page).toHaveURL(new RegExp(ITEM_DEL_FIXTURE));
    await expect(page.getByRole("heading", { name: /crear una cuenta/i })).toBeVisible();
    await expect(page.getByText(/dejaste un correo para donar/i)).toBeVisible();
    await expect(page.getByText(/confirmar el correo es la validación/i)).toBeVisible();
    await expect(page.getByLabel("Correo")).toHaveValue("ana@ejemplo.invalid");
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
          await completarOfertaPorMail(
            formularioDeTraer(articuloDelCatalogo(donantePage)),
            email,
          );

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
          await completarOfertaPorMail(formularioDeTraer(articulo), email);

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

  test("un teléfono reserva a su nombre y el sí del admin aparece en el muro", async ({
    request,
    browser,
  }, info) => {
    test.setTimeout(90_000);
    const sufijo = sufijoUnico(info.project.name);
    const titulo = `Chapas por teléfono (${sufijo})`;
    const telefono = `11 ${sufijo.slice(-8)}`;

    const staff = await browser.newContext();
    const staffPage = await staff.newPage();

    try {
      const donante = await browser.newContext();
      const donantePage = await donante.newPage();

      try {
        await conItemPublicado(request, staffPage, titulo, 1, async () => {
          await donantePage.goto("/catalogo");
          await abrirItemDelCatalogo(donantePage, titulo);
          await completarOfertaPorTelefono(
            formularioDeTraer(articuloDelCatalogo(donantePage)),
            telefono,
          );

          await expect(donantePage).toHaveURL(/reservado=1/);
          await expect(
            donantePage.getByRole("heading", { name: /gracias por donar/i }),
          ).toBeVisible();
          await expect(
            donantePage.getByText(/nos vamos a estar comunicando con vos/i),
          ).toBeVisible();
          await expect(donantePage).not.toHaveURL(/\/cuenta/);

          await donantePage.goto("/catalogo");
          await expect(filaDelCatalogo(donantePage, titulo)).toContainText(
            /ya está cubierto/i,
          );
          await expect(filaDelCatalogo(donantePage, titulo)).not.toContainText("Ana");

          const salir = staffPage
            .locator("#contenido")
            .getByRole("button", { name: /cerrar sesión/i });

          if (await salir.isVisible()) {
            await salir.click();
            await expect(staffPage).toHaveURL(/\/admin\/login/);
          }

          await entrar(staffPage, "admin");
          await staffPage.goto("/admin/donaciones");
          const aviso = staffPage
            .getByRole("region", { name: /avisos por teléfono/i })
            .locator("li")
            .filter({ hasText: titulo });

          await expect(aviso).toBeVisible();
          await expect(aviso).toContainText("Ana");
          await expect(aviso).toContainText(telefono);

          const pledgeId = await idDeReservaActiva(request, titulo);

          await staffPage.goto(`/admin/donaciones/decidir/${pledgeId}/si`);
          await expect(staffPage.getByLabel(/aceptó aparecer con nombre/i)).toBeVisible();
          await confirmarQueDonan(staffPage, { aparecer: "Ana" });
          await expect(staffPage).toHaveURL(/\/admin\/donaciones/);

          await esperarQueAparezca(request, "/quienes-ayudaron", titulo);
          await donantePage.goto("/quienes-ayudaron");
          const linea = donantePage.locator("li").filter({ hasText: titulo });
          await expect(linea.getByRole("heading", { name: "Ana" })).toBeVisible();
          await expect(linea.getByRole("time")).toBeVisible();
        });
      } finally {
        await donante.close();
      }
    } finally {
      await ocultarItemSiExiste(staffPage.request, titulo);
      await staff.close();
    }
  });

  test("el no del admin suelta la reserva del teléfono", async ({
    request,
    browser,
  }, info) => {
    test.setTimeout(90_000);
    const sufijo = sufijoUnico(info.project.name);
    const titulo = `Chapas sueltas (${sufijo})`;
    const telefono = `11 ${sufijo.slice(-8)}`;

    const staff = await browser.newContext();
    const staffPage = await staff.newPage();

    try {
      const donante = await browser.newContext();
      const donantePage = await donante.newPage();

      try {
        await conItemPublicado(request, staffPage, titulo, 1, async (itemId) => {
          await donantePage.goto("/catalogo");
          await abrirItemDelCatalogo(donantePage, titulo);
          await completarOfertaPorTelefono(
            formularioDeTraer(articuloDelCatalogo(donantePage)),
            telefono,
          );
          await expect(donantePage).toHaveURL(/reservado=1/);
          await expect(
            donantePage.getByRole("heading", { name: /gracias por donar/i }),
          ).toBeVisible();

          const salir = staffPage
            .locator("#contenido")
            .getByRole("button", { name: /cerrar sesión/i });

          if (await salir.isVisible()) {
            await salir.click();
            await expect(staffPage).toHaveURL(/\/admin\/login/);
          }

          await entrar(staffPage, "admin");
          const pledgeId = await idDeReservaActiva(request, titulo);

          await staffPage.goto(`/admin/donaciones/decidir/${pledgeId}/no`);
          await staffPage.getByRole("button", { name: /no: soltar la reserva/i }).click();
          await expect(staffPage).toHaveURL(/\/admin\/donaciones/);

          await esperarQueAparezca(request, `/catalogo/${itemId}`, "Faltan 1 de 1");
          await expect(async () => {
            await donantePage.goto("/catalogo");
            await expect(filaDelCatalogo(donantePage, titulo)).toContainText(
              /faltan 1 de 1/i,
            );
            await expect(filaDelCatalogo(donantePage, titulo)).not.toContainText(
              /ya está cubierto/i,
            );
          }).toPass({ timeout: 15_000 });
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
