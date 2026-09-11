import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { readSupabaseConfig } from "./config";
import type { Database } from "./database.types";

/**
 * Cliente de Supabase para el servidor.
 *
 * Se crea **uno por request**. Compartir uno entre requests mezclaría sesiones de
 * personas distintas, que es la peor falla posible de un backoffice.
 *
 * Sobre `setAll`: en un Server Component las cookies no se pueden escribir, y el
 * intento lanza. Se atrapa a propósito, porque el refresco del token lo hace
 * `proxy.ts` en cada navegación y desde ahí sí se puede escribir. Las cabeceras
 * `no-store` que la librería pide propagar junto con una cookie de sesión también
 * son cosa de `proxy.ts`: acá no hay respuesta HTTP a la que ponérselas.
 */
export type ServerSupabaseClient = SupabaseClient<Database>;

export async function createServerSupabaseClient(): Promise<ServerSupabaseClient | null> {
  const config = readSupabaseConfig();

  if (config === null) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, _headers) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Un Server Component no puede escribir cookies. No es un fallo: el
          // refresco de sesión ocurre en `proxy.ts`, que sí puede.
        }

        // `_headers` se ignora acá **a propósito**. Son cabeceras de respuesta
        // HTTP (`Cache-Control: no-store` y compañía), no cookies, y desde este
        // contexto no hay respuesta a la que ponérselas. Escribirlas en el almacén
        // de cookies —que es lo que parece razonable a primera vista— crearía una
        // cookie llamada `Cache-Control`, que no hace nada y confunde.
        //
        // Quien las emite es `proxy.ts`, que corre en cada navegación, tiene la
        // respuesta en la mano y es donde el refresco del token ocurre de verdad.
      },
    },
  });
}

/**
 * Cliente de lectura pública, sin sesión.
 *
 * Existe para las páginas públicas y para el adaptador REST: no lee cookies, así
 * que la respuesta es cacheable y la consulta se resuelve siempre con los permisos
 * de `anon`. Si leyera la sesión, una página pública devolvería contenido distinto
 * a una persona con sesión de editor y el caché serviría ese contenido a
 * cualquiera.
 */
export function createAnonSupabaseClient(): ServerSupabaseClient | null {
  const config = readSupabaseConfig();

  if (config === null) {
    return null;
  }

  return createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // Sin sesión no hay nada que persistir.
      },
    },
  });
}
