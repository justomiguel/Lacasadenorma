/**
 * Retrato de una reserva que el catálogo ya publica.
 *
 * No vive en `CatalogRepository`: ese cliente es `anon` y no puede leer
 * `portrait_path`. Autorizar es ver la fila en la vista; bajar el archivo es
 * otra operación, con la clave secreta, y el path no sale de acá.
 */
export interface CatalogPortraitPort {
  readPublicClaimPortrait(claimId: string): Promise<{
    readonly bytes: ArrayBuffer;
    readonly mimeType: string;
  } | null>;
}
