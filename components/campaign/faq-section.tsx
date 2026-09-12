import Link from "next/link";

import { getContent } from "@/content";
import { localizedHref } from "@/src/i18n/href";
import type { Locale } from "@/src/i18n/locale";

/**
 * Las nueve preguntas.
 *
 * La pregunta es el encabezado y la respuesta va inmediatamente debajo, en prosa,
 * sin acordeón. Un acordeón esconde el contenido de quien busca con Ctrl+F, de un
 * buscador que mide el contenido visible y de un modelo que lee la página, y en
 * nueve preguntas no ahorra nada de desplazamiento que valga la pena (FR-001,
 * estrategia AEO).
 *
 * El orden es el de `content/{locale}/preguntas.json`, y es el orden en que una
 * persona se hace las preguntas: qué es esto, quién fue, qué pasó, cómo ayudo,
 * cómo verifico.
 *
 * El texto de cada enlace viene del contenido y no de acá. Un "ver más" repetido
 * nueve veces se escucha, en la lista de enlaces de un lector de pantalla, como la
 * misma frase nueve veces: no hay forma de elegir uno.
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
      <dl>
        {faq.map((item) => (
          <div
            key={item.question}
            className="border-t border-rule py-xl first:border-t-0 first:pt-0"
          >
            <dt>
              <h3 className="max-w-measure font-display text-subheading font-medium">
                {item.question}
              </h3>
            </dt>
            {item.answer.map((paragraph) => (
              <dd key={paragraph.slice(0, 48)} className="mt-sm max-w-measure text-body">
                {paragraph}
              </dd>
            ))}
            {item.href === null || item.linkLabel === null ? null : (
              <dd className="mt-sm">
                <Link
                  href={localizedHref(item.href, locale)}
                  className="font-ui text-small text-aqua underline decoration-1 underline-offset-4 transition-colors duration-fast hover:text-aqua-strong"
                >
                  {item.linkLabel}
                </Link>
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
