import type { MediaAsset } from "./media";

export interface UpdateRecord {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  /** Markdown restringido. Nunca HTML crudo: sería un XSS de administración (T4). */
  readonly body: string;
  readonly publishedAt: string | null;
  readonly media: readonly MediaAsset[];
}
