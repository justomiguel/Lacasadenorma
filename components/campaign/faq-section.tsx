import { InlineLink } from "@/components/design-system/actions";
import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * Las preguntas de la home.
 *
 * La pregunta es el encabezado y la respuesta va inmediatamente debajo, en prosa,
 * sin acordeón. Un acordeón esconde el contenido de quien busca con Ctrl+F, de un
 * buscador que mide el contenido visible y de un modelo que lee la página.
 *
 * En escritorio van a dos columnas: son entradas cortas e independientes, y en
 * una sola columna la sección medía dos pantallas de texto angosto con dos
 * tercios de la página vacíos. Cada entrada abre con su regla, así que se ve
 * dónde termina una y empieza la otra también cuando quedan lado a lado.
 *
 * El orden es el de `content/{locale}/preguntas.json`.
 *
 * El texto de cada enlace viene del contenido y no de acá. Un "ver más" repetido
 * se escucha, en la lista de enlaces de un lector de pantalla, como la misma frase
 * repetida: no hay forma de elegir uno. Y es un enlace de prosa como cualquier
 * otro del sitio, con el mismo estilo: no hay una tercera clase de enlace.
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
      <dl className="grid gap-x-3xl lg:grid-cols-2">
        {faq.map((item) => (
          <div key={item.question} className="border-t border-rule py-lg lg:py-xl">
            <dt>
              <h3 className="max-w-measure font-display text-card">{item.question}</h3>
            </dt>
            {item.answer.map((paragraph) => (
              <dd key={paragraph.slice(0, 48)} className="mt-sm max-w-measure text-body">
                {paragraph}
              </dd>
            ))}
            {item.href === null || item.linkLabel === null ? null : (
              <dd className="mt-md font-ui text-small">
                <InlineLink href={localizedHref(item.href, locale)}>
                  {item.linkLabel}
                </InlineLink>
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
