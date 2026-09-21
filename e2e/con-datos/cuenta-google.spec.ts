import { expect, test } from "@playwright/test";

import { apiLocal } from "../soporte/backoffice";
import {
  CLAVE_PUBLICA,
  abrirSeccionDeCuenta,
  cerrarSesion,
  correoDePrueba,
  crearCuenta,
} from "../soporte/cuentas";
import { entrarConGoogle } from "../soporte/google";

/**
 * El alta y el ingreso con Google, de punta a punta (ADR-039, SC-214).
 *
 * El hop real contra accounts.google.com no corre acá: el harness emula
 * `/authorize` y el canje PKCE. Lo que sí se recorre es el camino de la
 * persona: el botón, el callback propio, la sesión, el perfil `pending` y
 * anónimo, la unificación de un correo que ya existía, y el caso sin
 * dirección. La foto de la red se afirma en unidad: el CDN de Google no
 * contesta desde este proceso.
 */

const ITEM_DEL_FIXTURE = "dddddddd-0000-4000-8000-000000000001";

test.describe("fase A · entrar con Google", () => {
  test("del botón a la sesión, anónima y pendiente", async ({ page }, info) => {
    const email = correoDePrueba(info.project.name, "google-alta");

    await entrarConGoogle(page, {
      identidad: { email, nombre: "Quien entra con google" },
    });

    await expect(
      page.getByRole("heading", { name: /cómo querés aparecer/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /^tu cuenta$/i })).toHaveCount(0);
    await expect(page.getByText(/el equipo está revisando tu pedido/i)).toHaveCount(0);
    await expect(page.getByLabel(/prefiero no aparecer/i)).toBeChecked();
    await expect(page.getByText(/no aparecerías/i)).toBeVisible();
    await expect(page.getByLabel(/nombre para mostrar/i)).toHaveValue(
      /quien entra con google/i,
    );

    await abrirSeccionDeCuenta(page, /acceso/i);
    await expect(page.getByRole("heading", { name: /^contraseña$|^password$/i })).toBeVisible();
  });

  test("también se entra desde la pantalla de ingresar", async ({ page }, info) => {
    const email = correoDePrueba(info.project.name, "google-ingresar");

    await entrarConGoogle(page, {
      desde: "ingresar",
      identidad: { email, nombre: "Vecina con Gmail" },
    });

    await expect(page.getByLabel(/nombre para mostrar/i)).toHaveValue(
      /vecina con gmail/i,
    );
    await abrirSeccionDeCuenta(page, /acceso/i);
    await expect(page.getByRole("heading", { name: /^contraseña$|^password$/i })).toBeVisible();
  });

  test("un correo que ya tenía cuenta no crea una segunda", async ({
    page,
    request,
  }, info) => {
    const email = correoDePrueba(info.project.name, "google-une");

    await crearCuenta(page, request, email);
    await expect(page).toHaveURL(/\/cuenta$/);
    await page.context().clearCookies();

    await entrarConGoogle(page, {
      desde: "ingresar",
      identidad: { email, nombre: "Quien entra con google" },
    });

    await expect(page.getByLabel(/nombre para mostrar/i)).toHaveValue(
      /quien entra con google/i,
    );
    await abrirSeccionDeCuenta(page, /acceso/i);
    await expect(page.getByRole("heading", { name: /^contraseña$|^password$/i })).toBeVisible();
  });

  test("un nombre que la persona ya eligió no se pisa", async ({
    page,
    request,
  }, info) => {
    const email = correoDePrueba(info.project.name, "google-respeta");

    await crearCuenta(page, request, email);
    await page.getByLabel(/nombre para mostrar/i).fill("Vecina de la cuadra");
    await page.getByRole("button", { name: /^guardar$/i }).click();
    await expect(page.getByText(/^guardado/i)).toBeVisible();
    await page.context().clearCookies();

    await entrarConGoogle(page, {
      desde: "ingresar",
      identidad: { email, nombre: "Nombre de Google" },
    });

    await expect(page.getByLabel(/nombre para mostrar/i)).toHaveValue(
      "Vecina de la cuadra",
    );
  });

  test("sin correo se cierra la sesión y se explica", async ({ page }) => {
    await entrarConGoogle(page, {
      identidad: { sinCorreo: true },
      destino: /\/cuenta\/ingresar\?aviso=oauthNoEmail$/,
    });

    await expect(page.getByText(/sin correo no se puede crear la cuenta/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /cómo querés aparecer/i }),
    ).toHaveCount(0);
  });

  test("el callback no respeta un next de la query", async ({ page }) => {
    await page.goto("/cuenta/oauth?code=inventado&next=https://sitio-parecido.example");

    await expect(page).toHaveURL(/\/cuenta\/ingresar\?aviso=oauthFailed$/);
    await expect(page).not.toHaveURL(/sitio-parecido/);
    await expect(page.getByText(/no se pudo entrar con esa red/i)).toBeVisible();
  });

  test("quien venía del catálogo vuelve a la ficha", async ({ page }, info) => {
    const email = correoDePrueba(info.project.name, "google-ficha");
    const volver = `/catalogo/${ITEM_DEL_FIXTURE}`;

    await entrarConGoogle(page, {
      volver,
      identidad: { email },
      destino: new RegExp(`/catalogo/${ITEM_DEL_FIXTURE}$`),
    });

    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { name: /mi panel|my panel/i })
        .or(page.getByRole("button", { name: /abrir el menú|open the menu/i })),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("en inglés el salto aterriza en /en/cuenta", async ({ page }, info) => {
    const email = correoDePrueba(info.project.name, "google-en");

    await entrarConGoogle(page, {
      idioma: "en",
      identidad: { email, nombre: "Neighbor from Google" },
      destino: /\/en\/cuenta$/,
    });

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("heading", { name: /how you want to appear/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/i'd rather not appear/i)).toBeChecked();
    await expect(page.getByLabel(/name to show/i)).toHaveValue(/neighbor from google/i);
  });

  test("después se pone contraseña y se entra con las dos", async ({
    page,
    request,
  }, info) => {
    const email = correoDePrueba(info.project.name, "google-clave");

    await entrarConGoogle(page, {
      identidad: { email, nombre: "Quien entra con google" },
    });

    await abrirSeccionDeCuenta(page, /acceso/i);
    await page.getByLabel(/contraseña nueva/i).fill(CLAVE_PUBLICA);
    await page.getByLabel(/repetila/i).fill(CLAVE_PUBLICA);
    await page.getByRole("button", { name: /guardar la contraseña/i }).click();
    await expect(page.getByText(/^guardado/i)).toBeVisible();

    await cerrarSesion(page);

    const conClave = await request.post(
      `${apiLocal()}/auth/v1/token?grant_type=password`,
      {
        data: { email, password: CLAVE_PUBLICA },
      },
    );

    expect(conClave.status(), "la contraseña que fijó tiene que entrar").toBe(200);

    await entrarConGoogle(page, {
      desde: "ingresar",
      identidad: { email, nombre: "Quien entra con google" },
    });

    await abrirSeccionDeCuenta(page, /acceso/i);
    await expect(page.getByRole("heading", { name: /^contraseña$|^password$/i })).toBeVisible();
  });
});
