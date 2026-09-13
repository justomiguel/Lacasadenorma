import { SecondaryAction } from "@/components/design-system/actions";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * Las preguntas de la home, comprimidas (ADR-032).
 *
 * Tres preguntas, cada una con su primera respuesta y el enlace a la página que
 * responde completo. Sin tarjetas ni acordeón: el contenido queda en el HTML y
 * la lista se lee de un vistazo. En escritorio van de a tres.
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
    <ul className={className}>
      {faq.map((item) => (
        <li
          key={item.question}
          className="border-t border-rule py-lg lg:grid lg:grid-cols-12 lg:gap-lg lg:py-xl"
        >
          <h3 className="font-display text-section-title lg:col-span-4">
            {item.question}
          </h3>
          <div className="mt-sm lg:col-span-7 lg:col-start-6 lg:mt-0">
            {item.answer.map((paragraph) => (
              <p
                key={paragraph.slice(0, 48)}
                className="mt-xs max-w-measure text-body text-ink-muted first:mt-0"
              >
                {paragraph}
              </p>
            ))}
            {item.href === null || item.linkLabel === null ? null : (
              <SecondaryAction href={localizedHref(item.href, locale)} className="mt-sm">
                {item.linkLabel}
              </SecondaryAction>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
