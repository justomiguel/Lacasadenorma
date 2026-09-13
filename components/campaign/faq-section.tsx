import { previewPhotoFor } from "@/components/campaign/preview-photo";
import { PreviewCard } from "@/components/design-system/card";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * Las preguntas de la home, como previas con foto.
 *
 * Cada una es una puerta a la página que responde completo: pregunta, la
 * primera respuesta, la foto de ese tramo y el enlace con su propio texto. Sin
 * acordeón: el contenido queda en el HTML. En escritorio van de a tres.
 */
export function FaqSection({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const { faq } = getContent(locale);

  return (
    <div className={className}>
      <ul className="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
        {faq.map((item) => {
          const href = item.href;
          const action = item.linkLabel;

          if (href === null || action === null) {
            return (
              <li key={item.question} className="border-t border-rule py-lg">
                <h3 className="font-display text-card">{item.question}</h3>
                {item.answer.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 48)}
                    className="mt-sm max-w-measure text-body"
                  >
                    {paragraph}
                  </p>
                ))}
              </li>
            );
          }

          return (
            <li key={item.question} className="flex min-w-0">
              <PreviewCard
                className="w-full"
                href={localizedHref(href, locale)}
                title={item.question}
                action={action}
                media={previewPhotoFor(href, locale)}
                sizes="(min-width: 64rem) 30vw, (min-width: 40rem) 50vw, 100vw"
                {...(item.answer[0] === undefined ? {} : { summary: item.answer[0] })}
              >
                {item.answer.slice(1).map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 48)}
                    className="mt-sm max-w-measure text-small text-ink-muted"
                  >
                    {paragraph}
                  </p>
                ))}
              </PreviewCard>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
