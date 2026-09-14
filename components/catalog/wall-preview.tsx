import { previewPhotoFor } from "@/components/campaign/preview-photo";
import { PreviewCard } from "@/components/design-system/card";
import { getContent } from "@/content";
import type { DonationWallEntry } from "@/src/domain/entities";
import { WALL_PREVIEW_COUNT } from "@/src/domain/entities/donation-wall";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * Vista previa del muro en otra página (ADR-026 / ADR-032).
 *
 * Foto, título y flecha. Si hay entregas con nombre, se adelantan acá; si no,
 * no se inventa ninguna. El estado vacío vive en `/quienes-ayudaron`.
 */
export function WallPreview({
  locale,
  entries,
}: {
  locale: Locale;
  entries: readonly DonationWallEntry[];
}) {
  const { wall } = getContent(locale);
  const preview = entries.slice(0, WALL_PREVIEW_COUNT);

  return (
    <PreviewCard
      href={localizedHref("/quienes-ayudaron", locale)}
      title={wall.title}
      action={wall.previewAction}
      media={previewPhotoFor("/quienes-ayudaron", locale)}
      as="h2"
      priority
      {...(preview.length === 0 ? { summary: wall.previewSummary } : {})}
    >
      {preview.length === 0 ? null : (
        <ul className="mt-sm max-w-measure text-body text-ink-muted">
          {preview.map((entry) => (
            <li key={entry.id}>{entry.donorDisplayName}</li>
          ))}
        </ul>
      )}
    </PreviewCard>
  );
}
