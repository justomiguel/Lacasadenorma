import type { MediaAsset } from "./media";

export interface PersonRecord {
  readonly id: string;
  readonly slug: string;
  readonly fullName: string;
  readonly roleLabel: string;
  readonly summary: string;
  readonly paragraphs: readonly string[];
  /**
   * Nulos mientras la familia no publique las fechas. Si son nulos, el JSON-LD
   * omite `birthDate`/`deathDate` en lugar de estimarlos.
   */
  readonly bornOn: string | null;
  readonly diedOn: string | null;
  readonly portrait: MediaAsset | null;
}
