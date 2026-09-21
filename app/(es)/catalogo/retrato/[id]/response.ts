import { getPublicClaimPortrait } from "@/src/application/catalog/public-claim-portrait";
import { logger } from "@/src/infrastructure/logging/logger";
import { createCatalogPortraitPort } from "@/src/infrastructure/supabase/catalog-portrait-port";

export const dynamic = "force-dynamic";

/**
 * El retrato de una reserva publicada, servido por el servidor.
 *
 * Misma forma que el retrato propio: la URL firmada se pide, se usa y se
 * descarta. El cuerpo son los bytes. Ni `user_id` ni el path llegan al HTML.
 */
export async function publicClaimPortraitResponse(claimId: string): Promise<Response> {
  const result = await getPublicClaimPortrait(
    { port: createCatalogPortraitPort(), logger },
    claimId,
  );

  if (result.status !== "ok") {
    return new Response("No hay foto.", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return new Response(result.data.bytes, {
    headers: {
      "Content-Type": result.data.mimeType,
      "Cache-Control": "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
