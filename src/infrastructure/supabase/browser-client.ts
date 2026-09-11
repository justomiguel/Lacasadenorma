"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { readSupabaseConfig } from "./config";
import type { Database } from "./database.types";

/**
 * Cliente del navegador. Sólo lo usa el formulario de acceso del backoffice: el
 * resto del sitio se renderiza en el servidor.
 *
 * `createBrowserClient` devuelve la misma instancia en llamadas sucesivas, así que
 * no hace falta memorizarla acá.
 */
export function createBrowserSupabaseClient(): SupabaseClient<Database> | null {
  const config = readSupabaseConfig();

  if (config === null) {
    return null;
  }

  return createBrowserClient<Database>(config.url, config.publishableKey);
}
