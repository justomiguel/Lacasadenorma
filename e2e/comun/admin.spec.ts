import { expect, test } from "@playwright/test";

import { esperarSinViolaciones } from "../soporte/axe";

/**
 * Flujo crítico 8: el backoffice, del lado que se puede verificar sin GoTrue.
 *
 * Lo que **no** se puede probar acá está declarado en `docs/testing.md` y en
 * `testing-strategy.md` §8: entrar con una sesión real, porque eso necesita un GoTrue
 * emitiendo y verificando tokens contra el JWKS del proyecto, y la API local no lo
 * incluye. Esa mitad se verifica a mano contra un proyecto de Supabase, y está en el
 * runbook de despliegue como paso obligatorio antes del primer push a producción.
 *
 * Lo que sí se prueba es la mitad que importa más, porque es la que protege: **sin
 * sesión no se entra a ninguna parte**. Y se prueba sobre las siete secciones, una por
 * una, en lugar de sobre una sola y confiando en que el layout cubre el resto. En el App
 * Router un layout no se vuelve a ejecutar al navegar entre páginas hermanas, así que
 * "el layout ya lo revisa" es exactamente la suposición que hace falta desmentir con una
 * prueba.
 */

const SECCIONES = [
  "/admin",
  "/admin/novedades",
  "/admin/gastos",
  "/admin/aportes",
  "/admin/hitos",
  "/admin/objetivos",
  "/admin/cuentas",
  "/admin/auditoria",
];

test.describe("flujo 8 · sin sesión no se entra", () => {
  for (const seccion of SECCIONES) {
    test(`${seccion} manda a la pantalla de acceso`, async ({ page }) => {
      await page.goto(seccion);

      await expect(page).toHaveURL(/\/admin\/login(\?|$)/);
      await expect(
        page.getByRole("heading", { level: 1, name: /entrar al backoffice/i }),
      ).toBeVisible();
    });
  }

  test("una novedad concreta tampoco se abre sin sesión", async ({ page }) => {
    await page.goto("/admin/novedades/11111111-1111-4111-8111-111111111111");

    await expect(page).toHaveURL(/\/admin\/login(\?|$)/);
  });

  /**
   * El comprobante de un gasto es el archivo con más consecuencias del sistema: suele
   * tener el nombre y el CUIT de un tercero. La ruta que lo sirve **no redirige**,
   * responde un código de estado: devuelve un archivo, y un 307 hacia el HTML de la
   * pantalla de acceso se ve, del otro lado, como una descarga corrupta.
   */
  test("un comprobante no se sirve sin sesión", async ({ request }) => {
    const respuesta = await request.get(
      "/admin/comprobantes/22222222-2222-4222-8222-222222222222",
      { maxRedirects: 0 },
    );

    // 403 sin sesión ni permiso; 503 cuando no hay backoffice configurado, que es el
    // caso del modo sin datos. Ninguno de los dos devuelve el archivo, y ninguno es un
    // redirect: `maxRedirects: 0` haría fallar esto si lo fuera.
    expect([403, 503]).toContain(respuesta.status());
    expect(respuesta.headers()["content-type"] ?? "").not.toContain("application/pdf");
  });
});

test.describe("flujo 8 · la pantalla de acceso", () => {
  test("no se indexa, ni por robots.txt ni por su propia metadata", async ({
    page,
    request,
  }) => {
    await page.goto("/admin/login");

    const robots = await page
      .locator('meta[name="robots"]')
      .first()
      .getAttribute("content");

    expect(robots ?? "", "el backoffice declara noindex en su metadata").toContain(
      "noindex",
    );

    // Y además en robots.txt: las dos capas, porque la metadata sólo la lee quien ya
    // pidió la página.
    const archivo = await request.get("/robots.txt");

    expect(await archivo.text()).toContain("/admin");
  });

  test("no aparece en el sitemap", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");

    expect(await sitemap.text()).not.toContain("/admin");
  });

  test("el formulario tiene etiquetas asociadas y se recorre con teclado", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    const correo = page.getByLabel(/correo/i);
    const clave = page.getByLabel(/contraseña/i);

    await expect(correo).toBeVisible();
    await expect(clave).toBeVisible();
    await expect(clave).toHaveAttribute("type", "password");

    await correo.focus();
    await page.keyboard.press("Tab");
    await expect(clave).toBeFocused();
  });

  /**
   * Principio XII, en el lugar donde más cuesta cumplirlo: si la autenticación no
   * responde —porque no está configurada, porque el proyecto está caído— el formulario
   * tiene que **decirlo**. Un botón que se queda pensando y vuelve al mismo lugar es la
   * falla silenciosa más frustrante posible.
   */
  test("un intento fallido explica qué pasó en lugar de no hacer nada", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    await page.getByLabel(/correo/i).fill("no.existe@ejemplo.invalid");
    await page.getByLabel(/contraseña/i).fill("una-clave-que-no-es");
    await page.getByRole("button", { name: /entrar/i }).click();

    // Acotado al formulario a propósito. `getByRole("alert")` a secas también encuentra
    // `__next-route-announcer__`, el `div role="alert"` que Next agrega para anunciar
    // los cambios de ruta: cuando existe en ese instante, la aserción falla por
    // ambigüedad y no por ausencia del mensaje, que es un fallo intermitente y que
    // además señala el lugar equivocado.
    await expect(page.locator("form").getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("la pantalla de acceso cumple WCAG 2.2 AA", async ({ page }) => {
    await page.goto("/admin/login");
    await esperarSinViolaciones(page, "/admin/login");
  });
});
