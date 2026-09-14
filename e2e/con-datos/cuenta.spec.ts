import { expect, test } from "@playwright/test";

import { apiLocal } from "../soporte/backoffice";
import {
  CLAVE_PUBLICA,
  correoDePrueba,
  crearCuenta,
  enlacePendiente,
  urlDelEnlace,
} from "../soporte/cuentas";
import { VIEWPORT_MINIMO } from "../soporte/paginas";

/**
 * El alta de una cuenta del público, de punta a punta (fase A de la feature 002).
 *
 * Lo que se verifica acá no es que los formularios anden: eso lo diría cualquier
 * prueba. Es que las tres respuestas **deliberadamente empobrecidas** sigan
 * empobrecidas, que es lo que se rompe solo cuando alguien mejora un mensaje de
 * error con buena intención.
 *
 * 1. Un alta sobre una dirección que ya tiene cuenta contesta lo mismo que una
 *    nueva. Si contestara "ese correo ya está registrado", el formulario público
 *    pasaría a servir para averiguar quién tiene cuenta acá (amenaza S1).
 * 2. Recuperar contesta lo mismo exista o no la cuenta, y la pantalla **explica**
 *    por qué, porque un "listo" seco es indistinguible de un oráculo.
 * 3. Entrar no dice cuál de los dos campos falló.
 *
 * Y la cuarta, que es la que ADR-027 vino a garantizar: una cuenta del público es
 * una cuenta **sin rol**, y con ella `/admin` termina en `/admin/sin-permiso`
 * (FR-206). La matriz de pgTAP ya prueba que además no ve ni escribe nada por la
 * base; esto prueba que la interfaz tampoco la deja entrar.
 */

test.describe("fase A · la cuenta del público", () => {
  test("el alta: del formulario al correo, y del correo a la sesión", async ({
    page,
    request,
  }, info) => {
    const email = correoDePrueba(info.project.name, "alta");

    await page.goto("/cuenta/crear");

    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill(CLAVE_PUBLICA);
    await page.getByRole("button", { name: /crear la cuenta/i }).click();

    // El formulario desaparece: volver a enviarlo no es lo que corresponde hacer
    // ahora, y dejarlo debajo del aviso invita justamente a eso.
    await expect(page.getByRole("heading", { name: /revisá tu correo/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /crear la cuenta/i })).toHaveCount(0);

    // Sin abrir el enlace no hay sesión, y tampoco se entra con la contraseña. Es la
    // implicación entera de `enable_confirmations = true`: tener sesión implica
    // correo confirmado, y por eso ninguna otra pantalla tiene que verificarlo.
    const sinConfirmar = await request.post(
      `${apiLocal()}/auth/v1/token?grant_type=password`,
      { data: { email, password: CLAVE_PUBLICA } },
    );

    expect(
      sinConfirmar.status(),
      "una cuenta sin confirmar no tendría que poder abrir sesión",
    ).toBe(400);

    const enlace = await enlacePendiente(request, email);

    await page.goto(urlDelEnlace(enlace));

    await expect(page).toHaveURL(/\/cuenta$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /tu cuenta/i }),
    ).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    // El anonimato es el valor por defecto y la casilla lo refleja. Una casilla que
    // **concede** algo no puede venir marcada; ésta niega, y por eso sí (FR-225).
    await expect(page.getByLabel(/prefiero no aparecer/i)).toBeChecked();
    await expect(page.getByText(/no aparecerías/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /tu foto/i })).toBeVisible();
    await expect(page.getByLabel(/subir una foto/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /^contraseña$/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /guardar la contraseña/i }),
    ).toBeVisible();
  });

  test("con sesión, el menú muestra la cuenta y cómo salir", async ({
    page,
    request,
  }, info) => {
    const email = correoDePrueba(info.project.name, "menu");

    await crearCuenta(page, request, email);
    await page.getByLabel(/nombre para mostrar/i).fill("Vecina de la cuadra");
    await page.getByLabel(/prefiero no aparecer/i).uncheck();
    await page.getByRole("button", { name: /^guardar$/i }).click();
    await expect(page.getByText(/^guardado/i)).toBeVisible();

    await page.setViewportSize(VIEWPORT_MINIMO);
    const sesion = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/cuenta/sesion" && response.ok(),
    );
    await page.goto("/");
    await sesion;
    await page.getByRole("button", { name: /abrir el menú/i }).click();

    const menu = page.getByRole("dialog");

    await expect(menu.getByText("Vecina de la cuadra")).toBeVisible();
    await expect(menu.getByText(email)).toBeVisible();
    await expect(menu.getByRole("link", { name: /tu cuenta/i })).toBeVisible();
    await expect(menu.getByRole("button", { name: /cerrar sesión/i })).toBeVisible();
    await expect(menu.getByRole("link", { name: /^ingresar$/i })).toHaveCount(0);

    await menu.getByRole("button", { name: /cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/cuenta\/ingresar/);
  });

  test("el mismo enlace no sirve dos veces", async ({ page, request }, info) => {
    const email = correoDePrueba(info.project.name, "enlace-usado");

    await page.goto("/cuenta/crear");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill(CLAVE_PUBLICA);
    await page.getByRole("button", { name: /crear la cuenta/i }).click();
    await expect(page.getByRole("heading", { name: /revisá tu correo/i })).toBeVisible();

    const enlace = await enlacePendiente(request, email);

    await page.goto(urlDelEnlace(enlace));
    await expect(page).toHaveURL(/\/cuenta$/);

    await page.context().clearCookies();
    await page.goto(urlDelEnlace(enlace));

    // Un token quemado, uno vencido y uno inventado se ven igual desde afuera: los
    // tres terminan en la pantalla de acceso con el mismo aviso.
    await expect(page).toHaveURL(/\/cuenta\/ingresar\?aviso=linkExpired$/);
    await expect(page.getByText(/ya venció o ya se usó/i)).toBeVisible();
  });

  test("una dirección ya registrada no se distingue de una nueva", async ({
    page,
    request,
  }, info) => {
    const email = correoDePrueba(info.project.name, "repetida");

    await crearCuenta(page, request, email);
    await page.context().clearCookies();

    await page.goto("/cuenta/crear");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill("una-clave-completamente-otra");
    await page.getByRole("button", { name: /crear la cuenta/i }).click();

    await expect(
      page.getByRole("heading", { name: /revisá tu correo/i }),
      "un alta sobre una dirección registrada tiene que verse igual que una nueva",
    ).toBeVisible();

    // Y no le cambió la contraseña a nadie: la original sigue siendo la que entra.
    const conLaOriginal = await request.post(
      `${apiLocal()}/auth/v1/token?grant_type=password`,
      { data: { email, password: CLAVE_PUBLICA } },
    );

    expect(conLaOriginal.status()).toBe(200);
  });

  test("entrar mal no dice cuál de los dos campos falló", async ({ page }, info) => {
    const inexistente = correoDePrueba(info.project.name, "no-existe");

    await page.goto("/cuenta/ingresar");
    await page.getByLabel("Correo").fill(inexistente);
    await page.getByLabel("Contraseña").fill(CLAVE_PUBLICA);
    await page.getByRole("button", { name: /^ingresar$/i }).click();

    // El alerta se busca dentro del formulario: Next monta su propio
    // `role="alert"` vacío para anunciar los cambios de ruta, y sin acotar la
    // búsqueda el localizador resuelve a dos elementos.
    await expect(page.locator("form").getByRole("alert")).toHaveText(
      /esos datos no coinciden con ninguna cuenta/i,
    );
  });

  test("recuperar el acceso, y que la respuesta no revele nada", async ({
    page,
    request,
  }, info) => {
    const email = correoDePrueba(info.project.name, "recupera");

    await crearCuenta(page, request, email);
    await page.context().clearCookies();

    // Se compara la pantalla **entera** y no sólo el título: lo que no puede
    // aparecer es una diferencia de cualquier tipo entre los dos casos, y un
    // "no encontramos esa dirección" agregado abajo pasaría una comparación de
    // títulos sin despeinarse.
    const pedirEnlace = async (direccion: string): Promise<string> => {
      await page.goto("/cuenta/recuperar");
      await page.getByLabel("Correo").fill(direccion);
      await page.getByRole("button", { name: /mandar el enlace/i }).click();
      await expect(page.getByRole("heading", { name: /^listo$/i })).toBeVisible();

      return page.locator("#contenido").innerText();
    };

    const sinCuenta = await pedirEnlace(correoDePrueba(info.project.name, "fantasma"));
    const conCuenta = await pedirEnlace(email);

    expect(
      conCuenta,
      "la recuperación tiene que contestar lo mismo exista o no la cuenta",
    ).toBe(sinCuenta);

    const enlace = await enlacePendiente(request, email);

    expect(enlace.type).toBe("recovery");

    await page.goto(urlDelEnlace(enlace));
    await expect(page).toHaveURL(/\/cuenta\/clave$/);

    const nueva = "otra-clave-de-quien-dona";

    await page.getByLabel("Contraseña nueva").fill(nueva);
    await page.getByLabel("Repetila").fill(nueva);
    await page.getByRole("button", { name: /guardar la contraseña/i }).click();

    await expect(page).toHaveURL(/\/cuenta$/);

    const conLaNueva = await request.post(
      `${apiLocal()}/auth/v1/token?grant_type=password`,
      { data: { email, password: nueva } },
    );

    expect(conLaNueva.status(), "la contraseña nueva tiene que entrar").toBe(200);
  });

  test("sin la sesión del correo, /cuenta/clave no muestra un formulario", async ({
    page,
  }) => {
    await page.goto("/cuenta/clave");

    await expect(
      page.getByRole("heading", { level: 1, name: /este enlace no sirve para esto/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /guardar la contraseña/i }),
    ).toHaveCount(0);
  });

  test("sin sesión, /cuenta manda a la pantalla de acceso", async ({ page }) => {
    await page.goto("/cuenta");

    await expect(page).toHaveURL(/\/cuenta\/ingresar$/);
  });

  test("una cuenta del público en /admin termina en /admin/sin-permiso", async ({
    page,
    request,
  }, info) => {
    const email = correoDePrueba(info.project.name, "sin-rol");

    await crearCuenta(page, request, email);

    // La sesión es real y está abierta: lo que falta no es el token sino el rol. Es
    // la distinción entera de ADR-027 —`authenticated` dejó de significar "de
    // confianza"— vista desde la interfaz.
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/sin-permiso$/);

    // Y ninguna pantalla del backoffice se abre por su cuenta.
    for (const ruta of ["/admin/aportes", "/admin/gastos", "/admin/cuentas"]) {
      await page.goto(ruta);
      await expect(page, `${ruta} se abrió para una cuenta sin rol`).toHaveURL(
        /\/admin\/sin-permiso$/,
      );
    }
  });

  test("borrar la cuenta la borra, y después ya no entra", async ({
    page,
    request,
  }, info) => {
    const email = correoDePrueba(info.project.name, "se-va");

    await crearCuenta(page, request, email);

    await page.getByLabel(/para confirmar, escribí/i).fill("BORRAR");
    await page.getByRole("button", { name: /^borrar la cuenta$/i }).click();

    await expect(page).toHaveURL(/\/$/);

    const despues = await request.post(
      `${apiLocal()}/auth/v1/token?grant_type=password`,
      { data: { email, password: CLAVE_PUBLICA } },
    );

    expect(despues.status(), "la cuenta borrada no tendría que poder abrir sesión").toBe(
      400,
    );
  });
});
