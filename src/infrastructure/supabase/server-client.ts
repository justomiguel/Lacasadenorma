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
 * `proxy.ts` en cada navegación y desde ahí sí se puede escribir. Los headers que
 * la librería pide propagar cuando escribe cookies de sesión —los `no-store`— se
 * copian tal cual: sin ellos, un intermediario podría cachear una respuesta con la
 * cookie de sesión de alguien y servírsela a otra persona.
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
      setAll(cookiesToSet, headers) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }

          for (const [key, headerValue] of Object.entries(headers)) {
            cookieStore.set(key, headerValue);
          }
        } catch {
          // Un Server Component no puede escribir cookies. No es un fallo: el
          // refresco de sesión ocurre en `proxy.ts`, que sí puede.
        }
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
