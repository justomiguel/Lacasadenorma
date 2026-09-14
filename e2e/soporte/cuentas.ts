import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { apiLocal } from "./backoffice";

/**
 * Una cuenta del público, creada como la crearía una persona.
 *
 * La diferencia con `backoffice.ts` no es de estilo: las cuatro cuentas de allá las
 * inserta el fixture con el correo ya confirmado, porque el equipo las recibe desde
 * el panel de Supabase. Las de acá **no existen antes de la prueba**. Se crean por
 * el formulario, y la sesión aparece recién al abrir el enlace del correo, que es
 * la implicación entera de `enable_confirmations = true` (ADR-027).
 *
 * Lo único sustituido es el buzón. `scripts/local-api/buzon.mjs` lee el token de
 * `auth.users`, que es donde GoTrue lo guarda antes de mandarlo; el canje es por la
 * misma ruta `/verify` y la sesión la emite el mismo hook del esquema.
 */

/** La contraseña de las cuentas que crean estas pruebas. No es un secreto. */
export const CLAVE_PUBLICA = "clave-de-quien-dona";

/**
 * Una dirección distinta por prueba, por proyecto y por corrida.
 *
 * Los tres proyectos de Playwright corren en paralelo contra la misma base y
 * `auth.users.email` es único. Sin esto, el segundo en llegar vería el alta
 * repetida —que contesta igual que una nueva, a propósito— y después no podría
 * entrar, con un fallo que no se parece en nada a su causa.
 */
export function correoDePrueba(proyecto: string, que: string): string {
  const sufijo = `${proyecto.toLowerCase()}-${String(Date.now()).slice(-7)}`;

  return `${que}-${sufijo}@ejemplo.invalid`;
}

export interface EnlacePendiente {
  readonly type: "signup" | "recovery";
  readonly token_hash: string;
}

/** Abre el buzón del harness: el enlace que la persona recibiría por correo. */
export async function enlacePendiente(
  request: APIRequestContext,
  email: string,
): Promise<EnlacePendiente> {
  const respuesta = await request.get(
    `${apiLocal()}/harness/v1/buzon?email=${encodeURIComponent(email)}`,
  );

  expect(
    respuesta.status(),
    `no hay ningún enlace pendiente para ${email}: ${await respuesta.text()}`,
  ).toBe(200);

  return (await respuesta.json()) as EnlacePendiente;
}

/** La URL de `/cuenta/confirmar` tal cual la arma el correo, en el idioma que sea. */
export function urlDelEnlace(enlace: EnlacePendiente, prefijo = ""): string {
  return `${prefijo}/cuenta/confirmar?token_hash=${enlace.token_hash}&type=${enlace.type}`;
}

/**
 * El alta entera: el formulario, el correo y el enlace.
 *
 * Deja a la persona con la sesión abierta en `/cuenta`. Las pruebas que necesitan
 * una cuenta del público para otra cosa —reservar, por ejemplo— llaman esto y
 * empiezan desde ahí, sin repetir el recorrido.
 */
export async function crearCuenta(
  page: Page,
  request: APIRequestContext,
  email: string,
): Promise<void> {
  await page.goto("/cuenta/crear");

  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(CLAVE_PUBLICA);
  await page.getByRole("button", { name: /crear la cuenta/i }).click();

  await expect(
    page.getByRole("heading", { name: /revisá tu correo/i }),
    "el alta tenía que terminar diciendo que hay que abrir el correo",
  ).toBeVisible();

  const enlace = await enlacePendiente(request, email);

  expect(enlace.type, "el enlace del alta tiene que ser de confirmación").toBe("signup");

  await page.goto(urlDelEnlace(enlace));

  await expect(
    page,
    "abrir el enlace de confirmación tenía que dejar la sesión abierta en /cuenta",
  ).toHaveURL(/\/cuenta$/);
}

/**
 * Abre una pestaña de `/cuenta`.
 *
 * Con JavaScript la pantalla es un índice: el formulario de la foto no está en
 * el DOM al mismo tiempo que el de borrar. Las pruebas que llenan un campo de
 * otra sección tienen que pedirla antes.
 */
export async function abrirSeccionDeCuenta(page: Page, seccion: RegExp): Promise<void> {
  await expect(page.getByRole("tablist")).toBeVisible();

  const tab = page.getByRole("tab", { name: seccion });

  await expect(tab).toBeVisible();
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

/**
 * Cierra la sesión del público.
 *
 * En escritorio hay un «Cerrar sesión» en el encabezado y, si la pestaña Acceso
 * está abierta, otro en el perfil. Sin acotar, Playwright se niega a hacer click.
 */
export async function cerrarSesion(page: Page): Promise<void> {
  const enElEncabezado = page
    .getByRole("banner")
    .getByRole("button", { name: /cerrar sesión/i });

  if (await enElEncabezado.isVisible()) {
    await enElEncabezado.click();
    return;
  }

  await page.getByRole("button", { name: /cerrar sesión/i }).click();
}
