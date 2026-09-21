import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readSupabaseConfig } from "./config";
import type { Database } from "./database.types";

/**
 * Cliente con la clave secreta.
 *
 * Tres usos, y ninguno lista una tabla (ADR-019, ADR-028):
 *
 * 1. `auth.admin.generateLink` cuando el hook de correo todavía no está.
 * 2. `record_email_delivery` cuando no hay sesión —la oferta por teléfono—
 *    porque `anon` no tiene `EXECUTE` y PostgREST responde 401.
 * 3. Bajar un retrato de catálogo después de que la vista anónima autorizó
 *    esa reserva: un pledge, un path, un signed URL que se descarta.
 *
 * Si no hay clave, el alta cae en `signUp` del cliente de sesión, el
 * teléfono reserva igual sin anotar el envío, y el catálogo no sirve la foto.
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
