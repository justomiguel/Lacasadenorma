import type { Photograph } from "@/components/design-system/photo";
import { getContent } from "@/content";
import type { Locale } from "@/src/i18n/locale";

/**
 * Foto real para la previa de una página.
 *
 * Cada destino de la home y de las preguntas tiene una foto que ya existe: no se
 * inventa un retrato para «Cómo ayudar» ni se deja la tarjeta vacía. Si el
 * material de ese tramo todavía no está, se devuelve `null` y `PreviewCard`
 * reserva el hueco. No es la imagen de Open Graph: al compartir va el símbolo
 * (ADR-036).
 */
export function previewPhotoFor(href: string, locale: Locale): Photograph | null {
  const { norma, reconstruction, whatHappened } = getContent(locale);
  const night = whatHappened.photoEssay[0]?.photos ?? [];
  const after = whatHappened.photoEssay[1]?.photos ?? [];
  const work = reconstruction.photoEssay[0]?.photos ?? [];

  switch (href) {
    case "/que-paso":
      return whatHappened.hero ?? night[0] ?? after[0] ?? null;
    case "/reconstruccion":
      return work[0] ?? null;
    case "/norma":
      return norma.portrait;
    case "/legado":
      return norma.book.cover;
    case "/ayudar":
      return work[1] ?? work[0] ?? null;
    case "/catalogo":
      return work[0] ?? work[1] ?? null;
    case "/quienes-ayudaron":
      return work[1] ?? work[0] ?? after[0] ?? null;
    case "/novedades":
      return work[0] ?? after[0] ?? night[0] ?? null;
    default:
      return null;
  }
}
