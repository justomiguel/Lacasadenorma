import { expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Entrar al backoffice con una sesión de verdad.
 *
 * Las cuatro cuentas las crea `supabase/fixtures/dev.sql`, una por rol, y la sesión la
 * emite `scripts/local-api.mjs` contra el hook `custom_access_token_hook` de la
 * migración. Nada de esto es un doble de la cadena de autorización: la contraseña se
 * verifica con bcrypt en la base, el rol lo resuelve la función del esquema, el token
 * se firma con el secreto que valida PostgREST y las policies RLS deciden cada
 * lectura. Lo único sustituido es la superficie HTTP de GoTrue, que es transporte.
 *
 * Por eso estas pruebas viven en `con-datos/`: sin base no hay backoffice, y el modo
 * sin datos verifica lo contrario —que el sitio público funcione igual— en
 * `sin-datos/degradacion.spec.ts`.
 */

/**
 * La contraseña de las cuatro cuentas del fixture.
 *
 * **No es un secreto.** Del mismo carácter que el `norma_local:norma_local` de la base
 * local: sólo abre una sesión contra un Postgres que se borra entero en cada reset, y
 * ninguna cuenta del proyecto real la tiene.
 *
 * Está escrita en dos lugares —acá y en `supabase/fixtures/dev.sql`, que la guarda como
 * bcrypt— porque un archivo SQL y un módulo de TypeScript no pueden compartir una
 * constante. Si se desincronizan, el flujo 9 falla en el primer paso con el mensaje de
 * la pantalla de acceso, que es un fallo imposible de confundir con otra cosa.
 */
export const CLAVE = "clave-local-de-prueba";

/** Una cuenta por rol, para poder recorrer la matriz de permisos entrando de verdad. */
export const CUENTAS = {
  owner: "propietaria@ejemplo.invalid",
  admin: "administrador@ejemplo.invalid",
  editor: "editora@ejemplo.invalid",
  auditor: "auditora@ejemplo.invalid",
} as const;

export type RolDePrueba = keyof typeof CUENTAS;

/**
 * Entra por el formulario, como una persona.
 *
 * No se inyecta la cookie de sesión a mano, que sería más rápido: el flujo crítico 8
 * incluye la pantalla de acceso, y saltearla dejaría sin probar justamente la parte que
 * más se usa. La afirmación sobre la URL de destino está acá y no en cada prueba porque
 * un login que "funciona" pero se queda en `/admin/login` haría fallar la prueba
 * siguiente en un lugar que no explica nada.
 */
export async function entrar(page: Page, rol: RolDePrueba): Promise<void> {
  await page.goto("/admin/login");

  await page.getByLabel(/correo/i).fill(CUENTAS[rol]);
  await page.getByLabel(/contraseña/i).fill(CLAVE);
  await page.getByRole("button", { name: /entrar/i }).click();

  await expect(
    page,
    `entrar como ${rol} tenía que llevar al backoffice y quedó en ${page.url()}`,
  ).not.toHaveURL(/\/admin\/login/);
}

/**
 * Un token de acceso sin pasar por el navegador.
 *
 * Para las afirmaciones que tienen que saltear la interfaz: una Server Action es un
 * endpoint HTTP y una policy RLS es la última frontera, así que "el botón no aparece"
 * no prueba que la operación esté prohibida. Con esto se le habla a PostgREST
 * directamente, con la sesión real del rol que se quiera, que es la única forma de
 * comprobar que la base rechaza lo que la interfaz no ofrece.
 */
export async function tokenDe(
  request: APIRequestContext,
  rol: RolDePrueba,
): Promise<string> {
  const respuesta = await request.post(`${apiLocal()}/auth/v1/token?grant_type=password`, {
    data: { email: CUENTAS[rol], password: CLAVE },
  });

  expect(respuesta.status(), `la API local no emitió un token para ${rol}`).toBe(200);

  const cuerpo = (await respuesta.json()) as { access_token?: string };
  const token = cuerpo.access_token;

  expect(typeof token, "el token emitido no vino en la respuesta").toBe("string");

  return token ?? "";
}

/**
 * La URL de la API local. La misma variable con la que se construyó el sitio, así que
 * no puede apuntar a otra base que la que está mirando el navegador.
 */
export function apiLocal(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (url === undefined || url.length === 0) {
    throw new Error(
      "Falta NEXT_PUBLIC_SUPABASE_URL. Estas pruebas corren sólo en modo con-datos, con scripts/e2e.sh.",
    );
  }

  return url;
}

/**
 * Un identificador distinto por proyecto de Playwright y por corrida.
 *
 * Los tres proyectos —escritorio, móvil y safari— corren en paralelo contra **la misma
 * base**, y `updates.slug` es único. Sin esto, el segundo en llegar fallaría con un
 * error de clave duplicada que se leería como un error del formulario.
 */
export function sufijoUnico(proyecto: string): string {
  return `${proyecto.toLowerCase()}-${String(Date.now()).slice(-7)}`;
}
