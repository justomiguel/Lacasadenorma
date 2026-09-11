import type { DataLayer } from "@/src/application/data-layer";

import { createSupabaseRepositories } from "./supabase/repositories";
import { createAnonSupabaseClient } from "./supabase/server-client";

/**
 * Raíz de composición de la lectura pública.
 *
 * Es el único lugar del sistema que decide de dónde salen los datos. Sin proyecto
 * de Supabase configurado devuelve `content-only`, y el sitio muestra el contenido
 * editorial con las cifras omitidas y un aviso visible (FR-034). Es un modo de
 * operación, no un modo degradado accidental: se puede clonar el repositorio,
 * levantar el sitio y leerlo completo sin credenciales (SC-012).
 *
 * Usa el cliente sin sesión a propósito. Una página pública tiene que devolver lo
 * mismo a todo el mundo: si leyera la sesión, la respuesta variaría según quién
 * consulta y el caché podría servir contenido de editor a cualquiera.
 */
export function getPublicDataLayer(): DataLayer {
  const client = createAnonSupabaseClient();

  if (client === null) {
    return { source: "content-only" };
  }

  return { source: "supabase", ...createSupabaseRepositories(client) };
}
