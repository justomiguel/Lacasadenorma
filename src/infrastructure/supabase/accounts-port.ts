import {
  ANONYMOUS_BY_DEFAULT,
  isApprovalStatus,
  isOwnPortraitPath,
  portraitPathFor,
  PORTRAIT_BUCKET,
  type DonorProfile,
} from "@/src/domain/entities/donor";
import type { AccountPort } from "@/src/domain/ports/accounts";
import { isLocale, type Locale } from "@/src/i18n/locale";

import { inspectPortrait } from "../files/portrait";
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
const PROFILE_COLUMNS =
  "id, display_name, locale, default_anonymous, approval_status, portrait_path";

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
     *
     * No se lee `user_metadata`. El nombre y la foto que Google (o cualquiera)
     * manda viven ahí, y copiarlos al perfil publicaría un nombre que nadie
     * eligió mostrar y un avatar que no es el retrato de este sitio (FR-230,
     * ADR-039). El perfil nace anónimo, con el idioma de la pantalla.
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

    async saveOwnPortrait(file: File): Promise<DonorProfile> {
      const userId = await requireUserId();
      const info = await inspectPortrait(file);
      const path = portraitPathFor(userId, info.mimeType);
      const current = await readOwnProfile();
      const previous = current?.portraitPath ?? null;

      const { error: uploadError } = await client.storage
        .from(PORTRAIT_BUCKET)
        .upload(path, file, { contentType: info.mimeType, upsert: true });

      if (uploadError !== null) {
        throw new QueryError("subir el retrato", uploadError);
      }

      if (previous !== null && previous !== path) {
        await client.storage.from(PORTRAIT_BUCKET).remove([previous]);
      }

      return writePortraitPath(userId, path);
    },

    async removeOwnPortrait(): Promise<DonorProfile> {
      const userId = await requireUserId();
      const current = await readOwnProfile();
      const previous = current?.portraitPath ?? null;

      if (previous !== null && isOwnPortraitPath(userId, previous)) {
        await client.storage.from(PORTRAIT_BUCKET).remove([previous]);
      }

      return writePortraitPath(userId, null);
    },

    async readOwnPortraitFile(): Promise<{
      bytes: ArrayBuffer;
      mimeType: string;
    } | null> {
      const current = await readOwnProfile();
      const path = current?.portraitPath ?? null;
      const userId = await requireUserId();

      if (path === null || !isOwnPortraitPath(userId, path)) {
        return null;
      }

      const { data, error } = await client.storage
        .from(PORTRAIT_BUCKET)
        .createSignedUrl(path, 60);

      if (error !== null || data === null) {
        throw new QueryError("firmar el retrato", error ?? { message: "sin url" });
      }

      const file = await fetch(data.signedUrl);

      if (!file.ok) {
        throw new QueryError("bajar el retrato", { message: String(file.status) });
      }

      return {
        bytes: await file.arrayBuffer(),
        mimeType: file.headers.get("content-type") ?? "image/jpeg",
      };
    },

    async deleteOwnAccount(): Promise<void> {
      const current = await readOwnProfile();
      const previous = current?.portraitPath ?? null;
      const userId = await requireUserId();

      if (previous !== null && isOwnPortraitPath(userId, previous)) {
        await client.storage.from(PORTRAIT_BUCKET).remove([previous]);
      }

      const { error } = await client.rpc("delete_own_account");

      if (error !== null) {
        throw new QueryError("borrar la cuenta", error);
      }
    },
  };

  async function writePortraitPath(
    userId: string,
    portraitPath: string | null,
  ): Promise<DonorProfile> {
    const { data, error } = await client
      .from("donor_profiles")
      .update({ portrait_path: portraitPath })
      .eq("id", userId)
      .select(PROFILE_COLUMNS)
      .maybeSingle();

    if (error !== null) {
      throw new QueryError("guardar el retrato", error);
    }

    if (data === null) {
      throw new QueryError("guardar el retrato", {
        message: "la fila no existe o la sesión no es su dueña",
      });
    }

    return mapProfile(data);
  }
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  locale: string;
  default_anonymous: boolean;
  approval_status: string;
  portrait_path: string | null;
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
    portraitPath: row.portrait_path,
  };
}
