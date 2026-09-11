/**
 * Credenciales de Supabase, leídas una sola vez y en un solo lugar.
 *
 * Devuelve `null` cuando no hay proyecto configurado, y eso **no es un error**: es
 * el estado esperado de un clon nuevo del repositorio. El sitio funciona así, con
 * el contenido editorial y sin cifras (FR-034). Que la ausencia sea un `null` en
 * vez de una excepción es lo que permite que `npm run dev` levante sin pedir nada.
 *
 * Las dos variables llevan prefijo `NEXT_PUBLIC_` a propósito: la clave publicable
 * viaja al navegador por diseño, y lo que protege los datos es RLS, no el secreto
 * de esa clave. La clave secreta no se lee en ningún módulo alcanzable desde el
 * cliente, y `scripts/check-no-client-secrets.mjs` lo verifica sobre el bundle.
 */

export interface SupabaseConfig {
  readonly url: string;
  readonly publishableKey: string;
}

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (url === undefined || url.length === 0) {
    return null;
  }

  if (publishableKey === undefined || publishableKey.length === 0) {
    return null;
  }

  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseConfig() !== null;
}
