import Link from "next/link";

import { Container } from "@/components/design-system/layout";
import type { SiteContent, UiContent } from "@/content/schema";
import { fill } from "@/src/i18n/fill";
import { localizedHref } from "@/src/i18n/href";
import { intlLocale, type Locale } from "@/src/i18n/locale";
import { formatLongDate } from "@/components/design-system/dates";

import { LEGAL_NAV, PRIMARY_NAV, SECONDARY_NAV } from "./navigation";

/**
 * Pie: la navegación completa del sitio.
 *
 * Está acá y no en un menú del encabezado porque es donde alguien la busca
 * cuando terminó de leer una página, y porque así el encabezado puede quedarse
 * con dos cosas.
 */
export function SiteFooter({
  locale,
  site,
  ui,
  legalUpdatedOn,
}: {
  locale: Locale;
  site: SiteContent;
  ui: UiContent;
  legalUpdatedOn: string;
}) {
  const updated = formatLongDate(legalUpdatedOn, intlLocale(locale));

  return (
    <footer className="border-t border-rule">
      <Container className="py-3xl">
        <div className="grid gap-2xl lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="font-display text-heading">{site.name}</p>
            <p className="mt-sm max-w-measure text-small text-ink-muted">
              {site.tagline}
            </p>
            <p className="mt-md max-w-measure text-small text-ink-muted">
              {site.place.locality}, {site.place.province}, {site.place.country}.
            </p>
          </div>

          <nav aria-label={ui.nav.campaign} className="lg:col-span-4">
            <p className="mb-md font-ui text-label text-ink-muted">{ui.nav.campaign}</p>
            <ul className="space-y-xs">
              {PRIMARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={localizedHref(item.href, locale)}
                    className="inline-flex min-h-touch items-center text-body text-ink underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-fast hover:decoration-aqua"
                  >
                    {ui.primaryNav[item.href].label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={ui.nav.project} className="lg:col-span-4">
            <p className="mb-md font-ui text-label text-ink-muted">{ui.nav.next}</p>
            <ul className="space-y-xs">
              {SECONDARY_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={localizedHref(item.href, locale)}
                    className="inline-flex min-h-touch items-center text-body text-ink underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-fast hover:decoration-aqua"
                  >
                    {ui.secondaryNav[item.href].label}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mb-md mt-xl font-ui text-label text-ink-muted">
              {ui.nav.legal}
            </p>
            <ul className="space-y-xs">
              {LEGAL_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={localizedHref(item.href, locale)}
                    className="inline-flex min-h-touch items-center text-small text-ink-muted underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-fast hover:decoration-aqua"
                  >
                    {ui.legalNav[item.href].label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-2xl max-w-measure text-small text-ink-faint">
          {fill(ui.footerNote, { date: updated })}
        </p>
      </Container>
    </footer>
  );
}
