import Link from "next/link";

import { Container } from "@/components/design-system/layout";
import { legal, site } from "@/content";

import { LEGAL_NAV, PRIMARY_NAV, SECONDARY_NAV } from "./navigation";

/**
 * Pie: la navegación completa del sitio.
 *
 * Está acá y no en un menú del encabezado porque es donde alguien la busca
 * cuando terminó de leer una página, y porque así el encabezado puede quedarse
 * con dos cosas.
 */
export function SiteFooter() {
  const updated = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(legal.updatedOn));

  return (
    <Container as="footer" className="border-t border-rule py-3xl">
      <div className="grid gap-2xl lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="font-prose text-heading">{site.name}</p>
          <p className="mt-sm max-w-measure text-small text-ink-muted">{site.tagline}</p>
          <p className="mt-md max-w-measure text-small text-ink-muted">
            {site.place.locality}, {site.place.province}, {site.place.country}.
          </p>
        </div>

        <nav aria-label="Secciones del sitio" className="lg:col-span-4">
          <p className="mb-md font-ui text-label uppercase text-ink-muted">La campaña</p>
          <ul className="space-y-xs">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-touch items-center text-body text-ink underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-fast hover:decoration-brick"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="El proyecto y sus términos" className="lg:col-span-4">
          <p className="mb-md font-ui text-label uppercase text-ink-muted">Lo que sigue</p>
          <ul className="space-y-xs">
            {SECONDARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-touch items-center text-body text-ink underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-fast hover:decoration-brick"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mb-md mt-xl font-ui text-label uppercase text-ink-muted">Legales</p>
          <ul className="space-y-xs">
            {LEGAL_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-touch items-center text-small text-ink-muted underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-fast hover:decoration-brick"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <p className="mt-2xl max-w-measure text-small text-ink-faint">
        Última actualización de los textos legales: {updated}. Este sitio no procesa pagos
        ni pide datos de tarjeta.
      </p>
    </Container>
  );
}
