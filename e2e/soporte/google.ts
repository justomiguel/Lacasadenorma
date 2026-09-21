import { expect, type Page } from "@playwright/test";

/**
 * Identidad que el harness de OAuth va a emitir (ADR-039).
 *
 * Playwright no habla con Google. El botón sí recorre `startOAuth` →
 * `/authorize` → `/cuenta/oauth` → sesión. Estos campos viajan en encabezados
 * que sólo el harness lee: así la prueba controla el correo (unificación), el
 * nombre y el caso sin dirección, sin saltear el botón.
 */
export interface IdentidadGoogle {
  readonly email?: string;
  readonly nombre?: string;
  readonly foto?: string;
  readonly sinCorreo?: boolean;
}

/**
 * Intercepta el authorize y le pasa la identidad al harness.
 *
 * Playwright apila las rutas: la última gana. Llamar de nuevo con otra
 * identidad, en la misma página, cubre el segundo salto. Los encabezados no
 * existen en GoTrue; son palanca de prueba, igual que el buzón.
 */
export async function fijarIdentidadGoogle(
  page: Page,
  identidad: IdentidadGoogle = {},
): Promise<void> {
  await page.route("**/auth/v1/authorize**", async (route) => {
    const headers = {
      ...route.request().headers(),
      "x-harness-oauth-email": identidad.email ?? "",
      "x-harness-oauth-name": identidad.nombre ?? "",
      "x-harness-oauth-picture": identidad.foto ?? "",
      "x-harness-oauth-sin-correo": identidad.sinCorreo === true ? "1" : "",
    };

    await route.continue({ headers });
  });
}

/**
 * El salto entero: la pantalla, el botón, el canje y el aterrizaje.
 *
 * Deja la sesión abierta. El destino por defecto es `/cuenta`; el catálogo se
 * pide con `volver` y `destino`.
 */
export async function entrarConGoogle(
  page: Page,
  opciones: {
    readonly desde?: "crear" | "ingresar";
    readonly idioma?: "es" | "en";
    readonly volver?: string;
    readonly identidad?: IdentidadGoogle;
    readonly destino?: RegExp;
  } = {},
): Promise<void> {
  await fijarIdentidadGoogle(page, opciones.identidad ?? {});

  const prefijo = opciones.idioma === "en" ? "/en" : "";
  const pantalla = opciones.desde ?? "crear";
  const query =
    opciones.volver === undefined || opciones.volver.length === 0
      ? ""
      : `?volver=${encodeURIComponent(opciones.volver)}`;

  await page.goto(`${prefijo}/cuenta/${pantalla}${query}`);
  await page
    .getByRole("button", { name: /continuar con google|continue with google/i })
    .click();
  await expect(page).toHaveURL(opciones.destino ?? /\/cuenta$/);
}
