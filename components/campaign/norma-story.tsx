import { SecondaryAction } from "@/components/design-system/actions";
import { EditorialImage } from "@/components/design-system/editorial-image";
import type { Photograph } from "@/components/design-system/photo";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

import { StoryHeading } from "./story-section";

/**
 * Norma es un momento, no otra sección (ADR-032).
 *
 * Rompe el ritmo a propósito: el fondo pasa a carbón —la única banda de ese tono
 * en el sitio—, el retrato real ocupa cinco sextos del ancho del teléfono sin
 * círculo ni recorte, y el titular es la frase con la que la familia la
 * describe. Nada más: la emoción la ponen la foto y la tipografía.
 */
export function NormaStory({
  locale,
  portrait,
  name,
  title,
  lead,
  action,
  number,
}: {
  locale: Locale;
  /** Sin retrato, el momento es sólo texto: no se pone stock ni un hueco. */
  portrait: Photograph | null;
  name: string;
  title: string;
  lead: string;
  action: string;
  number: string;
}) {
  return (
    <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-3xl">
      {portrait === null ? null : (
        <EditorialImage
          media={portrait}
          variant="portrait"
          caption={false}
          sizes="(min-width: 64rem) 36vw, 83vw"
          className="lg:col-span-5 lg:w-full"
        />
      )}
      <div
        className={
          portrait === null
            ? "lg:col-span-7"
            : "mt-2xl lg:col-span-6 lg:col-start-7 lg:mt-0"
        }
      >
        <StoryHeading label={name} number={number} title={title} id="norma-en-casa" />
        <p className="mt-lg max-w-measure text-body-large">{lead}</p>
        <SecondaryAction
          href={localizedHref("/norma", locale)}
          tone="paper"
          className="mt-lg"
        >
          {action}
        </SecondaryAction>
      </div>
    </div>
  );
}
