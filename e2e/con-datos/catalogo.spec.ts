import { expect, test } from "@playwright/test";

import { entrar, sufijoUnico } from "../soporte/backoffice";
import {
  articuloDelCatalogo,
  conItemPublicado,
  habilitarCuenta,
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
 * ítem sin foto en el fixture rompería el conteo exacto de huecos de
 * `revision-visual.spec.ts`.
 */

test.describe("fase D · reservas", () => {
  test("pedir donar sin sesión vuelve al mismo ítem después de ingresar", async ({
    request,
    browser,
  }, info) => {
    // Alta, salida, catálogo e ingreso: 45 s cortaba en CI con el formulario
    // de redes debajo, y el ítem sin foto quedaba publicado para la revisión visual.
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
          const articulo = articuloDelCatalogo(donantePage, titulo);

          await expect(articulo).toHaveCount(1);
          await expect(articulo).toBeVisible();
          await articulo
            .getByRole("button", { name: /anotarme para traer esto/i })
            .click();

          await expect(donantePage).toHaveURL(new RegExp(`/cuenta/ingresar\\?volver=`));
          await expect(donantePage).toHaveURL(new RegExp(itemId));

          const acceso = donantePage
            .locator("form")
            .filter({ has: donantePage.getByRole("button", { name: /^ingresar$/i }) });

          await acceso.getByLabel("Correo").fill(email);
          await acceso.getByLabel("Contraseña").fill(CLAVE_PUBLICA);
          await acceso.getByRole("button", { name: /^ingresar$/i }).click();

          await expect(donantePage).toHaveURL(new RegExp(`/catalogo\\?item=${itemId}$`));
          await expect(articulo.getByRole("heading", { name: titulo })).toBeVisible();
        });
      } finally {
        await donante.close();
      }
    } finally {
      await staff.close();
    }
  });

  test("reservar, conflicto cuando alguien se adelanta, y cancelar", async ({
    request,
    browser,
  }, info) => {
    // Dos altas del público, dos habilitaciones y el cruce: el muro ya pide 90 s
    // para el mismo armado. 45 s cortaba en CI con el navegador ya cerrado.
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

          await habilitarCuenta(staffPage, emailA);
          await habilitarCuenta(staffPage, emailB);

          // Las dos personas tienen que ver el formulario **antes** de que A
          // reserve: un ítem cubierto se sigue mostrando, pero ya no se ofrece
          // (FR-210). Si B entra después, no hay botón que apretar.
          await paginaA.goto("/catalogo");
          await paginaB.goto("/catalogo");

          const articuloA = articuloDelCatalogo(paginaA, titulo);
          const articuloB = articuloDelCatalogo(paginaB, titulo);
          const reservar = /anotarme para traer esto/i;

          await expect(articuloA).toHaveCount(1);
          await expect(articuloB).toHaveCount(1);

          await expect(articuloA.getByRole("button", { name: reservar })).toBeVisible();
          await expect(articuloB.getByRole("button", { name: reservar })).toBeVisible();

          await articuloA.getByRole("button", { name: reservar }).click();
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

          await articuloB.getByRole("button", { name: reservar }).click();
          await expect(paginaB).toHaveURL(new RegExp(`/catalogo\\?conflicto=${itemId}$`));
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
          await habilitarCuenta(staffPage, email);

          await donantePage.goto("/catalogo");
          const articulo = articuloDelCatalogo(donantePage, titulo);
          await expect(articulo).toHaveCount(1);
          await articulo
            .getByRole("button", { name: /anotarme para traer esto/i })
            .click();
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
          await expect(articuloDelCatalogo(donantePage, titulo)).toHaveCount(1);
          await expect(
            articuloDelCatalogo(donantePage, titulo).getByText(/faltan 1/i),
          ).toBeVisible();
        });
      } finally {
        await donante.close();
      }
    } finally {
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
});
