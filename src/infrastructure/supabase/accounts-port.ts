import {
  ANONYMOUS_BY_DEFAULT,
  isApprovalStatus,
  type DonorProfile,
} from "@/src/domain/entities/donor";
import type { AccountPort } from "@/src/domain/ports/accounts";
import { isLocale, type Locale } from "@/src/i18n/locale";

import { QueryError } from "./admin/query";
import type { ServerSupabaseClient } from "./server-client";

/**
 * El adaptador de la propia cuenta.
 *
 * El identificador de la persona **no entra por parámetro en ningún método**: se
 * lee del token acá dentro, con `getClaims()`, que verifica la firma. Un método
 * que recibiera un `userId` sería un método al que se le puede pasar el de otra
 * persona, y aunque las policies de `donor_profiles` lo rechazarían, la forma del
 * código no debería permitir escribir la llamada.
 *
 * Las policies siguen siendo la frontera. Esto es la capa que hace que la
 * consulta legítima funcione y que un error tenga un mensaje.
 */
const PROFILE_COLUMNS = "id, display_name, locale, default_anonymous, approval_status";

export function createAccountPort(client: ServerSupabaseClient): AccountPort {
  async function requireUserId(): Promise<string> {
    const { data, error } = await client.auth.getClaims();

    if (error !== null || data === null) {
      throw new QueryError("leer la sesión", {
        message: error?.message ?? "sin claims",
      });
    }

    const subject = data.claims.sub;

    if (typeof subject !== "string" || subject.length === 0) {
      throw new QueryError("leer la sesión", { message: "el token no tiene sujeto" });
    }

    return subject;
  }

  async function readOwnProfile(): Promise<DonorProfile | null> {
    const userId = await requireUserId();

    const { data, error } = await client
      .from("donor_profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (error !== null) {
      throw new QueryError("leer el perfil", error);
    }

    return data === null ? null : mapProfile(data);
  }

  return {
    readOwnProfile,

    /**
     * Con la confirmación de correo activada, registrarse no crea sesión, así que
     * la fila no puede crearse en ese momento: RLS exige `auth.uid()` y todavía no
     * hay ninguno. Se crea acá, la primera vez que la persona entra.
     *
     * `upsert` y no `insert`: dos pestañas abiertas contra `/cuenta` producen dos
     * inserts simultáneos, y el segundo chocaría con la clave primaria. Con
     * `ignoreDuplicates` el choque no es un error, que es lo correcto: el estado
     * final es el mismo que se pedía.
     */
    async ensureOwnProfile(
      fallbackLocale: Locale,
    ): Promise<{ profile: DonorProfile; created: boolean }> {
      const existing = await readOwnProfile();

      if (existing !== null) {
        return { profile: existing, created: false };
      }

      const userId = await requireUserId();

      const { data, error } = await client
        .from("donor_profiles")
        .upsert(
          {
            id: userId,
            locale: fallbackLocale,
            default_anonymous: ANONYMOUS_BY_DEFAULT,
          },
          { onConflict: "id", ignoreDuplicates: true },
        )
        .select(PROFILE_COLUMNS)
        .maybeSingle();

      if (error !== null) {
        throw new QueryError("crear el perfil", error);
      }

      if (data !== null) {
        return { profile: mapProfile(data), created: true };
      }

      const existente = await readOwnProfile();

      if (existente === null) {
        throw new QueryError("crear el perfil", {
          message: "la fila no quedó legible después de crearla",
        });
      }

      return { profile: existente, created: false };
    },

    async saveOwnProfile(
      next: Pick<DonorProfile, "displayName" | "locale" | "defaultAnonymous">,
    ): Promise<DonorProfile> {
      const userId = await requireUserId();

      const { data, error } = await client
        .from("donor_profiles")
        .update({
          display_name: next.displayName,
          locale: next.locale,
          default_anonymous: next.defaultAnonymous,
        })
        .eq("id", userId)
        .select(PROFILE_COLUMNS)
        .maybeSingle();

      if (error !== null) {
        throw new QueryError("guardar el perfil", error);
      }

      // Un UPDATE negado por RLS no lanza: afecta cero filas y contesta que salió
      // bien (amenaza E5). Sin esta comprobación, la pantalla diría "guardado" y no
      // se habría guardado nada.
      if (data === null) {
        throw new QueryError("guardar el perfil", {
          message: "la fila no existe o la sesión no es su dueña",
        });
      }

      return mapProfile(data);
    },

    async deleteOwnAccount(): Promise<void> {
      const { error } = await client.rpc("delete_own_account");

      if (error !== null) {
        throw new QueryError("borrar la cuenta", error);
      }
    },
  };
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  locale: string;
  default_anonymous: boolean;
  approval_status: string;
}

/**
 * `locale` es `text` con un `check` en la base, así que llega como `string`. Un
 * valor fuera de la lista no puede existir —lo impide la restricción— y si
 * existiera, caer al castellano es mejor que un correo en blanco.
 */
function mapProfile(row: ProfileRow): DonorProfile {
  return {
    userId: row.id,
    displayName: row.display_name,
    locale: isLocale(row.locale) ? row.locale : "es",
    defaultAnonymous: row.default_anonymous,
    approvalStatus: isApprovalStatus(row.approval_status)
      ? row.approval_status
      : "pending",
  };
}
