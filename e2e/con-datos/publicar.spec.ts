import { expect, test } from "@playwright/test";

import { esperarSinViolaciones } from "../soporte/axe";
import { apiLocal, entrar, sufijoUnico, tokenDe } from "../soporte/backoffice";

/**
 * Flujo crítico 9: publicar una actualización.
 *
 * Es el último de los nueve y el que faltaba automatizar. La razón por la que faltaba
 * era buena mientras duró: la API local no tenía autenticación, y un servidor de
 * autenticación falso habría terminado verificando el servidor falso. Ahora
 * `scripts/local-api.mjs` emite sesiones donde lo único sustituido es la superficie
 * HTTP —la contraseña la verifica bcrypt en la base, el rol lo resuelve la función
 * `custom_access_token_hook` del esquema, el token lo valida PostgREST y las policies
 * RLS deciden cada escritura—, así que el recorrido de acá pasa por la cadena de
 * autorización de verdad.
 *
 * Eso ya rindió antes de la primera aserción: montar la emisión de tokens contra el
 * hook real descubrió que `supabase_auth_admin` no tenía `usage` sobre el esquema
 * `private` y que **ninguna sesión se habría podido emitir en producción** (migración
 * 20260910090000).
 *
 * Los tres proyectos de Playwright corren en paralelo contra la misma base, así que
 * cada prueba trabaja sobre una novedad con su propio `slug`. Ninguna toca las filas
 * del fixture que las otras suites afirman.
 */

test.describe("flujo 9 · publicar una novedad", () => {
  test("de la pantalla de acceso al sitio público, con la sesión real", async ({
    page,
    request,
  }, info) => {
    const sufijo = sufijoUnico(info.project.name);
    const slug = `se-levanto-la-pared-${sufijo}`;
    const titulo = `Se levantó la pared del fondo (${sufijo})`;
    const texto =
      "Con los ladrillos que quedaban se cerró el lado que da al patio. " +
      "Falta el revoque, y para eso hay que esperar que baje la humedad.";

    // ── Entrar ────────────────────────────────────────────────────────────────
    await entrar(page, "editor");

    await expect(
      page.getByRole("heading", { level: 1, name: /estado de la campaña/i }),
    ).toBeVisible();

    // El rol que muestra el marco sale del claim `app_metadata.user_role` del token,
    // que puso el hook de la migración leyendo `public.user_roles`. Que diga "Edición"
    // es la prueba de que ese camino entero funcionó.
    await expect(page.getByText(/edición/i).first()).toBeVisible();

    // ── Escribir el borrador ──────────────────────────────────────────────────
    await page.goto("/admin/novedades");

    await page.getByLabel("Título").fill(titulo);
    await page.getByLabel(/dirección web/i).fill(slug);
    await page.getByLabel("Texto").fill(texto);
    await page.getByRole("button", { name: /guardar borrador/i }).click();

    // Guardar lleva a la pantalla de la novedad, que es la mitad de SC-009: quien
    // acaba de escribir el avance ya está donde se publica.
    await expect(page).toHaveURL(
      /\/admin\/novedades\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
    await expect(page.getByText(/es un borrador/i)).toBeVisible();

    // ── Un borrador no tiene camino público ───────────────────────────────────
    // Antes de publicar, no después: si la URL contestara 200 acá, el paso siguiente
    // lo taparía y la prueba pasaría igual.
    expect(
      (await request.get(`/novedades/${slug}`)).status(),
      "un borrador alcanzable por URL sería una filtración de las policies",
    ).toBe(404);

    // ── Publicar ──────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /publicar ahora/i }).click();

    await expect(page.getByRole("status")).toContainText(/novedad publicada/i);

    // ── Y ahora sí está en el sitio ───────────────────────────────────────────
    // La página pública es la que se comparte por WhatsApp: se comprueba que exista,
    // que tenga su título como encabezado y que la canónica apunte a ella misma, que es
    // lo que hace que el enlace compartido no lleve a una copia sin canónica.
    await page.goto(`/novedades/${slug}`);

    await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
    await expect(page.getByText(/falta el revoque/i)).toBeVisible();

    const canonica = await page
      .locator('link[rel="canonical"]')
      .first()
      .getAttribute("href");

    expect(new URL(canonica ?? "", "http://x.test").pathname).toBe(`/novedades/${slug}`);

    // Y en la lista, que es la página que `revalidatePath` tiene que haber
    // invalidado: sin eso la novedad existiría por URL directa y no aparecería
    // donde la gente la busca.
    await page.goto("/novedades");
    await expect(page.getByRole("link", { name: new RegExp(sufijo) })).toBeVisible();
  });

  /**
   * La otra mitad de publicar: que quede registrado.
   *
   * Se entra con `admin` porque leer la auditoría pide `auditoria.leer`, que un
   * `editor` no tiene —la matriz de `src/domain/permissions.ts`, verificada contra las
   * policies en pgTAP—. Así que el registro se escribe con un rol y se lee con otro,
   * que es exactamente cómo funciona en la práctica.
   */
  test("la publicación queda en el registro de auditoría", async ({ page }, info) => {
    const sufijo = sufijoUnico(`auditoria-${info.project.name}`);
    const slug = `llego-el-agua-${sufijo}`;

    await entrar(page, "editor");
    await page.goto("/admin/novedades");

    await page.getByLabel("Título").fill(`Llegó el agua a la casa (${sufijo})`);
    await page.getByLabel(/dirección web/i).fill(slug);
    await page
      .getByLabel("Texto")
      .fill("Se conectó la cañería nueva y el tanque quedó cargado.");
    await page.getByRole("button", { name: /guardar borrador/i }).click();

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /publicar ahora/i }).click();
    await expect(page.getByRole("status")).toContainText(/novedad publicada/i);

    await page.getByRole("button", { name: /cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/);

    await entrar(page, "admin");
    await page.goto("/admin/auditoria");

    // "Otra persona del equipo" y no un correo: la pantalla muestra el rol de quien
    // hizo el cambio a propósito, para no poner los correos del equipo a circular.
    const registro = page.getByRole("list").filter({ hasText: /publicó una novedad/i });

    await expect(registro.first()).toBeVisible();
    await expect(page.getByText(/publicó una novedad/i).first()).toBeVisible();
  });

  /**
   * Que el botón no aparezca no prueba que la operación esté prohibida.
   *
   * Una Server Action es un endpoint HTTP y una policy RLS es la última frontera, así
   * que el rechazo se comprueba en los dos lugares: la pantalla manda al aviso de
   * permiso insuficiente, y la base rechaza el `update` aunque se le hable
   * directamente con la sesión real del auditor, salteando la interfaz entera.
   *
   * El caso es `auditor` porque es el rol difícil: tiene rango 1 y ve todo el libro,
   * así que una policy escrita como "al menos auditor" le habría abierto la escritura
   * sin que se notara.
   */
  test("un auditor no publica: ni la pantalla se lo ofrece, ni la base lo deja", async ({
    page,
    request,
  }, info) => {
    const sufijo = sufijoUnico(`auditor-${info.project.name}`);
    const slug = `borrador-ajeno-${sufijo}`;

    // Un borrador propio de esta prueba, creado con la sesión del editor contra
    // PostgREST. Trabajar sobre una fila del fixture dejaría a las otras suites
    // mirando un dato que esta prueba movió.
    const tokenEditor = await tokenDe(request, "editor");
    const campana = await request.get(
      `${apiLocal()}/rest/v1/campaigns?select=id&slug=eq.casa-de-norma-desarrollo`,
      { headers: { Authorization: `Bearer ${tokenEditor}` } },
    );
    const [{ id: campaignId }] = (await campana.json()) as { id: string }[];

    const creado = await request.post(`${apiLocal()}/rest/v1/updates`, {
      headers: {
        Authorization: `Bearer ${tokenEditor}`,
        Prefer: "return=representation",
      },
      data: {
        campaign_id: campaignId,
        slug,
        title: `Borrador que un auditor no puede publicar (${sufijo})`,
        body: "Existe sólo para comprobar que la base rechaza la publicación.",
        published_at: null,
      },
    });

    expect(creado.status(), "un editor tiene que poder crear un borrador").toBe(201);

    const [{ id: updateId }] = (await creado.json()) as { id: string }[];

    // ── La pantalla ───────────────────────────────────────────────────────────
    await entrar(page, "auditor");
    await page.goto("/admin/novedades");

    await expect(page).toHaveURL(/\/admin\/sin-permiso/);
    await expect(
      page.getByRole("heading", { level: 1, name: /no es para tu rol/i }),
    ).toBeVisible();
    // Le dice qué rol tiene, para que pueda pedir el que necesita, y nada de lo que
    // hay del otro lado.
    await expect(page.getByText(/auditoría/i).first()).toBeVisible();

    // ── La base ───────────────────────────────────────────────────────────────
    const tokenAuditor = await tokenDe(request, "auditor");
    const forzado = await request.patch(
      `${apiLocal()}/rest/v1/updates?id=eq.${updateId}`,
      {
        headers: {
          Authorization: `Bearer ${tokenAuditor}`,
          Prefer: "return=representation",
        },
        data: { published_at: new Date().toISOString() },
      },
    );

    // La policy `updates_update` pide `has_min_role('editor')` en el `using`, así que
    // para esta sesión la fila no existe: la respuesta no trae ninguna. No es un 500
    // ni un error de Postgres filtrado; es una negación limpia.
    expect(await forzado.json(), "el auditor modificó una novedad").toEqual([]);

    // Y lo que importa de verdad: sigue siendo un borrador y no tiene camino público.
    const despues = await request.get(
      `${apiLocal()}/rest/v1/updates?select=published_at&id=eq.${updateId}`,
      { headers: { Authorization: `Bearer ${tokenAuditor}` } },
    );

    expect(await despues.json()).toEqual([{ published_at: null }]);
    expect((await request.get(`/novedades/${slug}`)).status()).toBe(404);
  });

  /**
   * El backoffice también tiene que ser accesible.
   *
   * Antes esto no se podía comprobar: sin sesión, axe sólo llegaba a la pantalla de
   * acceso. Se revisan las dos pantallas con más controles —el tablero y el formulario
   * de novedades— y corre en los dos viewports, porque publicar un avance desde el
   * teléfono en la obra es el caso de uso real y no el escritorio.
   */
  test("el backoffice con sesión cumple WCAG 2.2 AA", async ({ page }) => {
    await entrar(page, "owner");

    await esperarSinViolaciones(page, "/admin");

    await page.goto("/admin/novedades");
    await esperarSinViolaciones(page, "/admin/novedades");
  });
});
