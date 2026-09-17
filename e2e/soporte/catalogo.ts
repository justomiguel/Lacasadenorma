import {
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";

import { apiLocal, CUENTAS, entrar, primeraFila, tokenDe } from "./backoffice";
import { esperarQueNoAparezca, revalidar } from "./revalidar";

/**
 * El ítem de `supabase/fixtures/dev.sql`. El listado muestra la miniatura de
 * referencia del título (ADR-043); la ficha, la foto con epígrafe. Cualquier
 * ítem de prueba extra que quede publicado ensucia el listado; la aislación
 * es despublicar.
 */
const ITEM_SIN_FOTO_DEL_FIXTURE = "dddddddd-0000-4000-8000-000000000001";

/**
 * Cargar un ítem publicado desde el backoffice, como lo haría el equipo.
 *
 * No va en el fixture: un ítem de prueba extra queda en el listado y
 * `revision-visual.spec.ts` recorre `/catalogo`. Cada prueba crea el suyo y
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

export async function idDeReservaActiva(
  request: APIRequestContext,
  titulo: string,
): Promise<string> {
  const token = await tokenDe(request, "admin");
  const itemId = await idDeItem(request, titulo);
  const respuesta = await request.get(
    `${apiLocal()}/rest/v1/donation_pledges?select=id,status&item_id=eq.${itemId}&status=eq.reserved`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  expect(respuesta.status(), `no se encontró la reserva de «${titulo}»`).toBe(200);

  const { id } = primeraFila(
    (await respuesta.json()) as { id: string }[],
    `la reserva de «${titulo}»`,
  );

  return id;
}

/** Lo saca de `/catalogo` y tira la caché de ISR para no dejar un hueco de foto. */
export async function ocultarItem(
  request: APIRequestContext,
  itemId: string,
  titulo: string,
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
  await esperarQueNoAparezca(request, "/catalogo", titulo);
  await esperarQueNoAparezca(request, "/en/catalogo", titulo);
}

/**
 * Deja `/catalogo` como lo horneó el fixture: un ítem publicado, sin hueco
 * de foto en el listado (la ficha es la que reserva el espacio).
 *
 * Corre al empezar la revisión visual en CI, donde hay un solo worker y los
 * proyectos van en serie. En local la suite es paralela: despublicar acá
 * sacaría el ítem de otra prueba. El cleanup de cada test sigue siendo
 * `ocultarItem`.
 */
export async function dejarElCatalogoDelFixture(
  request: APIRequestContext,
): Promise<void> {
  const token = await tokenDe(request, "editor");
  const respuesta = await request.patch(
    `${apiLocal()}/rest/v1/donation_items?id=neq.${ITEM_SIN_FOTO_DEL_FIXTURE}&published_at=not.is.null`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: "return=minimal",
      },
      data: { published_at: null },
    },
  );

  expect(respuesta.status(), "despublicar ítems que no son el del fixture").toBe(204);
  await revalidar(request, ["/catalogo", "/en/catalogo"]);
  await esperarHuecosDelCatalogo(request, 0);
}

/**
 * El atributo en el HTML, no el payload RSC. En un ítem el marcador aparece
 * dos veces en el documento (`"data-espacio-reservado":true` y
 * `data-espacio-reservado="true"`); contar la cadena cruda da el doble.
 */
function huecosEnHtml(html: string): number {
  return html.match(/\sdata-espacio-reservado=/g)?.length ?? 0;
}

async function esperarHuecosDelCatalogo(
  request: APIRequestContext,
  esperado: number,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const primera = await (await request.get("/catalogo")).text();
        let huecos = huecosEnHtml(primera);

        if (huecos === esperado) {
          return huecos;
        }

        const segunda = await (await request.get("/catalogo")).text();

        huecos = huecosEnHtml(segunda);

        if (huecos !== esperado) {
          const marca = await request.post("/e2e/revalidar", {
            data: { paths: ["/catalogo", "/en/catalogo"] },
          });

          expect(marca.status(), await marca.text()).toBe(200);
        }

        return huecos;
      },
      {
        timeout: 20_000,
        intervals: [500, 1_000, 1_000, 2_000],
        message: `/catalogo tendría que reservar ${String(esperado)} huecos de foto (criterio 11)`,
      },
    )
    .toBe(esperado);
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
    await ocultarItem(request, itemId, titulo);
  }
}

/**
 * El `finally` de las pruebas de catálogo. Si el test venció, el `request` del
 * fixture ya está cerrado y tirar acá escondería la causa; el de la página del
 * equipo sigue vivo hasta que cerremos el contexto.
 */
export async function ocultarItemSiExiste(
  request: APIRequestContext,
  titulo: string,
): Promise<void> {
  try {
    await ocultarItem(request, await idDeItem(request, titulo), titulo);
  } catch (error) {
    console.warn("No se pudo despublicar el ítem de prueba", error);
  }
}

/**
 * El renglón de la tabla. En WebKit a veces hay un nodo extra: se acota al
 * contenido.
 */
export function filaDelCatalogo(page: Page, titulo: string) {
  return page
    .locator("#contenido")
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: titulo, exact: true }) });
}

/** Abre la ficha desde el listado. */
export async function abrirItemDelCatalogo(page: Page, titulo: string): Promise<void> {
  await filaDelCatalogo(page, titulo)
    .getByRole("link", { name: titulo, exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
}

/** La ficha: foto o hueco, cantidades y el formulario. */
export function articuloDelCatalogo(page: Page, _titulo?: string) {
  return page.locator("#contenido").getByRole("article");
}

/**
 * El formulario de la ficha. Hay uno: traer el bien o cubrirlo con plata
 * (ADR-044).
 */
export function formularioDeTraer(articulo: Locator) {
  return articulo.locator("form").filter({ hasText: /quiero donar/i });
}

/** Nombre y dirección de retiro, y envío. El de retiro aparece al hidratar (ADR-051). */
export async function completarTraer(
  formulario: Locator,
  extra?: { readonly quantity?: number },
): Promise<void> {
  await expect(formulario.getByLabel(/dirección donde ir a buscar/i)).toBeVisible();
  await formulario.getByLabel(/^nombre$/i).fill("Ana");

  if (extra?.quantity !== undefined) {
    await formulario.getByLabel(/^cuántas$/i).fill(String(extra.quantity));
  }

  await formulario
    .getByLabel(/dirección donde ir a buscar/i)
    .fill("Riacho He Hé, Formosa");

  await formulario.getByRole("button", { name: /quiero donar/i }).click();
}

/** El sí del correo al owner. En el teléfono, aparecer y nota si aceptaron. */
export async function confirmarQueDonan(
  page: Page,
  extra?: { readonly aparecer?: string; readonly nota?: string },
): Promise<void> {
  if (extra?.aparecer !== undefined) {
    await page.getByLabel(/aceptó aparecer con nombre/i).check();
    await page.getByLabel(/nombre para mostrar/i).fill(extra.aparecer);
  }

  if (extra?.nota !== undefined) {
    await page.getByLabel(/nota para la familia/i).fill(extra.nota);
  }

  await page.getByRole("button", { name: /^sí: donan$/i }).click();
}

/** Nombre y correo: el camino que abre una cuenta (ADR-051). */
export async function completarOfertaPorMail(
  formulario: Locator,
  email = "ana@ejemplo.invalid",
): Promise<void> {
  await formulario.getByLabel(/^nombre$/i).fill("Ana");
  await formulario.getByLabel(/^correo$/i).fill(email);
  await formulario.getByRole("button", { name: /quiero donar/i }).click();
}

/** Nombre y teléfono: reserva a su nombre y avisa al owner (ADR-051). */
export async function completarOfertaPorTelefono(
  formulario: Locator,
  telefono = "11 1234-5678",
): Promise<void> {
  await formulario.getByLabel(/^nombre$/i).fill("Ana");
  await formulario.getByLabel(/^teléfono$/i).fill(telefono);
  await formulario.getByRole("button", { name: /quiero donar/i }).click();
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
  await fila.getByRole("button", { name: /^sí: donan$/i }).click();
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
