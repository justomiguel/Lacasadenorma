import { PORTRAIT_BUCKET, isOwnPortraitPath } from "@/src/domain/entities/donor";
import type { CatalogPortraitPort } from "@/src/domain/ports/catalog-portraits";

import { QueryError } from "./admin/query";
import { createAuthAdminClient } from "./auth-admin";
import { createAnonSupabaseClient } from "./server-client";

/**
 * Autoriza con `anon` y baja con la clave secreta.
 *
 * El HTML pide `/catalogo/retrato/{claimId}`. Esta capa es la única que ve
 * `user_id` y `portrait_path`: los lee, firma, descarga y descarta. El cuerpo
 * que sale es sólo bytes.
 */
export function createCatalogPortraitPort(): CatalogPortraitPort | null {
  const anon = createAnonSupabaseClient();

  if (anon === null) {
    return null;
  }

  return {
    async readPublicClaimPortrait(claimId) {
      const { data: claim, error: claimError } = await anon
        .from("donation_catalog_claims")
        .select("id, has_portrait")
        .eq("id", claimId)
        .maybeSingle();

      if (claimError !== null) {
        throw new QueryError("autorizar el retrato del catálogo", claimError);
      }

      if (claim === null || claim.has_portrait !== true) {
        return null;
      }

      const admin = createAuthAdminClient();

      if (admin === null) {
        return null;
      }

      const { data: pledge, error: pledgeError } = await admin
        .from("donation_pledges")
        .select("user_id")
        .eq("id", claimId)
        .maybeSingle();

      if (pledgeError !== null) {
        throw new QueryError("leer la reserva del retrato", pledgeError);
      }

      const userId = pledge?.user_id ?? null;

      if (userId === null) {
        return null;
      }

      const { data: profile, error: profileError } = await admin
        .from("donor_profiles")
        .select("portrait_path")
        .eq("id", userId)
        .maybeSingle();

      if (profileError !== null) {
        throw new QueryError("leer el path del retrato", profileError);
      }

      const path = profile?.portrait_path ?? null;

      if (path === null || !isOwnPortraitPath(userId, path)) {
        return null;
      }

      const { data, error } = await admin.storage
        .from(PORTRAIT_BUCKET)
        .createSignedUrl(path, 60);

      if (error !== null || data === null) {
        throw new QueryError(
          "firmar el retrato del catálogo",
          error ?? { message: "sin url" },
        );
      }

      const file = await fetch(data.signedUrl);

      if (!file.ok) {
        throw new QueryError("bajar el retrato del catálogo", {
          message: String(file.status),
        });
      }

      return {
        bytes: await file.arrayBuffer(),
        mimeType: file.headers.get("content-type") ?? "image/jpeg",
      };
    },
  };
}
