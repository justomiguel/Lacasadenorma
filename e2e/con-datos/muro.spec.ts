import { expect, test } from "@playwright/test";

import { apiLocal, sufijoUnico, tokenDe } from "../soporte/backoffice";
import {
  articuloDelCatalogo,
  abrirItemDelCatalogo,
  cargarItemPublicado,
  confirmarLlegada,
  formularioDeTraer,
  habilitarCuenta,
  idDeItem,
  ocultarItemSiExiste,
} from "../soporte/catalogo";
import { correoDePrueba, crearCuenta } from "../soporte/cuentas";
import { PAGINAS_PUBLICAS } from "../soporte/paginas";

/**
 * El muro: quién ayudó aparece; quién no eligió aparecer, no aparece nunca.
 *
 * La prueba independiente de la fase E: una donación con nombre se ve; una
 * anónima no aparece en ningún HTML servido, ni el correo, ni el UUID de la
 * cuenta (SC-204).
 */

test.describe("fase E · muro", () => {
  test("una entrega con nombre aparece; una anónima no aparece en ningún HTML público", async ({
    request,
    browser,
  }, info) => {
    test.setTimeout(90_000);
    const sufijo = sufijoUnico(info.project.name);
    const titulo = `Puerta de quien ayuda (${sufijo})`;
    const visible = `Vecina Visible ${sufijo}`;
    const oculto = `Nombre Que No Debe Publicarse ${sufijo}`;
    const emailVisible = correoDePrueba(info.project.name, "muro-si");
    const emailOculto = correoDePrueba(info.project.name, "muro-no");

    const staff = await browser.newContext();
    const staffPage = await staff.newPage();

    try {
      await cargarItemPublicado(staffPage, titulo, 2);

      const donanteSi = await browser.newContext();
      const paginaSi = await donanteSi.newPage();
      const donanteNo = await browser.newContext();
      const paginaNo = await donanteNo.newPage();

      try {
        await crearCuenta(paginaSi, request, emailVisible);
        await crearCuenta(paginaNo, request, emailOculto);
        await habilitarCuenta(staffPage, emailVisible);
        await habilitarCuenta(staffPage, emailOculto);

        await paginaSi.goto("/catalogo");
        await abrirItemDelCatalogo(paginaSi, titulo);
        const articuloSi = articuloDelCatalogo(paginaSi);
        await expect(articuloSi).toHaveCount(1);
        const traerSi = formularioDeTraer(articuloSi);
        await traerSi.getByLabel(/quiero aparecer con nombre/i).check();
        await traerSi.getByLabel(/nombre para mostrar/i).fill(visible);
        await traerSi.getByRole("button", { name: /quiero donar/i }).click();
        await expect(paginaSi).toHaveURL(/\/cuenta$/);

        await paginaNo.goto("/catalogo");
        await abrirItemDelCatalogo(paginaNo, titulo);
        const articuloNo = articuloDelCatalogo(paginaNo);
        await expect(articuloNo).toHaveCount(1);
        const traerNo = formularioDeTraer(articuloNo);
        await traerNo.getByLabel(/nombre para mostrar/i).fill(oculto);
        await traerNo.getByRole("button", { name: /quiero donar/i }).click();
        await expect(paginaNo).toHaveURL(/\/cuenta$/);

        await confirmarLlegada(staffPage, titulo);
        await confirmarLlegada(staffPage, titulo);

        await paginaSi.goto("/quienes-ayudaron");
        await expect(paginaSi.getByRole("heading", { name: visible })).toBeVisible();
        await expect(paginaSi.getByText(oculto)).toHaveCount(0);

        const token = await tokenDe(request, "admin");
        const respuesta = await request.get(
          `${apiLocal()}/rest/v1/donation_pledges?select=user_id,donor_display_name&item_id=eq.${await idDeItem(request, titulo)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        expect(respuesta.status()).toBe(200);

        const filas = (await respuesta.json()) as {
          user_id: string | null;
          donor_display_name: string | null;
        }[];
        const ids = filas
          .map((fila) => fila.user_id)
          .filter((id): id is string => typeof id === "string");

        expect(ids.length).toBeGreaterThan(0);

        for (const pagina of PAGINAS_PUBLICAS) {
          const html = await (await request.get(pagina.path)).text();

          expect(html, `${pagina.path} filtró el correo de quien aparece`).not.toContain(
            emailVisible,
          );
          expect(
            html,
            `${pagina.path} filtró el correo de quien no aparece`,
          ).not.toContain(emailOculto);
          expect(html, `${pagina.path} filtró el nombre anónimo`).not.toContain(oculto);

          for (const id of ids) {
            expect(html, `${pagina.path} filtró el UUID de cuenta`).not.toContain(id);
          }
        }

        const muro = await (await request.get("/quienes-ayudaron")).text();

        expect(muro).toContain(visible);
      } finally {
        await donanteSi.close();
        await donanteNo.close();
      }
    } finally {
      await ocultarItemSiExiste(staffPage.request, titulo);
      await staff.close();
    }
  });
});
