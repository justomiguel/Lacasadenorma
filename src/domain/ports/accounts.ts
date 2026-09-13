import type { Locale } from "@/src/i18n/locale";

import type { DonorProfile } from "../entities/donor";

/**
 * Lo que la aplicación puede hacer con **la cuenta de quien está pidiendo**.
 *
 * Ningún método recibe un identificador de persona, y eso es la forma del puerto
 * diciendo algo: no hay manera de pedirle el perfil de otra. El sujeto sale de
 * la sesión verificada, del lado del adaptador, y abajo de todo las policies de
 * `donor_profiles` lo vuelven a comprobar contra `auth.uid()`.
 *
 * `readOwnProfile` puede devolver `null` y ese caso es normal, no un error: con
 * la confirmación de correo activada, registrarse **no** crea una sesión, así
 * que la fila del perfil no puede crearse en ese momento —RLS exige
 * `auth.uid()`— y se crea la primera vez que la persona entra. La alternativa
 * era un trigger sobre `auth.users`, que es el camino que más se ve y el que
 * convierte cualquier error del trigger en un registro que falla entero.
 */
export interface AccountPort {
  readOwnProfile(): Promise<DonorProfile | null>;

  /** El perfil propio, creándolo con los valores por defecto si es la primera vez. */
  ensureOwnProfile(fallbackLocale: Locale): Promise<DonorProfile>;

  /**
   * Guarda las preferencias. Recibe el perfil entero y no un parche: un parche
   * con `defaultAnonymous` ausente es indistinguible de uno que pide aparecer.
   */
  saveOwnProfile(profile: Omit<DonorProfile, "userId">): Promise<DonorProfile>;

  /** Borra la cuenta de quien pide (FR-208). No hay vuelta atrás y no la finge. */
  deleteOwnAccount(): Promise<void>;
}
