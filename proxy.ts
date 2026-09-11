import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresco de la sesión, y **nada más**.
 *
 * Next 16 renombró `middleware.ts` a `proxy.ts` y el nombre nuevo describe mejor
 * lo que conviene que esto sea: una capa de red delgada. Corre antes de cada
 * navegación que coincida con el `matcher`, y su único trabajo real es darle a
 * `@supabase/ssr` la oportunidad de renovar el token y escribir la cookie
 * resultante. Un Server Component no puede escribir cookies; acá sí se puede.
 *
 * **Esto no es una frontera de autorización.** Es la parte que más se malinterpreta
 * del patrón y conviene que quede escrita: el redirect de abajo es *optimista*, una
 * conveniencia de producto para que quien no tiene sesión vea la pantalla de acceso
 * en lugar de un parpadeo. No protege nada, por tres razones concretas:
 *
 * 1. Sólo mira si **existe** una sesión, no qué rol tiene.
 * 2. No corre en las Server Actions, que son endpoints HTTP invocables por su ID.
 * 3. El `matcher` es una lista de rutas, y una lista se puede quedar corta cuando
 *    alguien agrega una ruta nueva.
 *
 * Las fronteras reales son dos y están en otro lado: las guardas de
 * `src/infrastructure/auth/guards.ts`, que se revalidan en cada carga y en cada
 * acción, y las policies RLS, que rechazan la operación aunque todo lo anterior
 * falle. Si alguna vez hay que elegir, la de la base es la que importa.
 */
export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  const response = NextResponse.next({ request });

  // Sin proyecto configurado no hay sesión que refrescar y el backoffice no puede
  // funcionar. Se deja pasar: la pantalla de acceso explica que falta configuración,
  // que es más útil que un redirect a una ruta que tampoco va a andar.
  if (
    url === undefined ||
    url.length === 0 ||
    publishableKey === undefined ||
    publishableKey.length === 0
  ) {
    return response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        // Estas cabeceras **hay que propagarlas**. Son los `no-store` que la
        // librería emite junto con una cookie de sesión, y sin ellas un CDN o un
        // proxy inverso puede cachear la respuesta que contiene el token de una
        // persona y servírsela a otra. Es la falla más grave que este archivo
        // podría causar, y es silenciosa.
        for (const [key, headerValue] of Object.entries(headers)) {
          response.headers.set(key, headerValue);
        }
      },
    },
  });

  // Verifica la firma del token y lo renueva si hace falta. `getClaims` y no
  // `getSession`: el segundo devuelve lo que hay en la cookie sin validar nada.
  const { data } = await supabase.auth.getClaims();

  const isSignedIn = typeof data?.claims.sub === "string";
  const { pathname } = request.nextUrl;

  // La ruta del comprobante queda afuera del redirect. No es una página: devuelve un
  // archivo, y un 307 hacia el HTML de la pantalla de acceso contestando a una descarga
  // es una respuesta que el cliente no sabe interpretar —se ve como un archivo roto—.
  // Su manejador contesta 403 con "Tu sesión venció. Volvé a entrar.", que dice más que
  // un redirect. No se debilita nada: la comprobación de permiso la hace el caso de
  // uso, y abajo de todo, la policy RLS del bucket.
  const esUnArchivo = pathname.startsWith("/admin/comprobantes");

  if (
    !isSignedIn &&
    !esUnArchivo &&
    pathname.startsWith("/admin") &&
    pathname !== "/admin/login"
  ) {
    const target = request.nextUrl.clone();
    target.pathname = "/admin/login";
    // Se conserva a dónde quería ir, para volver ahí después de entrar. Sólo la
    // ruta, nunca un origen: aceptar una URL completa acá sería un redirect abierto.
    target.search = `?volver=${encodeURIComponent(pathname)}`;

    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  // Sólo `/admin`. El sitio público es estático y cacheado; hacerlo pasar por acá
  // agregaría una función serverless por visita sin ninguna ganancia, y rompería el
  // caché de las páginas que sí conviene que sea compartido.
  matcher: ["/admin", "/admin/:path*"],
};
