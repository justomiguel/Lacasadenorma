import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { apiLocal, CUENTAS, entrar, primeraFila, tokenDe } from "./backoffice";
import { revalidar } from "./revalidar";

/**
 * Cargar un ítem publicado desde el backoffice, como lo haría el equipo.
 *
 * No va en el fixture: un ítem sin foto suma un hueco en `/catalogo` y
 * `revision-visual.spec.ts` exige el número exacto. Cada prueba crea el suyo y
 * lo despublica al terminar.
 */
export async function cargarItemPublicado(
  page: Page,
  titulo: string,
  cantidad = 1,
): Promise<string> {
  await entrar(page, "editor");
  await page.goto("/admin/catalogo");

  const alta = page.getByRole("region", { name: /agregar un ítem/i });

  await alta.getByLabel("Qué hace falta").fill(titulo);
  await alta.getByLabel("Cuántas hacen falta").fill(String(cantidad));
  await alta.getByRole("button", { name: /guardar ítem/i }).click();

  await expect(alta.getByRole("status")).toHaveText(/ítem guardado/i);

  return titulo;
}

export async function idDeItem(
  request: APIRequestContext,
  titulo: string,
): Promise<string> {
  const token = await tokenDe(request, "editor");
  const respuesta = await request.get(
    `${apiLocal()}/rest/v1/donation_items?select=id,title&title=eq.${encodeURIComponent(titulo)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  expect(respuesta.status(), `no se encontró el ítem «${titulo}»`).toBe(200);

  const { id } = primeraFila(
    (await respuesta.json()) as { id: string }[],
    `el ítem «${titulo}»`,
  );

  return id;
}

/** Lo saca de `/catalogo` y tira la caché de ISR para no dejar un hueco de foto. */
export async function ocultarItem(
  request: APIRequestContext,
  itemId: string,
): Promise<void> {
  const token = await tokenDe(request, "editor");
  const respuesta = await request.patch(
    `${apiLocal()}/rest/v1/donation_items?id=eq.${itemId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: "return=minimal",
      },
      data: { published_at: null },
    },
  );

  expect(respuesta.status(), "despublicar el ítem de prueba").toBe(204);
  await revalidar(request, ["/catalogo", "/en/catalogo"]);
}

/**
 * Publica un ítem, corre el cuerpo y lo despublica siempre.
 *
 * El id se resuelve **antes** del cuerpo: si la prueba se queda sin tiempo, el
 * `finally` todavía tiene con qué pegarle a PostgREST. El `request` de Playwright
 * no depende del browser, así que esto sigue andando con el contexto ya cerrado.
 */
export async function conItemPublicado(
  request: APIRequestContext,
  staffPage: Page,
  titulo: string,
  cantidad: number,
  cuerpo: (itemId: string) => Promise<void>,
): Promise<void> {
  await cargarItemPublicado(staffPage, titulo, cantidad);
  const itemId = await idDeItem(request, titulo);

  try {
    await cuerpo(itemId);
  } finally {
    await ocultarItem(request, itemId);
  }
}

/** El renglón del catálogo, acotado al contenido: en WebKit a veces hay un nodo extra. */
export function articuloDelCatalogo(page: Page, titulo: string) {
  return page
    .locator("#contenido")
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: titulo, exact: true }),
    });
}

export async function confirmarLlegada(page: Page, titulo: string): Promise<void> {
  const salir = page
    .locator("#contenido")
    .getByRole("button", { name: /cerrar sesión/i });

  if (await salir.isVisible()) {
    await salir.click();
    await expect(page).toHaveURL(/\/admin\/login/);
  }

  await entrar(page, "admin");
  await page.goto("/admin/donaciones");

  const cerradas = page.getByRole("region", { name: /cerradas/i });
  const yaCerradas = await cerradas.locator("li").filter({ hasText: titulo }).count();
  const fila = page
    .getByRole("region", { name: /en curso/i })
    .locator("li")
    .filter({ hasText: titulo })
    .first();

  await expect(fila).toBeVisible();
  await fila.getByText("Resolver esta reserva").click();
  await fila.getByRole("button", { name: /^llegó$/i }).click();
  await expect(cerradas.locator("li").filter({ hasText: titulo })).toHaveCount(
    yaCerradas + 1,
  );
}

export async function habilitarCuenta(page: Page, email: string): Promise<void> {
  const yaAdmin = page.getByText(CUENTAS.admin);

  if (!(await yaAdmin.isVisible())) {
    const salir = page
      .locator("#contenido")
      .getByRole("button", { name: /cerrar sesión/i });

    if (await salir.isVisible()) {
      await salir.click();
      await expect(page).toHaveURL(/\/admin\/login/);
    }

    await entrar(page, "admin");
  }

  if (!page.url().includes("/admin/donantes")) {
    await page.goto("/admin/donantes");
  }

  const fila = page.locator("li").filter({ hasText: email });

  await expect(fila).toBeVisible();
  await fila.getByText("Decidir").click();
  await fila.getByRole("button", { name: /^habilitar$/i }).click();
  await expect(fila.getByText(/habilitada/i).first()).toBeVisible();
}

export async function vencerReserva(
  request: APIRequestContext,
  pledgeId: string,
): Promise<void> {
  const respuesta = await request.post(`${apiLocal()}/harness/v1/vencer-reserva`, {
    data: { pledgeId },
  });

  expect(respuesta.status(), await respuesta.text()).toBe(200);
}
