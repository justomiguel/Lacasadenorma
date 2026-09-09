import { faq, norma, site } from "@/content";

/**
 * Datos estructurados.
 *
 * Una sola regla los gobierna, y viene de la spec: **sólo se declara lo que está
 * visible en la página y verificado**. No hay `Organization` con dirección
 * inventada, no hay `Person` con fechas estimadas, no hay `Offer` con precios, no
 * hay `AggregateRating`. Un dato estructurado engañoso es peor que ninguno: es una
 * afirmación que se le hace a una máquina, en un lugar donde nadie la revisa.
 *
 * Las consecuencias concretas de esa regla en este archivo:
 *
 * - El tipo de la organización es `Organization`, no `NGO`. `NGO` afirma una
 *   figura legal, y Fundación Norma no tiene personería jurídica todavía. Decirlo
 *   en JSON-LD sería exactamente el dato falso que la página de legado se ocupa de
 *   desmentir en prosa.
 * - `Person` no lleva `birthDate` ni `deathDate`: el contenido los tiene en `null`
 *   porque la familia no los publicó, y una fecha aproximada no es una fecha.
 * - `FAQPage` sale del **mismo** contenido que renderiza la sección de preguntas de
 *   la home. Si las preguntas dejaran de estar visibles, el bloque se caería con
 *   ellas, que es lo que exige la política de Google y lo que exige la honestidad.
 * - `DonateAction` apunta a la página de aportes, sin `price` ni `priceCurrency`:
 *   no hay un monto sugerido y no vamos a inventar uno.
 */

/** `@id` estables para que los nodos se refieran entre sí en lugar de repetirse. */
function ids(siteUrl: string) {
  return {
    organization: `${siteUrl}/#organizacion`,
    website: `${siteUrl}/#sitio`,
    norma: `${siteUrl}/norma#persona`,
  };
}

export function organizationSchema(siteUrl: string): object {
  const id = ids(siteUrl);

  return {
    "@type": "Organization",
    "@id": id.organization,
    name: site.name,
    url: siteUrl,
    description: site.longDescription,
    slogan: site.tagline,
    // La organización no tiene domicilio publicable, pero el lugar del que trata
    // el proyecto sí es un dato verdadero y ayuda a que se lo encuentre por él.
    areaServed: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: site.place.locality,
        addressRegion: site.place.province,
        addressCountry: "AR",
      },
    },
  };
}

export function webSiteSchema(siteUrl: string): object {
  const id = ids(siteUrl);

  return {
    "@type": "WebSite",
    "@id": id.website,
    url: siteUrl,
    name: site.name,
    description: site.shortDescription,
    inLanguage: "es-AR",
    publisher: { "@id": id.organization },
  };
}

export function personSchema(siteUrl: string): object {
  const id = ids(siteUrl);

  return {
    "@type": "Person",
    "@id": id.norma,
    name: norma.fullName,
    description: norma.summary,
    jobTitle: norma.roleLabel,
    homeLocation: {
      "@type": "Place",
      name: `${site.place.locality}, ${site.place.province}, ${site.place.country}`,
    },
    mainEntityOfPage: `${siteUrl}/norma`,
  };
}

/**
 * Las nueve preguntas visibles de la home.
 *
 * La respuesta es la misma prosa que se renderiza, unida por párrafos. No se
 * reescribe para el buscador: dos versiones distintas de la misma respuesta es
 * justamente lo que la política de contenido oculto prohíbe.
 */
export function faqSchema(): object {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer.join(" "),
      },
    })),
  };
}

export function donateActionSchema(siteUrl: string): object {
  const id = ids(siteUrl);

  return {
    "@type": "DonateAction",
    name: "Ayudar a reconstruir la casa",
    description:
      "Aporte por transferencia bancaria desde Argentina, Chile o Estados Unidos. El sitio no procesa pagos: la transferencia se hace desde el banco de quien aporta.",
    recipient: { "@id": id.organization },
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/ayudar`,
      actionPlatform: "https://schema.org/DesktopWebPlatform",
    },
  };
}

export function webPageSchema(input: {
  siteUrl: string;
  path: string;
  name: string;
  description: string;
}): object {
  const id = ids(input.siteUrl);

  return {
    "@type": "WebPage",
    "@id": `${input.siteUrl}${input.path}#pagina`,
    url: `${input.siteUrl}${input.path}`,
    name: input.name,
    description: input.description,
    inLanguage: "es-AR",
    isPartOf: { "@id": id.website },
  };
}

export function articleSchema(input: {
  siteUrl: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
}): object {
  const id = ids(input.siteUrl);
  const url = `${input.siteUrl}/novedades/${input.slug}`;

  return {
    "@type": "Article",
    "@id": `${url}#articulo`,
    headline: input.title,
    description: input.description,
    url,
    inLanguage: "es-AR",
    isPartOf: { "@id": id.website },
    publisher: { "@id": id.organization },
    ...(input.publishedAt === null ? {} : { datePublished: input.publishedAt }),
  };
}

export interface Crumb {
  readonly name: string;
  readonly path: string;
}

/**
 * Migas de pan. Se emite sólo cuando la página tiene una jerarquía real; una miga
 * de un solo nivel no describe nada.
 */
export function breadcrumbSchema(siteUrl: string, crumbs: readonly Crumb[]): object {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path === "/" ? "" : crumb.path}`,
    })),
  };
}

/** Envuelve los nodos en un `@graph`, que es la forma de declarar varios juntos. */
export function graph(nodes: readonly object[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
}
