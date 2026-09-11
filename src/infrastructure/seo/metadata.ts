import type { Metadata } from "next";

import { site } from "@/content";

/**
 * Metadata de una página.
 *
 * Existe como una función y no como un objeto copiado en cada archivo porque la
 * canónica y la vista previa de OpenGraph son las dos cosas que se olvidan
 * primero, y cuando se olvidan no se rompe nada visible: la página funciona y el
 * enlace compartido queda sin título. Un solo lugar que las emita siempre es más
 * barato que revisarlo página por página.
 *
 * `url` y `canonical` se declaran relativas a propósito. Next las resuelve contra
 * el `metadataBase` del layout raíz, que en un preview de Vercel es el dominio del
 * preview y en producción el dominio real: una canónica escrita a mano apuntaría
 * al dominio equivocado en la mitad de los despliegues.
 */
export interface PageMetadataInput {
  /** Sin el nombre del sitio: lo agrega la plantilla del layout raíz. */
  readonly title: string;
  readonly description: string;
  /** Ruta absoluta del sitio, con barra inicial. */
  readonly path: string;
  /** Para novedades: fecha de publicación, que las convierte en artículo. */
  readonly publishedTime?: string;
  /** Una página que no debe indexarse lo declara, en lugar de confiar en robots.txt. */
  readonly noIndex?: boolean;
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const fullTitle = `${input.title} — ${site.name}`;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      type: input.publishedTime === undefined ? "website" : "article",
      locale: "es_AR",
      siteName: site.name,
      title: fullTitle,
      description: input.description,
      url: input.path,
      ...(input.publishedTime === undefined
        ? {}
        : { publishedTime: input.publishedTime }),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
    },
    ...(input.noIndex === true ? { robots: { index: false, follow: false } } : {}),
  };
}
