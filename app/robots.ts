import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/src/infrastructure/site-url";

/**
 * Un solo bloque permisivo.
 *
 * La tentación es escribir una lista de agentes con reglas distintas —permitir a
 * uno, bloquear a otro— y es una mala idea acá por dos razones. La primera es que
 * el objetivo del proyecto es que se lo encuentre: bloquear un rastreador de un
 * motor de respuestas trabajaría en contra del requisito de AEO. La segunda es que
 * las listas por agente envejecen mal y se convierten en reglas que nadie recuerda
 * por qué están.
 *
 * `/admin` y `/api` se excluyen del rastreo, y eso **no** es una medida de
 * seguridad: `robots.txt` es una sugerencia pública y además le indica a cualquiera
 * dónde mirar. La frontera real de `/admin` son las policies RLS y la
 * revalidación de permisos en cada carga. Se excluyen porque indexar una pantalla
 * de login o una respuesta JSON no le sirve a nadie.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
