import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readSupabaseConfig } from "./config";
import type { Database } from "./database.types";

/**
 * Cliente con la clave secreta, **sólo** para `auth.admin.generateLink`.
 *
 * No se usa para leer ni escribir la base: eso saltaría RLS (ADR-019). Si no
 * hay clave, el alta cae en `signUp` del cliente de sesión, que es lo que el
 * harness local sabe emular.
 */
export function createAuthAdminClient(): SupabaseClient<Database> | null {
  const config = readSupabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();

  if (config === null || secret === undefined || secret.length === 0) {
    return null;
  }

  return createClient<Database>(config.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
